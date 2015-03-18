process.title = 'route-system';

var io = require('socket.io')(),
    config = require('../Common/js/configService.js');
var gm = require('googlemaps');
var fs = require('fs');

var port = io.listen(0).httpServer.address().port;

console.log("Has started server on port", port);

config.setup(process.title);
config.registerService(port, "route-service");

io.on('connection', function(socket) {
    console.log('connecting', socket.id, 'to route system');
    socket.on('getRouteForId', function(from, to, id) {
        console.log("Asked for route from", from, to, "for id", id);
        calculateRoute(from, to, function (route) {
            socket.emit('routeForId', id, route);
        });
    });
});

function toGooglePoint(point) {
    return point.latitude + ',' + point.longitude;
}

function dataFileExists(filename, callback) {
    return fs.exists(filename, callback);
}

function loadDataFile(filename, callback) {
    console.log('loading route file', filename);
    fs.readFile(filename, 'utf8', function (err, data) {
        if (err) {
            throw err;
        }
        callback && callback(JSON.parse(data));
    });
}

function writeDataFile(filename, route) {
    fs.writeFile(filename, JSON.stringify(route));
}

function posToFilename(start, stop) {
    function toFilename(pos1, pos2) {
        return "routes/" + pos1.latitude + '_' + pos1.longitude + '_' + pos2.latitude + '_' + pos2.longitude + ".json";
    }

    if (start.latitude > stop.latitude || (start.latitude === stop.latitude && start.longitude > stop.longitude)) {
        return toFilename(start, stop);
    } else {
        return toFilename(stop, start);
    }
}

function calculateRoute(start, stop, callback) {
    var from = toGooglePoint(start);
    var to   = toGooglePoint(stop);
    var filename = posToFilename(start, stop);

    dataFileExists(filename, function(exists){
        if(exists) {
            loadDataFile(filename, callback);
        } else {
            gm.directions(from, to, function(err, route) {
                console.log("Has received from google", route, "(", err, ")");
                writeDataFile(filename, route);
                callback && callback(route);
            });
        }
    });
}
