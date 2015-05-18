process.title = 'resource-system';

var io         = require('socket.io')(),
    config     = require('../Common/js/configService.js'),
    model      = require('../Common/js/model.js'),
    fs         = require('fs');

var port = io.listen(0).httpServer.address().port;
console.log("Has started server on port", port);

var stations = [];
var units    = [];

var readData = function (filename, callback) {
    fs.readFile(filename, 'utf8', function (err, data) {
        if (err) { throw err;}
        data = JSON.parse(data);

        stations = data.stations;
        units    = model.Unit(data.units);
        calculateStartPositions(units, stations);
        //console.log('converted', data.units, 'into', units);
        console.log("Has read data file", filename, stations.length, "stations and", units.length, "ambulances");
        callback && callback( {stations: stations, units:units});
    });
};

readData('../data/resources.json', function() {
    config.registerService(port, "resource-service");
});

var getUnit = function (id) {
    for (var i = 0; i < units.length; i++) {
        if (units[i].name === id) {
            return units[i];
        }
    }
    return null;
};

function assignUnitToCase(unitId, aCase) {
    console.log('Asked to assign resource', unitId, 'to case', aCase.CaseFolderId);
    var unit = getUnit(unitId);

    if (unit) {
        unit.assignCase(aCase, currentTime);
        console.log(aCase);
        notifySubscribers(io.sockets, [unit]);
    }
}

var updateUnitStatus = function (unitId, logs, aCase) {
    console.log('Asked to update resource', unitId, 'to with logs', logs.length);
    var unit = getUnit(unitId);

    if (unit) {
        unit.processLogs(logs, aCase);
    } else {
        console.log('Could not find unit with id', unitId, 'in list', units);
    }
};

io.on('connection', function(socket) {
    console.log('client', socket.id, 'connecting');
    sendStartData(socket);

    socket.on('assignResourceToCase', function(unitId, caseId) {
        assignUnitToCase(unitId, caseId);
    });

    socket.on('updateStatusForResource', function(unitId, logs, aCase) {
        updateUnitStatus(unitId, logs, aCase);
    });
});

var currentTime;

var sendStartData = function(target) {
    notifySubscribers(target, stations);
    notifySubscribers(target, units);
};

var processTime = function(time, type) {
    currentTime = new Date(time);
    //console.log('processing time', currentTime, type, currentTime.getTime());
    if (type == 'set') {
        units.forEach(function(unit) {
            unit.reset();
        });
        setTimeout(function(){notifySubscribers(io.sockets, units);}, 500);
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
            unit.homeStationPos = {
                latitude: station.latitude,
                longitude: station.longitude
            };
        }
    });
};

