function LongPress(map, length) {
    this.length_  = length;
    var me        = this;
    me.map_       = map;
    me.timeoutId_ = null;

/*    google.maps.event.addListener(map, 'mousedown', function(e) {
        me.onMouseDown_(e);
    });
    google.maps.event.addListener(map, 'mouseup', function(e) {
        me.onMouseUp_(e);
    });
    google.maps.event.addListener(map, 'drag', function(e) {
        me.onMapDrag_(e);
    });*/
}

var map;

$(document).ready(function() {
    var mapOptions = {
        zoom: 13,
        center: new google.maps.LatLng(57.70, 11.95),
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: true,
        mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: google.maps.ControlPosition.BOTTOM_RIGHT
        },
        panControl: true,
        panControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM
        },
        zoomControl: true,
        zoomControlOptions: {
            style: google.maps.ZoomControlStyle.LARGE,
            position: google.maps.ControlPosition.RIGHT_BOTTOM
        },
        scaleControl: true,
        streetViewControl: false
    };

    map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

    new LongPress(map, 300);

    google.maps.event.addListener(map, 'longpress', function(event) {
        getAddressForPosition(event.latLng, createCaseDialog);
    });
});
