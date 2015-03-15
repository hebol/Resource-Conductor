process.title = 'route-system';

var io = require('socket.io')(),
    config = require('../Common/js/configService.js');

var port = io.listen(0).httpServer.address().port;

console.log("Has started server on port", port);

config.setup(process.title);
config.registerService(port, "route-service");

io.on('connection', function(socket) {
    console.log('connecting', socket.id, 'to route system');
    socket.on('routeForId', function(from, to, id) {
        console.log("Asked for route from", from, to, "for id", id);
    });
});
