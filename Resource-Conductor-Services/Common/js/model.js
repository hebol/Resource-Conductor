var routeHandling = require('./routeHandling.js');
var unitMap = {};

function getUnit(id) {
    return unitMap[id];
}

function addUnit(unit) {
    return unitMap[unit.id] = unit;
}

function processRouteForId(id, route) {
    console.log("Received route for id", id, "==>", route);
    //console.log(JSON.stringify(route));
    var steps = routeHandling.convertGoogleRoute(route.routes);

    var unit = getUnit(id);
    unit.route.steps = steps;
    if (!unit.atSiteTime) {
        unit.atSiteTime = new Date(unit.acknowledgedTime.getTime() + steps[steps.length - 1].time * 1000);
        unit.loadedTime = new Date(unit.atSiteTime.getTime() + 10 * 60 * 1000);
        unit.route.startTime = unit.acknowledgedTime;
    } else {
        unit.atHospitalTime = new Date(unit.loadedTime.getTime() + steps[steps.length - 1].time * 1000);
        unit.route.startTime = unit.loadedTime;
    }
}

var routeConsumer = require('./serviceConsumer')('route-service', process.title,
    {
        'routeForId': processRouteForId
    },
    true
);

function moveUnitForTime(unit, time) {
    // console.log('unit', unit.name, unit.routing);
    var result = null;
    if (time) {
        //console.log('looking at unit', unit, 'for move');
        var elapsedTime = (time.getTime() - unit.route.startTime.getTime()) / 1000;
        if (elapsedTime > 0 && unit.route.steps.length >= 0) {
            console.log('Will move', unit.name, 'steps(', unit.route.steps.length, ')', elapsedTime);
            for (var i = unit.route.steps.length - 1 ; i >= 0 ; i--) {
                var aStep = unit.route.steps[i];
                if (elapsedTime > aStep.time) {
                    //console.log('Will move', unit.name, 'to', aStep);

                    unit.latitude = aStep.latitude;
                    unit.longitude = aStep.longitude;
                    result = unit;
                    if (i == unit.route.steps.length - 1) {
                        console.log('Vehicle', unit.name, 'moved to target location');
                        unit.route.steps = [];
                    }
                    break;
                }
            }
        } else {
            console.log('Unit', unit.name, 'is out of time');
        }
    }
    return result;
}


var copyProperties = function(src, dest) {
    for (var key in src) {
        if (src.hasOwnProperty(key)) {
            dest[key] = src[key];
        }
    }
};


var Unit = function(args) {
    var that    = this;
    that.id     = -1;
    that.type   = 'A';
    that.status = 'K';
    that.route  = {
        startTime: null,
        steps: null
    };
    that.assignedTime = null;
    that.acknowledgedTime = null;
    that.atSiteTime = null;
    that.loadedTime = null;
    that.atHospitalTime = null;
    that.currentCase = null;

    if (args.constructor === Array) {
        args.forEach(function(unit, index, list){
            list[index] = new Unit(unit);
        });
        return args;
    } else {
        copyProperties(args, this);
    }

    that.atSite = function() {
        that.status = 'F';
        that.route.steps = null;
    };

    that.moveToCase = function() {
        that.route.steps = null;
        that.status = 'U';
        routeConsumer.emit('getRouteForId', that, that.currentCase, that.id);
    };

    that.moveToHospital = function() {
        that.route.startTime = that.loadedTime;
        that.route.steps = null;
        that.status = 'L';

        var hospital = {
            latitude: 57.683088,
            longitude: 11.959884
        };
        routeConsumer.emit('getRouteForId', that, hospital, that.id);
    };

    that.assignCase = function(aCase, time) {
        console.log('unit', that.name, 'asked to go to', aCase, 'at', time);
        addUnit(that);
        that.status = 'T';
        that.assignedTime = time;
        that.acknowledgedTime = new Date(time.getTime() + 30 * 1000);
        that.currentCase = aCase;
    };

    that.time = function(time, type) {
        var result = false;

        if (type == 'tick') {
            switch(that.status) {
                case 'K':
                    break;
                case 'T':
                    console.log('T =>', time, that.acknowledgedTime);
                    if (time.getTime() > that.acknowledgedTime.getTime()) {
                        that.moveToCase();
                        result = true;
                    }
                    break;
                case 'U':
                    if (that.atSiteTime && time.getTime() > that.atSiteTime.getTime()) {
                        that.atSite();
                    }
                    break;
                case 'F':
                    if (time.getTime() > that.loadedTime.getTime()) {
                        that.moveToHospital();
                    }
                    break;
            }
            if (that.hasRoute()) {
                //console.log('Will move', that.name);
                result = moveUnitForTime(that, time);
            }
        } else {
            that.route.startTime = time;
        }
        return result;
    };

    that.hasRoute = function() {
        return that.route && that.route.steps && that.route.steps.length > 0;
    };

    return that;
};

module.exports = {
    Unit: Unit
};