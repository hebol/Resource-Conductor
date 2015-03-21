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
        aCase["resource"] = unitId;
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
    var steps = [];
    routes.forEach(function(route) {
        //console.log('There are', route.legs.length, 'parts');
        var duration = 0, distance = 0;
        route.legs.forEach(function(leg) {
            //console.log('looking at', leg.start_address, 'to', leg.end_address);
            var partDur = 0;
            leg.steps.forEach(function(step) {
                var positions = polyUtil.decode(step.polyline.points);
                console.log('working with', step, duration,partDur);
                for (var i = 0 ; i < positions.length - 1 ; i++) {
                    var calcDur = duration + partDur + (i * step.duration.value) / positions.length;
                    //console.log('dur', duration, 'part:', partDur, 'i', i, 'posLen:', positions.length, '=>', calcDur)
                    var timedStep = {
                        time: calcDur,
                        latitude: positions[i][0],
                        longitude:  positions[i][1]
                    };
                    steps.push(timedStep);
                }
                //console.log('dist', step.distance.value, 'dur', step.duration.value, 'pos', positions.length);
                partDur += step.duration.value;
            });
            duration += leg.duration.value;
            distance += leg.distance.value;
        });
        console.log('Total duration', duration, 'and length', distance);
        //steps.forEach(function(step) { console.log('step', step)});
    });
    return steps;
}

function processRouteForId(id, route) {
    console.log("Received route for id", id, "==>", route);
    //console.log(JSON.stringify(route));
    var steps = investigateRoute(route.routes);
    getUnit(id).routing = {
        steps: steps,
        startTime: currentTime
    };
    console.log('assigning', id, 'at', currentTime, currentTime.getTime());
}

var routeConsumer = require('../Common/js/serviceConsumer')('route-service', process.title,
    {
        'routeForId': processRouteForId
    },
    true
);

var currentTime;
function moveUnitForTime(unit, time) {
    console.log('unit', unit.name, unit.routing);
    var result = null;
    if (time) {
        var elapsedTime = (time.getTime() - unit.routing.startTime.getTime()) / 1000;
        if (elapsedTime > 0 && unit.routing.steps.length >= 0) {
            console.log('Will move', unit.name, 'steps(', unit.routing.steps.length, ')', elapsedTime);
            for (var i = 0 ; i < unit.routing.steps.length ; i++) {
                var aStep = unit.routing.steps[i];
                if (elapsedTime < aStep.time) {
                    console.log('Will move', unit.name, 'to', aStep);

                    unit.latitude = aStep.latitude;
                    unit.longitude = aStep.longitude;
                    result = unit;
                    if (i == unit.routing.steps.length - 1) {
                        console.log('Vehicle', unit.name, 'moved to location');
                        unit.routing = null;
                    }
                    break;
                }
            }
        } else {
            console.log('Unit', unit.name, 'is out of time');
        }
    }
    return result;
}

var processTime = function(time, type) {
    currentTime = new Date(time);
    console.log('processing time', currentTime, type, currentTime.getTime());
    var updated = [];
    units.forEach(function(unit) {
        var result = unit.routing && moveUnitForTime(unit, currentTime);
        result && updated.push(result);
    });
    if (updated.length > 0) {
        notifySubscribers(io.sockets, updated);
    }
};

//var timeConsumer =
    require('../Common/js/serviceConsumer')('time-service', process.title,
    {
        'time': processTime
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
