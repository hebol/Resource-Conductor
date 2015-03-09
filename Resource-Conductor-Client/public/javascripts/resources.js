var socket, $events;

var createCaseListItem = function(myCase) {
    //console.log("Will create item for case:", myCase);
    var getStatusColor = function() {
        return 'light-grey-gradient';
    };
    var getSortValue = function (anEvent) {
        return anEvent.casepriority + "." + (1 - ("0." + new Date(anEvent.time).getTime()));
    };
    var $li       = $('<li>', {class:getStatusColor(), id:'event-'+myCase.id, sortvalue: getSortValue(myCase)});
    var $case     = $('<div>', {class:'case'}).on("click",function() {
        selectCase(myCase, false);
    });
    //
    //var $i        = $('<i/>', {class:'fa fa-play'}).on('click',function() {
    //    selectCase(myCase, true);
    //});

    var $caseType = $('<div>', {class:'case-type',      text:myCase.prio});
    var $title    = $('<div>', {class:'title ellipsis', text:myCase.address});
    var $time1    = $('<div>', {class:'time-1',         text:dateUtil.getTime(new Date(myCase.time))});
    var $nl       = $('<br/>');
    var $desc     = $('<div>', {class:'desc',           text:myCase.index});

    $case.append($caseType);
    $case.append($title);
    $case.append($time1);
    $case.append($nl);
    $case.append($desc);

    //$case.append($('<div>', {class:'alloc'}));
    //updateCaseDivWithUsers($case, myCase);

    $li.append($case);
    //$li.append($i);

    return $li;
};

var createUserListItem = function(aUnit) {
    var getStatusColor = function() {
        return 'light-blue-gradient';
    };
    var $li       = $('<li>', {class:getStatusColor(), id:'unit-'+aUnit.id});
    var $user = $('<div>', {class:'unit'}).on("click",function() {
        setSelected($(this).parent(), 'unitSelected');
    });
    var $nl1       = $('<br/>');
    var $nl2       = $('<br/>');
    //var $nl3       = $('<br/>');

    var $status  = $('<div>', {class:'status'});

    switch (aUnit.status) {
        case "K":
            $status  = $('<div>', {class:'status available', text:'T'});
            break;
        case "T":
            $status  = $('<div>', {class:'status transport', text:'T'});
            break;
        case "U":
            $status  = $('<div>', {class:'status accepted', text:'U'});
            break;
        case "F":
            $status  = $('<div>', {class:'status arrived', text:'F'});
            break;
        case "L":
            $status  = $('<div>', {class:'status loaded', text:'L'});
            break;
        case "S":
            $status  = $('<div>', {class:'status hospital', text:'S'});
            break;
        case "H":
            $status  = $('<div>', {class:'status homebound', text:'H'});
            break;
        default:
            break;
    }

    var $name       = $('<div>', {class:'unitName',    text:aUnit.name});
    //var $phone      = $('<div>', {class:'phoneNumber', text:aUnit.phoneNumber});
    //var $statusTime = $('<div>', {class:'w-title',     text:getLastTimestamp(aUnit)});
    //var $eta        = $('<div>', {class:'eta',         text:durationToString(aUnit.duration)});
    var $locate     = $('<i>',   {class:'locate fa fa-male fa-2x'}).on('click', function() {
        panMapToUser(aUnit);
    });
    //var $actionButton;
    //if (aUnit.queryStatus) {
    //    $actionButton   = $('<i>', {class:'notify fa fa-trash-o fa-2x'}).on('click', function(){
    //        removeUserFromCase(aUnit.id, currentCase.id);
    //    });
    //} else {
    //    if (currentCase) {
    //        $actionButton   = $('<i>', {class:'notify fa fa-mobile-phone fa-2x'}).on('click', function(){
    //            allocateUserForCase(aUnit.id, currentCase.id);
    //        });
    //    }
    //}

    $user.append($status);
    $user.append($name);
    //$user.append($phone);
    $user.append($nl1);
    //$statusTime.append($nl3);
    //$statusTime.append($eta);
    //$user.append($statusTime);
    //$user.append($actionButton);
    $user.append($locate);
    $user.append($nl2);

    $li.append($user);

    return $li;
};


$(document).ready(function() {
    $events = $('#eventList');
    $units = $('#unitList');

    registerConsumer('event-service', function(service) {
        socket = io.connect(service.url);
        socket.on('connect', function () {
            $events.empty();
        });
        socket.on('event', function (event) {
            $events.append(createCaseListItem(event));
        });
    });

    registerConsumer('resource-service', function(service) {
        socket = io.connect(service.url);
        socket.on('connect', function () {
            console.log("Connected to resource service");
            $units.empty();
        });
        socket.on('resourcesUpdated', function (resources) {
            var ambulances = resources.filter(function(resource) {return resource.type == 'A';});
            console.log("Received", resources.length, "resources found", ambulances.length, "ambulances.")
            ambulances.forEach(function(ambulance){
                $units.append(createUserListItem(ambulance));
            });
        });
    });
});
