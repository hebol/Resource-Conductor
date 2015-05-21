process.title = 'event-system';

var io          = require('socket.io')(),
    config      = require('../Common/js/configService.js'),
    dataImport  = require('../Common/js/dataImport.js'),
    fs          = require('fs'),
    gm          = require('googlemaps'),
    googleCache = require('../Common/js/googleCache.js')('../data/address');

var port = io.listen(0).httpServer.address().port;

console.log('Has started server on port', port);

require('../Common/js/serviceConsumer')('time-service', process.title,
    {
        'time': processTimeEvent
    }, true
);

var validUnitNames = {};

var readData = function (filename, callback) {
    fs.readFile(filename, 'utf8', function (err, data) {
        if (err) { throw err;}
        data = JSON.parse(data);

        data.units.forEach(function(unit) {
            validUnitNames[unit.name] = unit.name;
        });
        callback && callback( validUnitNames);
    });
};

readData('../data/resources.json', function(names) {
    console.log('Has read', Object.keys(names).length, 'valid unit names');
});


var findCase = function (caseId, context) {
    for (var i = 0 ; i < caseList.length ; i++) {
        if (caseList[i].id === caseId) {
            return caseList[i];
        }
    }
    console.log('Case', caseId, 'not found', context);
    return null;
};

var resourceNames = {};

var processResources = function(updated) {
    updated.forEach(function(unit){
        if (lastTime && lastTime.getTime() > 0 && (unit.status == 'K' || unit.status == 'H')) {
            var aCase = unit.currentCase && findCase(unit.currentCase.id, 'processResources');
            aCase && (aCase.FinishedTime = lastTime);
            aCase && io.sockets.emit('event', aCase);
        }
        if (!resourceNames[unit.name]) {
            resourceNames[unit.name] = true;
        }
    });
};


var resourceConsumer =
require('../Common/js/serviceConsumer')('resource-service', process.title,
    {
        'resourcesUpdated': processResources
    }, true
);

var lastTime;
var caseList = [];

function sendEvent(target, anEvent, doAssign) {
    console.log('Sending event', anEvent.CaseFolderId, doAssign, anEvent.resources);
    if (doAssign && anEvent.resources) {
        anEvent.resources.forEach(function(unitId) {
            resourceConsumer.emit('assignResourceToCase', unitId, anEvent);
        });
    }
    anEvent.isSent = true;
    target.emit('event', anEvent);
}

function processEvents(target, fromTime, toTime) {
    var events = caseList.filter(function(anEvent) {
        var eventTime = new Date(anEvent.MissionStarted);
        var result = eventTime.getTime() > fromTime.getTime() && eventTime.getTime() <= toTime.getTime();

        return result;
    });

    events.forEach(function(anEvent) {sendEvent(target, anEvent, true);});
}

var getCurrentCases = function(time) {
    if (time) {
        var timeLong = time.getTime();
        var result = caseList.filter(function(anEvent){ return !anEvent.FinishedTime && new Date(anEvent.MissionStarted).getTime() <= timeLong;});
        console.log('Current cases at', time, result.length, 'of', caseList.length);
        return result;
    } else {
        console.log('No time set, returning empty event list');
        return [];
    }
};

var lookupAddressForCases = function (aCaseList, index) {
    if (!index) {
        index = 0;
    }
    if (index < aCaseList.length) {
        var aCase = aCaseList[index];
        var filename = googleCache.posToFilename(aCase);
        googleCache.dataFileExists(filename, function(status) {
            function updateCase(data, delay) {
                aCase.address = data;
                if (aCase.isSent && !aCase.FinishedTime) {
                    sendEvent(io.sockets, aCase);
                }
                setTimeout(lookupAddressForCases, delay || 300, aCaseList, index + 1);
            }

            if (status) {
                googleCache.loadDataFile(filename, function(data) {
                    updateCase(data, 1);
                });
            } else {
                gm.reverseGeocode(aCase.latitude + "," + aCase.longitude, function(error, data) {
                    var result = '';
                    if (!error && data.status == 'OK' && data.results[0]) {
                        // console.log('=>', data.results[0]);
                        var extractTypes = function (params, list) {
                            var result = "";
                            params.forEach(function(param) {
                                var found = list.filter(function(component) {return component.types.indexOf(param) >= 0;});
                                if (found.length > 0) {
                                    result += found[0].long_name + ' ';
                                }
                            });
                            return result;
                        };
                        result = extractTypes(['route', 'street_number', 'postal_town'], data.results[0].address_components);
                    } else {
                        console.log('Google returned', error, data);
                    }
                    console.log('received', JSON.stringify(result), 'from reverse lookup');
                    googleCache.writeDataFile(filename, result);
                    updateCase(result, 300);
                });
            }
        });
    }
};

function handleSetTime(time) {
    dataImport().readDataForTime(time, validUnitNames, function (data) {
        console.log('Has received', Object.keys(data.cases).length, 'events');
        data.cases.forEach(function (aCase) {
            aCase.index = aCase.CaseIndex1Name;
            aCase.id = aCase.CaseFolderId;
            aCase.latitude = aCase.latitude.replace(',', '.');
            aCase.longitude = aCase.longitude.replace(',', '.');
            aCase.time = new Date(aCase.MissionStarted);
            aCase.time2 = "";
            aCase.prio = aCase.CasePriority;
            aCase.address = "TBD";
            aCase.isSent = false;

            if (aCase.resources) {
                aCase.resources.forEach(function (resourceId) {
                    var logs = data.logs.filter(function (aLog) {
                        return aLog.LogText.indexOf(resourceId) >= 0 && aLog.CaseFolderId == aCase.CaseFolderId;
                    });
                    resourceConsumer.emit('updateStatusForResource', resourceId, logs, aCase);
                    console.log('Has found', logs.length, 'entries for', resourceId, 'on case', aCase.CaseFolderId);
                });
            } else {
                if (new Date(aCase.StartingTime).getTime() < time.getTime()) {
                    console.log('No logs found for', aCase.CaseFolderId, 'end', aCase.StartingTime);
                }
            }
        });
        caseList = data.cases;
        console.log('Starting time', time, 'gives', caseList.length);
        lookupAddressForCases(caseList);
    });
}

function processTimeEvent(time, type) {
    time = new Date(time);
    if (type == 'set') {
        lastTime = new Date(0);
        handleSetTime(time);
    } else {
        lastTime && processEvents(io.sockets, lastTime, time);
        lastTime = time;
    }
}

config.registerService(port, 'event-service');

var assignUnitToCaseById = function (unitId, caseId) {
    var aCase = findCase(caseId, 'assignUnitToCaseById');
    if (aCase) {
        if (aCase.hasOwnProperty("resources")) {
            if (aCase.resources.indexOf(unitId) != -1) {
                aCase.resources.push(unitId);
            }
        } else {
            aCase["resources"] = [unitId];
        }

        console.log('Assigning', unitId, 'to', aCase);
        resourceConsumer.emit('assignResourceToCase', unitId, aCase);
        sendEvent(io.sockets, aCase, false);
    }
};

io.on('connection', function(socket) {
    console.log('connecting:', socket.id);
    getCurrentCases(lastTime).forEach(function(anEvent) {sendEvent(socket, anEvent, false);});
    socket.on('assignResourceToCase', function(unitId, caseId) {
        assignUnitToCaseById(unitId, caseId);
    });

});
