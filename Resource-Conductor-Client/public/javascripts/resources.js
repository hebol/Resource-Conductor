var eventSocket, resourceSocket, $events, $units;

function toList(aMap) {
    var result = [];
    for (var id in aMap) {
        if (aMap.hasOwnProperty(id)) {
            result.push(aMap[id]);
        }
    }
    return result;
}


var clearResourceAndEventData = function() {
    selectedCase = null;
    selectedUnit = null;
    unitList     = {};
    eventList    = {};
    $events && $events.empty();
    $units && $units.empty();
};

var selectedCase = null;

var clearSelectedUnits = function() {
    if (selectedUnit !== null) {
        $("#unit-"+selectedUnit).toggleClass("selected-unit");
    }
    selectedUnit = null;
};

var createCaseListItem = function(myCase) {
    var getStatusColor = function() {
        return 'none';
    };
    var getSortValue = function (anEvent) {
        return anEvent.prio + "." + (1 - ("0." + new Date(anEvent.time).getTime()));
    };

    var id    = 'event-'+myCase.id;
    var $li   = $('<li>', {class:getStatusColor(), id:id, sortvalue: getSortValue(myCase)});
    var $case = $('<div>', {class:'case'}).on("click",function() {
        panMapToObject(myCase);
        clearSelectedUnits();
        if (selectedCase !== null) {
            $("#event-"+selectedCase).toggleClass("selected-case");
        }
        selectedCase = myCase.id;
        $("#event-"+selectedCase).toggleClass("selected-case");
        setSelectedCase(myCase);
    });

    var $caseType = $('<div>', {class:'case-type',      text:myCase.prio});
    var $title    = $('<div>', {class:'title ellipsis', text:myCase.address});
    var $time1    = $('<div>', {class:'time-1',         text:dateUtil.getTime(new Date(myCase.time))});
    var $time2    = $('<div>', {class:'time-2',         text:dateUtil.getTime(new Date(myCase.time2))});
    var $nl       = $('<br/>');
    var $desc     = $('<div>', {class:'desc',           text:myCase.index});

    $case.append($caseType);
    $case.append($title);
    $case.append($time1);
    $case.append($nl);
    $case.append($desc);
    if (myCase.time2 !== '') {
        $case.append($time2);
    }

    $li.append($case);

    return $li;
};

var setSelectedCase = function (aCase) {
    $units.empty();
    for (var unitId in unitList) {
        var unit = unitList[unitId];
        $units.append(createUnitListItem(unit, aCase, shallWeHideUnit(aCase.id, unitId)));
    }

    var listItems = $units.children('li').get();
    listItems.sort(function(a, b) {
        return $(a).attr('distance') - $(b).attr('distance');
    });
    $.each(listItems, function(idx, itm) { $units.append(itm); });
};

function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
    var deg2rad = function(deg) {
        return deg * (Math.PI/180);
    };
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
}

var calculateDistance = function (aUnit, anEvent) {
    var distance = getDistanceFromLatLonInKm(aUnit.latitude, aUnit.longitude, anEvent.latitude, anEvent.longitude);
    return Math.round(distance * 100) / 100;
};

var assignResourceToCase = function (aUnit, anEvent) {
    eventSocket.emit('assignResourceToCase', aUnit.id, anEvent.id);
};

var panMapToObject = function(obj, zoomLevel) {
    map.panTo(toPosition(obj.latitude, obj.longitude));
    if (zoomLevel) {
        map.setZoom(zoomLevel);
    }
};

