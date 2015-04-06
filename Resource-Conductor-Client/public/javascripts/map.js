var timeSocket;
var eventSocket;
var resourceSocket;
var logSocket;


var updateReport = function() {
    if (logSocket && !$('#report').is(":visible")) {
        $("#reportTable tbody").empty();
        logSocket.emit('queryCaseStatus');
    }
};

var logPrototype = {
    priority:   "-",
    address:    "-",
    caseId:     "-",
    received:   "-",
    assigned:   "-",
    accepted:   "-",
    arrived:    "-",
    loaded:     "-",
    atHospital: "-",
    finished:   "-"
};

var merge = function(o1, o2) {
   for (var key in o1) {
       if (o2.hasOwnProperty(key)) {
           o1[key] = o2[key];
       }
   }
    return o1;
};

var updateReport;

$(document).ready(function() {
    // Initialize the map and add it to the map-canvas
    initMap(57.70, 11.95);

    var reportTable =$("#reportTable")
        .dataTable({columns: [
            { data: 'priority'   },
            { data: 'caseId'     },
            { data: 'address'    },
            { data: 'received'   },
            { data: 'assigned'   },
            { data: 'accepted'   },
            { data: 'arrived'    },
            { data: 'loaded'     },
            { data: 'atHospital' },
            { data: 'finished'   }
        ]});

    if (logSocket == null) {
        registerConsumer('log-service', function(service) {
            logSocket = io.connect(service.url);
            logSocket.on('caseStatus', function(cases) {
                for (var aCase in cases) {
                    if (cases[aCase].hasOwnProperty('received') && cases[aCase].received) {
                        cases[aCase].received = dateUtil.getDateTime(new Date(cases[aCase].received));
                    }
                    reportTable.fnAddData((merge(Object.create(logPrototype), cases[aCase])));
                    console.log(cases[aCase]);
                }
            });
        });
    }

    // Subscribe to time updates
    if (timeSocket == null) {
        registerConsumer('time-service', function(service) {
            timeSocket = io.connect(service.url);
            timeSocket.on('time', function (data, type) {
                var date = new Date(data);
                $("#clock").html(dateUtil.getTime(date));
                $("#day").html(dateUtil.getDate(date));
                if (type == 'set') {
                    $("#newTime").val(date.toJSON().slice(0, 19));
                    clearResourceAndEventData();
                    clearMapMarkers();
                    $("#reportTable tbody").empty();
                }
            });
        });
    }

    // Subscribe to event updates
    if (eventSocket == null) {
        registerConsumer('event-service', function(service) {
            eventSocket = io.connect(service.url);
            eventSocket.on('event', function (data) {
                createOrUpdateMarker(data,  data.index, data.address, "event", EVENT_Z);
            });
        });
    }

    // Subscribe to event updates
    if (resourceSocket == null) {
        registerConsumer('resource-service', function(service) {
            resourceSocket = io.connect(service.url);
            resourceSocket.on('resourcesUpdated', function (data) {
                data.forEach(function(resource) {
                    (function() {
                        if (resource.type === "S") {
                            createOrUpdateMarker(resource, resource.name, resource.area, "station", STATION_Z);
                        } else if (resource.type === "A") {
                            createOrUpdateMarker(resource, resource.name + ' (' + resource.status + ')', resource.homeStation, "ambulance", AMBULANCE_Z);
                        }
                    })();
                });
            });
        });
    }
});
