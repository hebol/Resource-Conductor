var socket;
var $speed;
var setNewTime = function() {
    var value = $('#newTime').val();
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
    var options = [0.5, 1, 5, 10, 100];
    options.forEach(function(value){ $speed.append('<option value="' + value + '">' + value + '</value>');});
    $speed.val(1);
    $speed.change(setNewSpeed);

    registerConsumer('time-service', function(service) {
        socket = io.connect(service.url);
        socket.on('time', function (data) {
            var date = new Date(data);
            $("#clock").html(dateUtil.getTime(date));
            $("#day").html(dateUtil.getDate(date));
        });
        socket.on('speed', function (data) {
            $speed.val(data);
        });
        querySpeed();
    });
    $('#setTimeButton').click(setNewTime);
    $('#startButton').click(startTime);
    $('#stopButton').click(stopTime);

    $("#newTime").keyup(function(event){
        if(event.keyCode == 13) {
            setNewTime();
        }
    });
});
