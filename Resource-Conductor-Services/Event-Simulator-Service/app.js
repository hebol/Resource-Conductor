process.title = 'event-system';

var io = require('socket.io')(),
    config = require('../Common/js/configService.js'),
    fs = require('fs');

var port = io.listen(0).httpServer.address().port;

console.log("Has started server on port", port);

var consumer = require('../Common/js/serviceConsumer')('time-service', process.title,
    {
        'time': processTimeEvent
    }, true
);

var lastTime;
var eventList = [];

function processEvents(target, fromTime, toTime) {
    console.log('processEvents(', fromTime, ',', toTime, ')');
    var events = eventList.filter(function(anEvent) {return anEvent.time.getTime() > fromTime.getTime() && anEvent.time.getTime() <= toTime.getTime()});

    events.forEach(function(anEvent) {target.emit('event', anEvent); console.log("Sending event", anEvent)});
}

function processTimeEvent(time, type) {
    time = new Date(time);
    console.log("processTimeEvent(",time,",", type, ")");
    if (type == 'set') {
        lastTime = new Date(0);
        processEvents(io.sockets, lastTime, time);
    } else {
        lastTime && processEvents(io.sockets, lastTime, time);
    }

    lastTime = time;
}

config.registerService(port, "event-service");

io.on('connection', function(socket) {
    console.log('connecting:', socket.id);
    lastTime && processEvents(socket, new Date(0), lastTime);
});

var setStartTime = function (startTime) {
    if (consumer.isConnected()) {
        console.log("Setting start time to", startTime);
        consumer.emit('setTime', startTime);
    } else {
        console.log("Not yet connected to time service");
        setTimeout(setStartTime, 1000, startTime);
    }
};

var readEvents = function (filename) {
    fs.readFile(filename, 'utf8', function (err, data) {
        console.log("Has read data file", data);
        if (err) throw err;
        var data = JSON.parse(data);
        eventList = data.eventList;
        eventList.forEach(function(event){ event.time = new Date(event.time);});
        setStartTime( new Date(data.startTime));
    });
};

readEvents('events.json');
