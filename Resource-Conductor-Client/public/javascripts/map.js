var timeSocket;
var eventSocket;
var resourceSocket;

$(document).ready(function() {
    // Initialize the map and add it to the map-canvas
    initMap(57.70, 11.95);


    // Subscribe to time updates
    if (timeSocket == null) {
        registerConsumer('time-service', function(service) {
            timeSocket = io.connect(service.url);
            timeSocket.on('time', function (data, type) {
                var date = new Date(data);
                $("#clock").html(dateUtil.getTime(date));
                $("#day").html(dateUtil.getDate(date));
                if (type == 'set') {
                    console.log("Trying to set value");
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
                console.log(data);
                createOrUpdateMarker(data,  "Event-" + data.id, data.address, "event");
            });
        });
    }

    // Subscribe to event updates
    if (resourceSocket == null) {
        registerConsumer('resource-service', function(service) {
            resourceSocket = io.connect(service.url);
            resourceSocket.on('resourcesUpdated', function (data) {
                console.log(data);
                data.forEach(function(resource) {
                    (function() {
                        if (resource.type === "S") {
                            createOrUpdateMarker(resource, resource.name, resource.area, "station");
                        } else if (resource.type === "A") {
                            createOrUpdateMarker(resource, resource.name, resource.homeStation, "ambulance");
                        }
                    })();
                });
            });
        });
    }
});
