var mapMarkers = [];
var mapOptions;
var map;

//---------------------------------------------------------------------------
// Initialize the map
//---------------------------------------------------------------------------
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

//---------------------------------------------------------------------------
// Convert input to Google LatLong
//---------------------------------------------------------------------------
var toLatLng = function(latitude, longitude) {
    return new google.maps.LatLng(latitude, longitude);
};


//---------------------------------------------------------------------------
// Add and cache a marker to the map. If a marker exists for the
// "object.id + type" only move it to its new position.
//---------------------------------------------------------------------------
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

            var infowindow = new google.maps.InfoWindow({content: infoText});
            marker['infoListener'] = google.maps.event.addListener(marker, 'click', function() {
                infowindow.open(map, marker);
            });
        }
    } else {
        marker.setPosition(pos);
    }

    marker.setTitle(title);
    //marker.setIcon("<awesome and relevant icon>");

    // Add marker to cache
    mapMarkers[type + object.id] = marker;

    return marker;
};

