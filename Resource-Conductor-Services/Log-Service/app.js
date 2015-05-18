process.title = 'log-system';

var io = require('socket.io')(),
    config = require('../Common/js/configService.js');

var port = io.listen(0).httpServer.address().port;

console.log('Has started server on port', port);

config.setup('log-system');
config.registerService(port, 'log-service');

var currentTime;

// prototype object to hold log data
var logPrototype = {
    priority:   '',
    address:    '',
    id:         '',
    received:   '',
    assigned:   '',
    accepted:   '',
    arrived:    '',
    loaded:     '',
    atHospital: '',
    finished:   ''
};

// Log/results data
var cases             = {};
var caseToUnitMapping = {};

var processTime = function(time, type) {
    if (type == 'set') {
        cases             = {};
        caseToUnitMapping = {};
        diaryData         = [];
        resourceStatus    = {};
        currentTime = new Date(time);
        console.log(currentTime);
    } else {
        currentTime = new Date(time);
    }
};


var formatTime = function (milliseconds) {
    var seconds = Math.round(milliseconds/1000);
    var minutes   = Math.floor(seconds / 60);
    var result = '+';
    if (minutes > 0) {
        result = result + minutes + 'min ';
    }
    result = result + (seconds % 60) + 's';
    console.log(result);
    return result;
};

var diaryData = [];

var processEvent = function(events) {
    console.log('got events', events);
    var myEvents;
    if(Object.prototype.toString.call(events) !== '[object Array]') {
        myEvents = [events];
    } else {
        myEvents = events;
    }

    myEvents.forEach(function(event){
        var aCase;
        var time;
        if (cases.hasOwnProperty(event.id)) {
            aCase = cases[event.id];
            // In case we change the priority
            aCase.priority = event.prio;
            if (aCase.assigned === '') {
                time = Math.abs(currentTime - aCase.received);
                aCase.assigned     = formatTime(time);
                aCase.assignedTime = time;
                diaryData.push({'id' : aCase.id, 'time' : currentTime, 'message' : 'Case moved to status "assigned"'});
            }
            if (event.resources) {
                event.resources.forEach(function(resource) {
                    if (!caseToUnitMapping[aCase.id]) {
                        caseToUnitMapping[aCase.id] = [resource];
                    } else {
                        caseToUnitMapping[aCase.id].push(resource);
                    }
                });
            }
        } else {
            aCase = Object.create(logPrototype);
            aCase.priority = event.prio;
            aCase.id       = event.id;
            aCase.address  = event.address;
            aCase.received = currentTime;
            diaryData.push({'id' : aCase.id, 'time' : currentTime, 'message' : 'New case created'});

            if (event.resources) {
                time = Math.abs(currentTime - aCase.received);
                aCase.assigned = formatTime(time);
                aCase.assignedTime = time;
                diaryData.push({'id' : aCase.id, 'time' : currentTime, 'message' : 'Case moved to status "assigned"'});
            }

            cases[event.id] = aCase;
        }
    });
    console.log('cases now', cases);
};

var resourceStatus = {};

var resourceStatusUpdated = function(resource) {
    if (typeof resourceStatus[resource.id] === 'undefined' || resourceStatus[resource.id] !== resource.status) {
        resourceStatus[resource.id] = resource.status;
        return true;
    }
    return false;
};

var processResource = function(resources) {
    resources.forEach(function(resource) {
        if (resource.currentCase) {
            var aCase = cases[resource.currentCase.id];
            if (!aCase) {
                aCase = resource.currentCase;
                cases[aCase.id] = aCase;
            }
            var time  = Math.abs(currentTime - aCase.received);

            if (resourceStatusUpdated(resource)) {
                switch (resource.status) {
                    case 'K':
                        if (caseToUnitMapping[resource.id]) {
                            var finished = true;
                            for (var unit in Object.keys(caseToUnitMapping[resource.id])) {
                                if (unit.status != 'K') {
                                    console.log('State "K" for assigned unit -> no state change');
                                    finished = false;
                                    break;
                                }
                            }

                            if (finished) {
                                aCase.finished     = formatTime(time);
                                aCase.finishedTime = time;
                                diaryData.push({
                                    'id'      : aCase.id,
                                    'time'    : currentTime,
                                    'message' : 'Case moved to status "finished"'
                                });
                                console.log('Case', aCase.id, 'finished');
                            }
                        }
                        break;
                    case 'T':
                        console.log('State "T" for assigned unit -> no state change');
                        break;
                    case 'U':
                        if (aCase.accepted == '') {
                            aCase.accepted     = formatTime(time);
                            aCase.acceptedTime = time;
                            diaryData.push({
                                'id'      : aCase.id,
                                'time'    : currentTime,
                                'message' : 'Case moved to status "accepted"'
                            });
                        }
                        break;
                    case 'F':
                        if (aCase.arrived == '') {
                            aCase.arrived     = formatTime(time);
                            aCase.arrivedTime = time;
                            diaryData.push({
                                'id'      : aCase.id,
                                'time'    : currentTime,
                                'message' : 'Case moved to status "arrived"'
                            });
                        }
                        break;
                    case 'L':
                        if (aCase.loaded == '') {
                            aCase.loaded     = formatTime(time);
                            aCase.loadedTime = time;
                            diaryData.push({
                                'id'      : aCase.id,
                                'time'    : currentTime,
                                'message' : 'Case moved to status "loaded"'
                            });
                        }
                        break;
                    case 'S':
                        if (aCase.atHospital == '') {
                            aCase.atHospital     = formatTime(time);
                            aCase.atHospitalTime = time;
                            diaryData.push({
                                'id'      : aCase.id,
                                'time'    : currentTime,
                                'message' : 'Case moved to status "atHospital"'
                            });
                        }
                        break;
                    case 'H':
                        // Homebound
                        console.log('State "H" for assigned unit -> no state change');
                        aCase.finished     = formatTime(time);
                        aCase.finishedTime = time;
                        break;
                    default:
                        console.log(resource.status);
                        break;
                }
            }
        }
    });
};

io.on('connection', function(socket) {
    console.log('connecting:', socket.id);
    socket.on('queryCaseStatus', function() {
        console.log('Called queryStatus', cases);
        socket.emit('caseStatus', cases);
    });
    socket.on('queryDiaryData', function() {
        console.log('Called for DiaryData', diaryData);
        socket.emit('diaryData', diaryData);
    });
});


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
