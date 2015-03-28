process.title = 'resource-system';

var io = require('socket.io')(),
    config = require('../Common/js/configService.js'),
    model = require('../Common/js/model.js'),
    fs = require('fs');

var port = io.listen(0).httpServer.address().port;
console.log("Has started server on port", port);

config.registerService(port, "resource-service");

var stations = [];
var units    = [];

var getUnit = function (id) {
    for (var i = 0; i < units.length; i++) {
        if (units[i].id === id) {
            return units[i];
        }
    }
    return null;
};

function assignUnitToCase(unitId, caseId) {
    console.log('Asked to assign resource', unitId, 'to case', caseId);
    var aCase = events[caseId];
    aCase && (events[caseId].resource = unitId);
    var unit = getUnit(unitId);

    if (unit) {
        //Temporary
        aCase['resource'] = unitId;
        aCase['status']   = 'U';
        aCase['time2']    = currentTime;
        unit.assignCase(aCase, currentTime);
        console.log(aCase);
        notifySubscribers(io.sockets, [unit]);
        io.sockets.emit('cases', [aCase]);
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

var currentTime;

var sendStartData = function() {
    notifySubscribers(io.sockets, stations);
    calculateStartPositions(units, stations);
    notifySubscribers(io.sockets, units);
};

var processTime = function(time, type) {
    currentTime = new Date(time);
    console.log('processing time', currentTime, type, currentTime.getTime());
    if (type == 'set') {
        events   = {};
        units    = [];
        stations = [];
        readData('resources.json', function(){
            setTimeout(sendStartData, 500);
        });
    } else {
        var updated = [];
        units.forEach(function(unit) {
            var result = unit.time(currentTime, type);
            result && updated.push(result);
        });
        if (updated.length > 0) {
            notifySubscribers(io.sockets, updated);
        }
    }
};

//var timeConsumer =
    require('../Common/js/serviceConsumer')('time-service', process.title,
    {
        'time': processTime
    },
    true
);


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

var readData = function (filename, callback) {
    fs.readFile(filename, 'utf8', function (err, data) {
        if (err) { throw err;}
        data = JSON.parse(data);

        //carcounter = 0;
        stations = data.stations;
        units    = model.Unit(data.units);
        //console.log('converted', data.units, 'into', units);
        console.log("Has read data file", filename, stations.length, "stations and", units.length, "ambulances");
        callback && callback();
    });
};
