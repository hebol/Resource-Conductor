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

// prototype object to hold log data
var logPrototype = {
    priority:   "",
    address:    "",
    caseId:     "",
    received:   "",
    assigned:   "",
    arrived:    "",
    loaded:     "",
    atHospital: "",
    finished:   ""
};

// Log/results data
var cases = {};

var processTime = function(time, type) {
    if (type == 'set') {
        // Clear and perhaps stash old state
    } else {
        currentTime = new Date(time);
    }
};

var processEvent = function(events) {
    events.forEach(function(event){
        if (cases.hasOwnProperty(event.id)) {
            var aCase = cases[event.id];
            // In case we change the priority
            aCase.priority = event.prio;
            if (aCase.assigned === "") {
                aCase.assigned = currentTime;
            }
        } else {
            var aCase = Object.create(logPrototype);

            aCase.priority = event.prio;
            aCase.caseId   = event.id;
            aCase.address  = event.address;
            aCase.received = currentTime;

            if (event.resource) {
                aCase.assigned = currentTime;
            }

            cases[event.id] = aCase;
        }
    });
};

var processResource = function(resources) {
    resources.forEach(function(resource) {

    });
};

io.on('connection', function(socket) {
    console.log('connecting:', socket.id);
//    socket.on('queryTimeMarks', function() {socket.emit('timeMarks', [{name: 'Start', timeStamp: '2015-05-23 12:00'}]);});
});
