var timeSocket;
var eventSocket;
var resourceSocket;

$(document).ready(function() {
    // Initialize the map and add it to the map-canvas
    initMap(57.70, 11.95);

    var reportTable = $("#reportTable").dataTable({columns: [{ data: 'id' }, { data: 'name' }, { data: 'area' }]});

    /*
    $("#eventList").selectable().selectable({
        selected: function( event, ui ) {
            setSelectedCase(event);
        }
    });
    */
//    $("#unit-list").selectable();


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
                            reportTable.fnAddData(resource);
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
