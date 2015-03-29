var parse = require('csv-parse');
var fs = require('fs');

module.exports = function() {
    var result = {

    };

    return result;
};

var readCases = functions() {
    parse({delimiter: ';'})
}

var read = function(filename, callback) {
    fs.readFile(filename, 'iso-8859-1', function (err, data) {
        if (err) { throw err;}
        data = JSON.parse(data);

        //carcounter = 0;
        stations = data.stations;
        units    = model.Unit(data.units);
        //console.log('converted', data.units, 'into', units);
        console.log("Has read data file", filename, stations.length, "stations and", units.length, "ambulances");
        callback && callback(data);
    });
};

