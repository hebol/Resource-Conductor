process.title = 'event-system';

var io = require('socket.io')(),
    config = require('../Common/js/configService.js');

var port = io.listen(0).httpServer.address().port;

console.log("Has started server on port", port);

var consumer = require('../Common/js/serviceConsumer')('time-service', process.title,
    {
        'time': processTimeEvent
    }
);

var lastTime;
var eventList = [];

function processEvents(fromTime, toTime) {
    var events = eventList.filter(function(anEvent) {return anEvent.time.getTime() > fromTime.getTime() && anEvent.time.getTime() <= toTime.getTime()});

    events.forEach(function(anEvent) {io.sockets.emit('event', anEvent);});
}

function processTimeEvent(time, type) {
    if (type == 'tick' && lastTime) {
        processEvents(lastTime, time);
    }
    lastTime = time;
}

config.registerService(port, "event-service");

io.on('connection', function(socket) {
    console.log('connecting:', socket.id);
});
