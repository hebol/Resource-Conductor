process.title = 'event-system';

var io = require('socket.io')(),
    config = require('../Common/js/configService.js'),
    fs = require('fs');

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
    console.log('Sending event', anEvent.id, doAssign, anEvent.resource);
    if (doAssign && anEvent.resource) {
        resourceConsumer.emit('assignResourceToCase', anEvent.resource, anEvent);
    }
    target.emit('event', anEvent);
}

function processEvents(target, fromTime, toTime) {
    var events = eventList.filter(function(anEvent) {return anEvent.time.getTime() > fromTime.getTime() && anEvent.time.getTime() <= toTime.getTime()});

    events.forEach(function(anEvent) {sendEvent(target, anEvent, true);});
}

function processTimeEvent(time, type) {
    time = new Date(time);
    if (type == 'set') {
        lastTime = new Date(0);
        readEvents('events.json');
    } else {
        lastTime && processEvents(io.sockets, lastTime, time);
        lastTime = time;
    }
}

config.registerService(port, 'event-service');

var processResources = function(updated) {
    // ignore for now
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
        console.log('Assigning', unitId, 'to', aCase);
        aCase.resource = unitId;

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
