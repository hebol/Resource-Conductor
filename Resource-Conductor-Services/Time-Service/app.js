process.title = 'time-system';

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
    tick('set');
};

var setSpeedFunction = function(newSpeed) {
    timeReference = calculateSimulatedTime();
    startTime = new Date();
    speed = newSpeed;
    io.sockets.emit('speed', speed);
};

var tick = function(param) {
    io.sockets.emit('time', calculateSimulatedTime(), param || 'tick');
};

var count = 0;
function calculateSimulatedTime() {
    var now = new Date();
    var elapsedTime = now.getTime() - startTime.getTime();
    var result = new Date(timeReference.getTime() + elapsedTime * speed);
    (count++ % 100 == 0) && console.log("Sim time", result);
    return result;
}
