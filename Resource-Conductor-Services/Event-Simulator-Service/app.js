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

var lastTime;
var eventList = [];

function sendEvent(target, anEvent, type) {
    target.emit('event', anEvent, type);
}

function processEvents(target, fromTime, toTime) {
    console.log('processEvents(', fromTime, ',', toTime, ')');
    var events = eventList.filter(function(anEvent) {return anEvent.time.getTime() > fromTime.getTime() && anEvent.time.getTime() <= toTime.getTime()});

    events.forEach(function(anEvent) {sendEvent(target, anEvent);});
}

function processTimeEvent(time, type) {
    time = new Date(time);
    console.log('processTimeEvent(',time,',', type, ')');
    if (type == 'set') {
        lastTime = new Date(0);
        readEvents('events.json');
    } else {
        lastTime && processEvents(io.sockets, lastTime, time);
        lastTime = time;
    }
}

config.registerService(port, 'event-service');

io.on('connection', function(socket) {
    console.log('connecting:', socket.id);
    lastTime && processEvents(socket, new Date(0), lastTime);
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
