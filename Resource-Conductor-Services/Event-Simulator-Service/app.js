process.title = 'event-system';

var io         = require('socket.io')(),
    config     = require('../Common/js/configService.js'),
    dataImport = require('../Common/js/dataImport.js'),
    fs         = require('fs');

var port = io.listen(0).httpServer.address().port;

console.log('Has started server on port', port);

//var consumer =
require('../Common/js/serviceConsumer')('time-service', process.title,
    {
        'time': processTimeEvent
    }, true
);

var resourceConsumer =
require('../Common/js/serviceConsumer')('resource-service', process.title,
    {
        'updatedResources': processResources
    }, true
);

var lastTime;
var eventList = [];

function sendEvent(target, anEvent, doAssign) {
    console.log('Sending event', anEvent.CaseFolderId, doAssign, anEvent.resources);
    if (doAssign && anEvent.resources) {
        anEvent.resources.forEach(function(unitId) {
            resourceConsumer.emit('assignResourceToCase', unitId, anEvent);
        });
    }
    target.emit('event', anEvent);
}

function processEvents(target, fromTime, toTime) {
    var events = eventList.filter(function(anEvent) {
        var eventTime = new Date(anEvent.MissionStarted);
        var result = eventTime.getTime() > fromTime.getTime() && eventTime.getTime() <= toTime.getTime();

        return result;
    });

    events.forEach(function(anEvent) {sendEvent(target, anEvent, true);});
}

function handleSetTime(time) {
    dataImport().readDataForTime(time, function (data) {
        var result = {
            unitLogs: {}
        };
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
        result.cases = data.cases;
        console.log('Starting time', time, 'gives', result.cases.length);
        eventList = result.cases;

        resourceConsumer.emit('setUnitsStatus', result);
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

var processResources = function(updated) {
    updated.forEach(function(unit){
        if (unit.status == 'K' || unit.status == 'H') {
            var aCase = findCase(unit.currentCase.id);
            aCase && (aCase.FinishedTime = lastTime);
            io.sockets.emit('event', aCase);
        }
    });
};

var findCase = function (caseId) {
    for (var i = 0 ; i < eventList.length ; i++) {
        if (eventList[i].id === caseId) {
            return eventList[i];
        }
    }
    console.log('Case', caseId, 'not found');
    return null;
};

var assignUnitToCaseById = function (unitId, caseId) {
    var aCase = findCase(caseId);
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
    lastTime && processEvents(socket, new Date(0), lastTime);
    socket.on('assignResourceToCase', function(unitId, caseId) {
        assignUnitToCaseById(unitId, caseId);
    });

});

var readEvents = function (filename) {
    fs.readFile(filename, 'utf8', function (err, data) {
        console.log('Has read data file', data);
        if (err) throw err;
        var data = JSON.parse(data);
        eventList = data.eventList;
        eventList.forEach(function(event){ event.time = new Date(event.time);});
    });
};
