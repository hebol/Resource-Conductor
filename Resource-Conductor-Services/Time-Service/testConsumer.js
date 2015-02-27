process.title = 'number-sender';

var io = require('socket.io')(),
    config = require('../Common/js/configService.js');

var timeout, startTime, speed, timeReference;

io.on('connection', function(socket) {
    console.log('connecting:', socket.id);
    socket.on('startTime', function() {
        if (!timeout) {
            timeout = setInterval(tick, 1000);
            startTime = new Date();
            timeReference = timeReference | startTime;
        }
    });

    socket.on('stopTime', function() {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
            timeReference = calculateSimulatedTime();
        }
    });
});

function calculateSimulatedTime() {
    var now = new Date();
    var elapsedTime = now.getMilliseconds() - startTime.getMilliseconds();
    return new Date(timeReference.getMilliseconds() + elapsedTime);
}

var tick = function() {
    io.sockets.emit('time', calculateSimulatedTime());
};

var port = io.listen(0).httpServer.address().port;

console.log("Has started server on port", port);

config.setup("time-system");
config.registerService(port, "time-service");