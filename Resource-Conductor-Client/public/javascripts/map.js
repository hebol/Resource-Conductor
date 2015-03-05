var timeSocket;
var eventSocket;

$(document).ready(function() {
    // Initialize the map and add it to the map-canvas
    initMap(57.70, 11.95);


    // Subscribe to time updates
    if (timeSocket == null) {
        registerConsumer('time-service', function(service) {
            timeSocket = io.connect(service.url);
            timeSocket.on('time', function (data) {
                var date = new Date(data);
                $("#clock").html(dateUtil.getTime(date));
                $("#day").html(dateUtil.getDate(date));
            });
        });
    }

    // Subscribe to event updates
    if (eventSocket == null) {
        registerConsumer('event-service', function(service) {
            eventSocket = io.connect(service.url);
            eventSocket.on('event', function (data) {
                console.log(data);
                createOrUpdateMarker(data,  "Event-" + data.id, data.address, "Event");
            });
        });
    }
});
