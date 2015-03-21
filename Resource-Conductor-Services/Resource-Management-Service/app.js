process.title = 'resource-system';

var io = require('socket.io')(),
    config = require('../Common/js/configService.js'),
    routeHandling = require('../Common/js/routeHandling.js'),
    fs = require('fs');

var port = io.listen(0).httpServer.address().port;
console.log("Has started server on port", port);

config.registerService(port, "resource-service");

var getUnit = function (id) {
    for (var i = 0; i < units.length; i++) {
        if (units[i].id === id) {
            return units[i];
        }
    }
    return null;
};

function assignUnitToCase(unitId, caseId) {
    console.log("Asked to assign resource", unitId, "to case", caseId);
    var aCase = events[caseId];
    aCase && (events[caseId].resource = unitId);
    var unit = getUnit(unitId);

    if (unit) {
        //Temporary
        unit.status = "U";
        notifySubscribers(io.sockets, [unit]);

        routeConsumer.emit('getRouteForId', unit, aCase, unitId);
    }
}
io.on('connection', function(socket) {
    console.log('client', socket.id, 'connecting');
    notifySubscribers(socket, stations);
    notifySubscribers(socket, units);

    socket.on('assignResourceToCase', function(unitId, caseId) {
        assignUnitToCase(unitId, caseId);
    });

});

var events = {};

function processEvent(event) {
    var wasUnknown = !events[event.id];
    events[event.id] = event;
    wasUnknown && event.resource && assignUnitToCase(event.resource, event.id);
}

//var eventConsumer =
    require('../Common/js/serviceConsumer')('event-service', process.title,
    {
        'event': processEvent
    },
    true
);

var polyUtil = require('polyline-encoded');
function investigateRoute(routes) {
    routes.forEach(function(route) {
        var steps = [];
        console.log('There are', route.legs.length, 'parts');
        var duration = 0, distance = 0;
        route.legs.forEach(function(leg) {
            console.log('looking at', leg.start_address, 'to', leg.end_address);
            var partDur = 0;
            leg.steps.forEach(function(step) {
                var positions = polyUtil.decode(step.polyline.points);
                for (var i = 0 ; i < positions.length - 1 ; i++) {
                    var timedStep = {
                        startTime: duration + partDur + (i * step.duration.value) / positions.length,
                        latitude: positions[i][0],
                        longitude:  positions[i][1]
                    };
                    steps.push(timedStep);
                }
                console.log('dist', step.distance.value, 'dur', step.duration.value, 'pos', positions.length);
                partDur += step.duration.value;
            });
            duration += leg.duration.value;
            distance += leg.distance.value;
        });
        console.log('Total duration', duration, 'and length', distance);
        steps.forEach(function(step) { console.log('step', step)});
        return steps;
    });
}

function processRouteForId(id, route) {
    console.log("Received route for id", id, "==>", route);
    //console.log(JSON.stringify(route));
    investigateRoute(route.routes);
}

var routeConsumer = require('../Common/js/serviceConsumer')('route-service', process.title,
    {
        'routeForId': processRouteForId
    },
    true
);

var stations = [];
var units    = [];


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
        data = JSON.parse(data);

        //carcounter = 0;
        stations = data.stations;
        units    = data.units;
        console.log("Has read data file", filename, stations.length, "stations and", units.length, "ambulances");
        notifySubscribers(io.sockets, stations);
        calculateStartPositions(units, stations);
        notifySubscribers(io.sockets, units);
    });
};

readData('resources.json');
