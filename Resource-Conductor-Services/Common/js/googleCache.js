const fs       = require('fs'),
      polyUtil = require('polyline-encoded');

module.exports = function(dataDir) {
    return {
        dataFileExists: function (filename, callback) {
            return fs.exists(filename, callback);
        },

        loadDataFile: function (filename, callback) {
            //console.log('loading data file', filename);
            fs.readFile(filename, 'utf8', function (err, data) {
                if (err) {
                    throw err;
                }
                callback && callback(JSON.parse(data));
            });
        },

        writeDataFile: function (filename, data) {
            function writeFile() {
                console.log('Will generate file', filename);
                fs.writeFile(filename, JSON.stringify(data))
            }

            fs.exists(dataDir, function (exists) {
                if (exists) {
                    writeFile();
                } else {
                    fs.mkdir(dataDir, writeFile);
                }
            });
        },
        posToFilename: function (start, stop) {
            function toFilename(pos1, pos2) {
                var result = dataDir + '/' + pos1.latitude + '_' + pos1.longitude;
                if (pos2) {
                    result += '_' + pos2.latitude + '_' + pos2.longitude;
                }
                return result + ".json";
            }

            return toFilename(start, stop);
        },

        convertGoogleRoute: function (routes) {
            var steps = [];
            if (routes.length == 1) {
                var route = routes[0];

                //console.log('There are', route.legs.length, 'parts');
                var duration = 0, distance = 0;
                route.legs.forEach(function (leg) {
                    //console.log('looking at', leg.start_address, 'to', leg.end_address);
                    var partDur = 0;
                    leg.steps.forEach(function (step) {
                        var positions = polyUtil.decode(step.polyline.points);
                        //console.log('working with', step, duration, partDur);
                        for (var i = 0; i < positions.length - 1; i++) {
                            var calcDur = duration + partDur + (i * step.duration.value) / positions.length;
                            //console.log('dur', duration, 'part:', partDur, 'i', i, 'posLen:', positions.length, '=>', calcDur)
                            var timedStep = {
                                time: calcDur,
                                latitude: positions[i][0],
                                longitude: positions[i][1]
                            };
                            steps.push(timedStep);
                        }
                        //console.log('dist', step.distance.value, 'dur', step.duration.value, 'pos', positions.length);
                        partDur += step.duration.value;
                    });
                    duration += leg.duration.value;
                    distance += leg.distance.value;
                });
                console.log('Total duration', duration, 'and length', distance);
                //steps.forEach(function(step) { console.log('step', step)});
            } else {
                console.error('Should be one route', routes);
            }
            return steps;
        }
    };
};

