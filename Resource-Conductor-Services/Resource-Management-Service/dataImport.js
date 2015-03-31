var parse = require('csv-parse');
var fs = require('fs');
var iconv = require('iconv-lite');

module.exports = function() {
    var result = {

    };

    return result;
};

function readFile(parser, filename) {
    var filename = __dirname + '/../data/' + filename;
    console.log('Will open file in', filename);
    var readStream = fs.createReadStream(filename);
    var converterStream = iconv.decodeStream('latin1');
    readStream.pipe(converterStream).pipe(parser);
}
var readCases = function() {
    var parser = parse({delimiter: ';', relax: true, columns: ['CallCenterId','CaseFolderId','CaseId',
        'CreatedTime', 'FinishedTime','PreOrdered','PickupTime','CasePriority',
        'CaseIndex1Name','CaseIndex2Name','latitude','longitude']}, function(err, data) {
        err && console.log('err', err);
        console.log('data', data);
    });
    readFile(parser, 'Hack_Case_2014-01-01.txt');
};
var readLog = function() {
    var parser = parse({delimiter: ';', relax: true, columns: ['CallcenterId','CaseFolderId','CaseId','OrderNo','CreatedTime','LogText']}, function(err, data) {
        err && console.log('err', err);
        console.log('data', data);
    });
    readFile(parser, 'Hack_Log_2014-01-01.txt');
};

var readMissions= function() {
    var parser = parse({delimiter: ';', relax: true, columns: ['CallcenterId','CaseFolderId','CaseId','MissionStarted','FinishedTime','ResourceCode','StationCode','FalseAlarm']}, function(err, data) {
        err && console.log('err', err);
        console.log('data', data);
    });
    readFile(parser, 'Hack_Mission_2014-01-01.txt');
};

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

readMissions();
readCases();
readLog();