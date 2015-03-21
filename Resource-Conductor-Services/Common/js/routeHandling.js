const routeDir = 'routes';
var fs = require('fs');

module.exports = {
    dataFileExists: function (filename, callback) {
        return fs.exists(filename, callback);
    },

    loadDataFile: function (filename, callback) {
        console.log('loading route file', filename);
        fs.readFile(filename, 'utf8', function (err, data) {
            if (err) {
                throw err;
            }
            callback && callback(JSON.parse(data));
        });
    },

    writeDataFile: function (filename, route) {
        console.log('Hello', filename);
        function writeFile() {
            console.log('Will generate file', filename);
            fs.writeFile(filename, JSON.stringify(route))
        }

        fs.exists(routeDir, function (exists) {
            if (exists) {
                writeFile();
            } else {
                fs.mkdir(routeDir, writeFile);
            }
        });
    },
    posToFilename: function (start, stop) {
        function toFilename(pos1, pos2) {
            return routeDir + '/' + pos1.latitude + '_' + pos1.longitude + '_' + pos2.latitude + '_' + pos2.longitude + ".json";
        }

        return toFilename(start, stop);
    }

};

