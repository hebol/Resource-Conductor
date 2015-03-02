process.title = 'number-sender';

var io = require('socket.io')(),
    config = require('../Common/js/configService.js');

var port = io.listen(0).httpServer.address().port;

console.log("Has started server on port", port);

config.setup("time-system");
config.registerService(port, "time-service");

var timeout, startTime, speed = 1, timeReference;

io.on('connection', function(socket) {
    console.log('connecting:', socket.id);
    socket.on('startTime', startTimeFunction);
    socket.on('stopTime', stopTimeFunction);
    socket.on('setTime', setTimeFunction);
    socket.on('setSpeed', setSpeedFunction);
    socket.on('querySpeed', function() {socket.emit('speed', speed)});
});

var startTimeFunction = function() {
    if (!timeout) {
        timeout = setInterval(tick, 1000);
        startTime = new Date();
        timeReference = timeReference || startTime;
        console.log("startTime", startTime, "=>", timeReference, "(", timeReference.getTime(), ")");
    }
};

var stopTimeFunction = function() {
    if (timeout) {
        clearTimeout(timeout);
        timeout = null;
        timeReference = calculateSimulatedTime();
    }
};

var setTimeFunction = function(time) {
    startTime = new Date();
    timeReference = new Date(time);
};

var setSpeedFunction = function(newSpeed) {
    timeReference = calculateSimulatedTime();
    startTime = new Date();
    speed = newSpeed;
    io.sockets.emit('speed', speed);
};

var tick = function() {
    io.sockets.emit('time', calculateSimulatedTime());
};

setTimeout(startTimeFunction, 1000);

function calculateSimulatedTime() {
    var now = new Date();
    var elapsedTime = now.getTime() - startTime.getTime();
    var result = new Date(timeReference.getTime() + elapsedTime * speed);
    console.log("Will calculate simulated time from", timeReference, timeReference.getTime(), elapsedTime, speed, "=>", result);
    return result;
}
