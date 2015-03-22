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
                    console.log('Will move', unit.name, 'to', aStep);

                    unit.latitude = aStep.latitude;
                    unit.longitude = aStep.longitude;
                    result = unit;
                    if (i == unit.route.steps.length - 1) {
                        console.log('Vehicle', unit.name, 'moved to target location');
                        unit.routing = null;
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
    var that = this;
    this.id    = -1;
    this.type  = 'A';
    this.state = 'K';
    this.route = {
        startTime: null,
        steps: null
    };

    if (args.constructor === Array) {
        args.forEach(function(unit, index, list){
            list[index] = new Unit(unit);
        });
        return args;
    } else {
        copyProperties(args, this);
    }

    this.goToCase = function(aCase, time) {
        console.log('unit', that.name, 'asked to go to', aCase, 'at', time);
        that.state = 'U';
        that.route.startTime = time;
        that.route.steps = null;
        addUnit(that);
        routeConsumer.emit('getRouteForId', that, aCase, that.id);
    };

    this.time = function(time, type) {
        var result = false;

        if (type == 'tick' && that.hasRoute()) {
             result = moveUnitForTime(that, time);
        } else {
            that.route.startTime = time;
        }
        return result;
    };
    this.hasRoute = function() {
        return this.route && this.route.steps && this.route.steps.length > 0;
    };
    return this;
};

module.exports = {
    Unit: Unit
};