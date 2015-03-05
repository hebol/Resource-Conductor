var mapMarkers = [];
var mapOptions;
var map;

var initMap = function(latitude, longitude) {
    mapOptions = {
        zoom:           13,
        center:         new google.maps.LatLng(latitude, longitude),
        mapTypeId:      google.maps.MapTypeId.ROADMAP,
        mapTypeControl: true,
        mapTypeControlOptions: {
            style:    google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: google.maps.ControlPosition.BOTTOM_RIGHT
        },
        panControl: true,
        panControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM
        },
        zoomControl: true,
        zoomControlOptions: {
            style:    google.maps.ZoomControlStyle.LARGE,
            position: google.maps.ControlPosition.RIGHT_BOTTOM
        },
        scaleControl:      true,
        streetViewControl: false
    };

    map = map || new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
};


var toLatLng = function(latitude, longitude) {
    return new google.maps.LatLng(latitude, longitude);
};


var createOrUpdateMarker = function(object, title, infoText, type) {
    var pos;
    if (object.hasOwnProperty('latitude')) {
        pos = toLatLng(object.latitude, object.longitude);
    } else {
        console.log("No position for: ", object);
    }

    var marker = mapMarkers[type + object.id];

    if (!marker) {
        marker = new google.maps.Marker({position: pos, map: map});

        if (infoText) {
            if (marker.hasOwnProperty('infoListener')) {
                google.maps.event.addListener(marker['infoListener']);
            }

            marker['infoListener'] = google.maps.event.addListener(marker, 'click', function() {
                var infoWindow;
                (function() {
                    infowindow = infoWindow || new google.maps.InfoWindow({content: infoText});
                    infowindow.open(map, marker);
                })();
            });
        }
    } else {
        marker.setPosition(pos);
    }

    marker.setTitle(title);
    //marker.setIcon("<awesome and relevant icon>");

    mapMarkers[type + object.id] = marker;

    return marker;
};

