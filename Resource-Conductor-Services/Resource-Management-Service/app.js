process.title = 'resource-system';

var io = require('socket.io')(),
    config = require('../Common/js/configService.js'),
    fs = require('fs');

var port = io.listen(0).httpServer.address().port;
console.log("Has started server on port", port);

config.registerService(port, "resource-service");

io.on('connection', function(socket) {
    console.log('connecting:', socket.id);
    notifySubscribers(socket, stations);
    notifySubscribers(socket, units);
});

var stations;
var units;

var notifySubscribers = function (sockets, resources) {
    sockets.emit('resourcesUpdated', resources);
};

var getStation = function (name, stationList) {
    var found = stationList.filter(function(station) { return name == station.name;});
    return found.length > 0 && found[0];
};

var calculateStartPositions = function (unitList, stationList) {
    unitList.forEach( function(unit) {
        var station = getStation(unit.homeStation, stationList);
        if (!station) {
            console.error("No station found for unit", unit);
        } else {
            unit.latitude = station.latitude;
            unit.longitude = station.longitude;
        }
    });
};

var readData = function (filename) {
    fs.readFile(filename, 'utf8', function (err, data) {
        if (err) { throw err;}
        var data = JSON.parse(data);
        stations = data.stations;
        units = data.units;
        console.log("Has read data file", filename, stations.length, "stations and", units.length, "ambulances");
        notifySubscribers(io.sockets, stations);
        calculateStartPositions(units, stations);
        notifySubscribers(io.sockets, units);
    });
};

readData('resources.json');