var selectedUnit = null;
var createUnitListItem = function(aUnit, anEvent, hide) {
    var getStatusColor = function() {
        return 'none';
    };

    var distance = calculateDistance(aUnit, anEvent);
    var $li       = $('<li>', {class:getStatusColor(), id:'unit-'+aUnit.id, distance: distance});
    var $unit = $('<div>', {class:'unit'}).on("click",function() {
        if (aUnit.status === "K") {
            if (selectedUnit !== null) {
                $("#unit-"+selectedUnit).toggleClass("selected-unit");
            }
            selectedUnit = aUnit.id;
            $("#unit-"+selectedUnit).toggleClass("selected-unit");

            assignResourceToCase(aUnit, anEvent);
        }
    });
    var $nl1       = $('<br/>');
    var $nl2       = $('<br/>');

    var $status  = $('<div>', {class:'status'});
    //console.log(aUnit);
    switch (aUnit.status) {
        case "K":
            $status  = $('<div>', {class:'status available', text:'K'});
            break;
        case "T":
            $status  = $('<div>', {class:'status transport', text:'T'});
            break;
        case "U":
            $status  = $('<div>', {class:'status accepted',  text:'U'});
            break;
        case "F":
            $status  = $('<div>', {class:'status arrived',   text:'F'});
            break;
        case "L":
            $status  = $('<div>', {class:'status loaded',    text:'L'});
            break;
        case "S":
            $status  = $('<div>', {class:'status hospital',  text:'S'});
            break;
        case "H":
            $status  = $('<div>', {class:'status homebound', text:'H'});
            break;
        default:
            break;
    }

    var $name       = $('<div>', {class:'unitName',  text:aUnit.name});
    var $updateTime = $('<div>', {class:'w-title',   text:""});
    var $distance   = $('<div>', {class:'distance',  text:distance + " km"});

    var $locate     = $('<i>',   {class:'locate fa fa-male fa-2x'}).on('click', function() {
        panMapToObject(aUnit);
    });

    $unit.append($status);
    $unit.append($name);
    $unit.append($nl1);
    //$statusTime.append($nl3);
    $unit.append($distance);
    //$user.append($actionButton);
    //$user.append($locate);
    $unit.append($nl2);

    $li.append($unit);
    if (hide) {
        $li.hide();
    }

    return $li;
};

var eventList = {};
var unitList = {};

var shallWeHideUnit = function(caseId, unitId) {
    var aCase = eventList[caseId];
    var unit  = unitList[unitId];
    if (caseId) {
        if (aCase.hasOwnProperty("resource")) {
            return (aCase.resource != unitId);
        } else if (unit["status"] != "K") {
            return true;
        }
    }

    return false;
};

$(document).ready(function() {
    $events = $('#eventList');
    $units = $('#unitList');

    registerConsumer('event-service', function(service) {
        eventSocket = io.connect(service.url);
        eventSocket.on('connect', function () {
            $events.empty();
        });
        eventSocket.on('event', function (event) {
            console.log('got event');
            var oldEvent = eventList[event.id];
            eventList[event.id] = event;
            event.div = createCaseListItem(event);
            if (oldEvent) {
                $("#event-"+event.id).replaceWith(event.div);
                if (selectedCase === event.id) {
                    $("#event-"+event.id).addClass("selected-case");
                }
            } else {
                $events.append(event.div);
            }

            if (selectedCase != null) {
                setSelectedCase(eventList[selectedCase]);
            }
        });
    });

    registerConsumer('resource-service', function(service) {
        resourceSocket = io.connect(service.url);
        resourceSocket.on('connect', function () {
            console.log("Connected to resource service");
        });
        resourceSocket.on('resourcesUpdated', function (resources) {
            //console.log(resources);
            var ambulances = resources.filter(function(resource) {return resource.type == 'A';});
            console.log("Received", resources.length, "resources found", ambulances.length, "ambulances.");
            ambulances.forEach(function(ambulance) {
                if (selectedCase != null) {
                    var $unitDiv = createUnitListItem(ambulance, eventList[selectedCase], shallWeHideUnit(selectedCase, ambulance.id));
                    $("#unit-"+ambulance.id).replaceWith($unitDiv);
                }

                unitList[ambulance.id] = ambulance;

                if (selectedUnit === ambulance.id && ambulance.status !== "A") {
                    clearSelectedUnits();
                }
            });
        });
    });
});
