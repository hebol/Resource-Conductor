var parse = require('csv-parse');
var fs = require('fs');
var iconv = require('iconv-lite');

module.exports = function() {
    var result = {

    };

    return result;
};

var readFile = function(parser, filename) {
    var filename = __dirname + '/../data/' + filename;
    console.log('Will open file in', filename);
    var readStream = fs.createReadStream(filename);
    var converterStream = iconv.decodeStream('latin1');
    readStream.pipe(converterStream).pipe(parser);
};

var readCases = function(callback) {
    var parser = parse({delimiter: ';', relax: true, columns: ['CallCenterId','CaseFolderId','CaseId',
        'CreatedTime', 'FinishedTime','PreOrdered','PickupTime','CasePriority',
        'CaseIndex1Name','CaseIndex2Name','latitude','longitude']}, function(err, data) {
        err && console.log('err', err);
        !err && callback && callback(data);
    });
    readFile(parser, 'Hack_Case_2014-01-01.txt');
};

var readMissions= function(callback) {
    var parser = parse({delimiter: ';', relax: true, columns: ['CallCenterId','CaseFolderId','CaseId','MissionStarted','FinishedTime','ResourceCode','StationCode','FalseAlarm']}, function(err, data) {
        err && console.log('err', err);
        !err && (result = data) && console.log('read', result.length, 'entries');
        !err && callback && callback(data);
    });
    readFile(parser, 'Hack_Mission_2014-01-01.txt');
};

var logList;
var readLog = function(callback) {
    var parser = parse({delimiter: ';', relax: true, columns: ['CallCenterId','CaseFolderId','CaseId','OrderNo','CreatedTime','LogText']}, function(err, data) {
        err && console.log('err', err);
        logList = data;
        !err && callback && callback(data);
    });
    readFile(parser, 'Hack_Log_2014-01-01.txt');
};

var read = function(filename, callback) {
    fs.readFile(filename, 'iso-8859-1', function (err, data) {
        if (err) { throw err;}
        data = JSON.parse(data);

        stations = data.stations;
        units    = model.Unit(data.units);
        //console.log('converted', data.units, 'into', units);
        console.log('Has read data file', filename, stations.length, 'stations and', units.length, 'ambulances');
        callback && callback(data);
    });
};

var findMission = function (list, CallCenterId, CaseFolderId, CaseId) {
    var result = list.filter(function(mission){ return mission.CallCenterId == CallCenterId && mission.CaseFolderId == CaseFolderId && mission.CaseId == CaseId;});
    result =  (result.length == 1) ? result[0] : null;
    !result && console.log('Could not find find', CallCenterId, CaseFolderId, CaseId);
    return result;
};

var mergeToLast = function (first, last) {
    for (var attrname in first) {
        last[attrname] = first[attrname];
    }
};

var missionList;

readMissions(function(missions) {
    console.log('Has read', missions.length, 'missions');
    readCases( function(cases) {
        console.log('Has read', cases.length, 'cases');
        cases.forEach(function(aCase){
            var mission = findMission(missions, aCase.CallCenterId, aCase.CaseFolderId, aCase.CaseId);
            mission && mergeToLast(aCase, mission);
            !mission && missions.push(aCase);
        });
        //missions.forEach(function(mission) {console.log(mission);});
        console.log('Now', missions.length, 'missions');
        missionList = missions;
    });
});

readLog(function(logs) {
    console.log('Has read', logs.length, 'logs');
});

var findLog = function (list, aMission, time) {
    var result = null;
    list.forEach(function(log) {
       if (log.CaseFolderId == aMission.CaseFolderId && log.CallCenterId == aMission.CallCenterId) {
           if (Date.parse(log.CreatedTime) <= time.getTime()) {
               if (result == null || result.CreatedTime < log.CreatedTime) {
                   result = log;
               }
           }
       }
    });
    return result;
};

var getStatus = function(time) {
    var active = [];
    missionList.forEach(function(mission) {
        if (((new Date(mission.CreatedTime)).getTime() <= time.getTime()) &&
            (new Date(mission.FinishedTime).getTime() > time.getTime())) {
            var log = findLog(logList, mission, time);
            console.log('(', mission.CaseFolderId, ')', mission.CreatedTime, '<', time, '<', mission.FinishedTime, '=>', log && (log.LogText + ' (' + log.CreatedTime + ')'));
            active.push(mission);
        }
    });
    console.log('Has found', active.length, 'active cases');
};

setTimeout(function() {
    getStatus(new Date(Date.parse('2014-01-01 10:00:00')));
}, 500);
