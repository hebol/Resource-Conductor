process.title = 'log-system';

var io = require('socket.io')(),
    config = require('../Common/js/configService.js');

var port = io.listen(0).httpServer.address().port;

console.log("Has started server on port", port);

config.setup("log-system");
config.registerService(port, "log-service");

var currentTime;


//var timeConsumer =
require('../Common/js/serviceConsumer')('time-service', process.title,
    {
        'time': processTime
    },
    true
);
require('../Common/js/serviceConsumer')('event-service', process.title,
    {
        'event': processEvent
    },
    true
);
require('../Common/js/serviceConsumer')('resource-service', process.title,
    {
        'resourcesUpdated': processResource
    },
    true
);

var processTime = function(time, type) {
    if (type == 'set') {
        // Clear and perhaps stash old state
    } else {
        currentTime = new Date(time);
    }
};

var processEvent = function(events) {

};

var processResource = function(resources) {

};

io.on('connection', function(socket) {
    console.log('connecting:', socket.id);
//    socket.on('queryTimeMarks', function() {socket.emit('timeMarks', [{name: 'Start', timeStamp: '2015-05-23 12:00'}]);});
});
