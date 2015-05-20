var socket;
var $speed;
var setNewTime = function() {
    var value = $('#newTime').val();
    localStorage.selectedTime = value;
    if (socket && value) {
        var date = new Date(value);
        console.log("Sending time", date, "to server, from", value);
        socket.emit('setTime', date);
    }
};

var setNewSpeed = function() {
    var value = $speed.val();
    if (socket && value) {
        console.log("Sending speed", value, "to server");
        socket.emit('setSpeed', value);
    }
};

var querySpeed = function() {
    if (socket) {
        console.log("Querying speed from server");
        socket.emit('querySpeed');
    }
};


var startTime = function() {
    if (socket) {
        console.log("Starting time");
        socket.emit('startTime');
    }
};

var stopTime = function() {
    if (socket) {
        console.log("Stopping time");
        socket.emit('stopTime');
    }
};

$(document).ready(function() {
    $speed = $('#speedOptions');
    var options = [0.5, 1, 6, 10, 60, 300];
    options.forEach(function(value){ $speed.append('<option value="' + value + '">' + value + '</value>');});
    $speed.val(1);
    $speed.change(setNewSpeed);

    registerConsumer('time-service', function(service) {
        socket = io.connect(service.url);
        socket.on('time', function (data, type) {
            var date = new Date(data);
            $("#clock").html(dateUtil.getTime(date));
            $("#day").html(dateUtil.getDate(date));
            if (type == 'set') {
                console.log("Trying to set value");
                $("#newTime").val(date.toJSON().slice(0, 19));
            }
        });
        socket.on('speed', function (data) {
            $speed.val(data);
        });
        querySpeed();
    });
    $('#setTimeButton').click(setNewTime);
    $('#startButton').click(startTime);
    $('#stopButton').click(stopTime);
    if (localStorage.selectedTime) {
        $("#newTime").val(localStorage.selectedTime);
    }

    $("#newTime").keyup(function(event){
        if(event.keyCode == 13) {
            setNewTime();
        }
    });
});
