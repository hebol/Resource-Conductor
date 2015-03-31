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
    accepted:   "",
    arrived:    "",
    loaded:     "",
    atHospital: "",
    finished:   ""
};

// Log/results data
var cases = {};
var unitToCaseMapping = {};

var processTime = function(time, type) {
    if (type == 'set') {
        // Clear and perhaps stash old state
    } else {
        currentTime = new Date(time);
    }
};

var formatTime = function (milliseconds) {
    var result = "+" + (milliseconds/1000) + "s";
    console.log('New time: ', result);
    return result;
};

var processEvent = function(events) {
    console.log("got events");
    events.forEach(function(event){
        if (cases.hasOwnProperty(event.id)) {
            var aCase = cases[event.id];
            // In case we change the priority
            aCase.priority = event.prio;
            if (aCase.assigned === "") {
                aCase.assigned = formatTime(Math.abs(currentTime - aCase.received));
            }
            if (event.resources) {
                event.resources.forEach(function(resource) {
                    unitToCaseMapping[resource.id] = aCase.caseId;
                });
            }
        } else {
            var aCase = Object.create(logPrototype);

            aCase.priority = event.prio;
            aCase.caseId   = event.id;
            aCase.address  = event.address;
            aCase.received = currentTime;

            if (event.resources) {
                aCase.assigned = formatTime(Math.abs(currentTime - aCase.received));
                event.resources.forEach(function(resource) {
                    unitToCaseMapping[resource.id] = aCase.caseId;
                });
            }

            cases[event.id] = aCase;
        }
    });
};

var processResource = function(resources) {
    console.log("got resources");

    resources.forEach(function(aUnit) {
        var caseId = unitToCaseMapping[resource.id];
        if (caseId) {
            var aCase = cases[caseId];

            switch (aUnit.status) {
                case "K":
                    console.log("State K for assigned unit -> wrong");
                    break;
                case "T":
                    console.log("State T for assigned unit -> wrong");
                    break;
                case "U":
                    aCase.accepted = formatTime(Math.abs(currentTime - aCase.received));
                    break;
                case "F":
                    aCase.arrived = formatTime(Math.abs(currentTime - aCase.received));
                    break;
                case "L":
                    aCase.loaded = formatTime(Math.abs(currentTime - aCase.received));
                    break;
                case "S":
                    aCase.atHospital = formatTime(Math.abs(currentTime - aCase.received));
                    break;
                case "H":
                    // Homebound
                    console.log("State H for assigned unit -> wrong");
                    aCase.finished = formatTime(Math.abs(currentTime - aCase.received));
                    break;
                default:
                    break;
            }
        }
    });
};

io.on('connection', function(socket) {
    console.log('connecting:', socket.id);
//    socket.on('queryTimeMarks', function() {socket.emit('timeMarks', [{name: 'Start', timeStamp: '2015-05-23 12:00'}]);});
});
