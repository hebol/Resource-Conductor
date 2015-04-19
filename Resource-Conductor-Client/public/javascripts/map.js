var mapTimeSocket,
    mapEventSocket,
    mapResourceSocket,
    mapLogSocket;


var updateReport = function() {
    if (mapLogSocket && !$('#report').is(":visible")) {
        $('#reportTable').dataTable().fnClearTable();
        console.log('querying for reports', new Date());
        mapLogSocket.emit('queryCaseStatus');
    }
};

var logPrototype = {
    priority:   "-",
    address:    "-",
    id:         "-",
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

$(document).ready(function() {
    // Initialize the map and add it to the map-canvas
    initMap(57.70, 11.95);

    var reportTable =$("#reportTable")
        .dataTable({columns: [
            { data: 'priority'   },
            { data: 'id'         },
            { data: 'address'    },
            { data: 'received'   },
            { data: 'assigned'   },
            { data: 'accepted'   },
            { data: 'arrived'    },
            { data: 'loaded'     },
            { data: 'atHospital' },
            { data: 'finished'   }
        ]});


    var formatTime = function (milliseconds) {
        var seconds = Math.round(milliseconds/1000);
        var minutes = Math.floor(seconds / 60);
        var result  = "";
        if (minutes > 0) {
            result = result + minutes + "min ";
        }
        result = result + (seconds % 60) + "s";
        return result;
    };

    var calculateStatistics = function(cases) {
        $("#averageTable tbody").empty();
        var statistics = {};
        var ref        = ['assignedTime',
                          'acceptedTime',
                          'arrivedTime',
                          'loadedTime',
                          'atHospitalTime',
                          'finishedTime'];


        for (var aCase in cases) {
            for (var i in ref) {
                var key = ref[i];
                if (cases[aCase].hasOwnProperty(key)) {

                    // MIN
                    if (statistics.hasOwnProperty(key) && typeof statistics[key]['min'] !== 'undefined') {
                        statistics[key]['min'] = Math.min(statistics[key]['min'], cases[aCase][key]);
                    } else {
                        statistics[key] = {};
                        statistics[key]['min'] = cases[aCase][key];
                    }


                    // MAX
                    if (statistics.hasOwnProperty(key) && typeof statistics[key]['max'] !== 'undefined') {
                        statistics[key]['max'] = Math.max(statistics[key]['max'], cases[aCase][key]);
                    } else {
                        statistics[key]['max'] = cases[aCase][key];
                    }

                    //LIST FOR AVERAGE
                    if (statistics.hasOwnProperty(key) && typeof statistics[key]['average'] !== 'undefined') {
                        statistics[key]['average'].push(cases[aCase][key]);
                    } else {
                        statistics[key]['average'] = [cases[aCase][key]];
                    }
                }
            }
        }

        for (var key in statistics) {
            var value = statistics[key];

            var sum = 0;
            for  (var i in value['average']) {
                sum += value['average'][i];
            }

            value['average'] = Math.round(sum / value['average'].length);
        }

        var minRow = "";
        var avgRow = "";
        var maxRow = "";
        for (var i in ref) {
            var key = ref[i];
            if (typeof statistics[key] !== 'undefined') {
                minRow = minRow + "<td>" + formatTime(statistics[key]['min'])     + "</td>";
                avgRow = avgRow + "<td>" + formatTime(statistics[key]['average']) + "</td>";
                maxRow = maxRow + "<td>" + formatTime(statistics[key]['max'])     + "</td>";
            } else {
                minRow = minRow + "<td>-</td>";
                avgRow = avgRow + "<td>-</td>";
                maxRow = maxRow + "<td>-</td>";
            }
        }
        $("#averageTable tbody").append("<tr><td>MIN</td>"     + minRow + "</tr>");
        $("#averageTable tbody").append("<tr><td>AVERAGE</td>" + avgRow + "</tr>");
        $("#averageTable tbody").append("<tr><td>MAX</td>"     + maxRow + "</tr>");

        console.log(statistics);
    };

    registerConsumer('log-service', function(service) {
        console.log('will connect to log-service', service.url);
        if (mapLogSocket == null) {
            mapLogSocket = io.connect(service.url);
            mapLogSocket.on('caseStatus', function(cases) {
                console.log('has received cases', cases, 'on', mapLogSocket.id);
                for (var aCase in cases) {
                    if (cases[aCase].hasOwnProperty('received') && cases[aCase].received) {
                        cases[aCase].received = dateUtil.getDateTime(new Date(cases[aCase].received));
                    }
                    reportTable.fnAddData((merge(Object.create(logPrototype), cases[aCase])));
                }
                calculateStatistics(cases);
            });
        }
    });

    // Subscribe to time updates
    registerConsumer('time-service', function(service) {
        if (mapTimeSocket == null) {
            mapTimeSocket = io.connect(service.url);
            mapTimeSocket.on('time', function (data, type) {
                var date = new Date(data);
                $("#clock").html(dateUtil.getTime(date));
                $("#day").html(dateUtil.getDate(date));
                if (type == 'set') {
                    $("#newTime").val(date.toJSON().slice(0, 19));
                    clearResourceAndEventData();
                    clearMapMarkers();
                    $('#reportTable').dataTable().fnClearTable();
                    $("#averageTable tbody").empty();
                }
            });
        }
    });

    // Subscribe to event updates
    registerConsumer('event-service', function(service) {
        if (mapEventSocket == null) {
            mapEventSocket = io.connect(service.url);
            mapEventSocket.on('event', function (data) {
                console.log('Will create marker for', data);
                createOrUpdateMarker(data,  data.index, data.address, "event", EVENT_Z);
            });
        }
    });

    // Subscribe to event updates
    registerConsumer('resource-service', function(service) {
        if (mapResourceSocket == null) {
            mapResourceSocket = io.connect(service.url);
            mapResourceSocket.on('resourcesUpdated', function (data) {
                data.forEach(function(resource) {
                    if (resource.type === "S") {
                        createOrUpdateMarker(resource, resource.name, resource.area, "station", STATION_Z);
                    } else if (resource.type === "A") {
                        createOrUpdateMarker(resource, resource.name + ' (' + resource.status + ')', resource.homeStation, "ambulance", AMBULANCE_Z);
                    }
                });
            });
        }
    });
});
