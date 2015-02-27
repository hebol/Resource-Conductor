process.title = 'number-sender';

var io = require('socket.io')(),
    config = require('../Common/js/configService.js');

io.on('connection', function(socket) {
    console.log('connecting:', socket.id);
});

var port = io.listen(0).httpServer.address().port;

console.log("Has started server on port", port);

config.setup("time-system");
config.registerService(port, "time-service");