var serverPort = 7133;
var io         = require('socket.io')();

var subscribers = [];
var currentTime = Date.now();


io.on('connection', function(socket) {
    console.log('connecting:', socket.id);
    subscribers.push(socket);

    socket.on('setTime', function(time) {
        currentTime = time;
        updateTime(subscribers);
    });

    socket.on('disconnect', function() {
        console.log('disconnecting:', socket.id);
        delete subscribers[socket];
    });
});

console.log("Has started time server on port", serverPort);
io.listen(serverPort);