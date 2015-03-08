process.title = 'resource-system';

var io = require('socket.io')(),
    config = require('../Common/js/configService.js'),
    fs = require('fs');

var port = io.listen(0).httpServer.address().port;
console.log("Has started server on port", port);

config.registerService(port, "resource-service");

io.on('connection', function(socket) {
    console.log('connecting:', socket.id);
    notifySubscribers(socket, resources);
});

var resources;

var notifySubscribers = function (sockets, resources) {
    sockets.emit('resourcesUpdated', resources);
};

var readData = function (filename) {
    fs.readFile(filename, 'utf8', function (err, data) {
        console.log("Has read data file", filename);
        if (err) { throw err;}
        var data = JSON.parse(data);
        resources = data.stations;
        notifySubscribers(io.sockets, resources);
    });
};

readData('resources.json');
