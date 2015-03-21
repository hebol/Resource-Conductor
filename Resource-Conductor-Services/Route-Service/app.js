process.title = 'route-system';

var io = require('socket.io')(),
    config = require('../Common/js/configService.js');
var gm = require('googlemaps');
var routeHandling = require('../Common/js/routeHandling.js');

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


function calculateRoute(start, stop, callback) {
    var from = toGooglePoint(start);
    var to   = toGooglePoint(stop);
    var filename = routeHandling.posToFilename(start, stop);

    routeHandling.dataFileExists(filename, function(exists){
        if(exists) {
            routeHandling.loadDataFile(filename, callback);
        } else {
            gm.directions(from, to, function(err, route) {
                console.log("Has received ROUTE from google", route, "(", err, ")");
                routeHandling.writeDataFile(filename, route);
                callback && callback(route);
            });
        }
    });
}
