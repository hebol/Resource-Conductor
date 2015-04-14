var parse = require('csv-parse');
var fs = require('fs');
var iconv = require('iconv-lite');

var dir = '/Users/martin/Dropbox/LSP/Hackaton/Hack_Case_2014-12-31/';


module.exports = function() {
    var result = {

    };

    return result;
};

var readFile = function(parser, filename) {
//    var filename = __dirname + '/../data/' + filename;
    var filename = dir + filename;
    console.log('Will open file in', filename);
    var readStream = fs.createReadStream(filename);
    var converterStream = iconv.decodeStream('latin1');
    readStream.pipe(converterStream).pipe(parser);
};

var readFiles = function(callback, index, files) {
    var parser = parse({delimiter: ';', relax: true, columns: ['CallCenterId','CaseFolderId','CaseId',
        'CreatedTime', 'FinishedTime','PreOrdered','PickupTime','CasePriority',
        'CaseIndex1Name','CaseIndex2Name','latitude','longitude']}, function(err, data) {
        err && console.log('err', err);
        !err && callback && callback(data);
    });
    if (index < files.length) {
        var file = files[index];
        if (file.indexOf('.txt') >= 0) {
            readFile(parser, file);
        }
        setTimeout(function() { readFiles(callback, index + 1, files)}, 50);
    }
};

var readCases = function(callback) {
    fs.readdir(dir, function(err, files) {
        readFiles(callback, 0, files);
    });
//    readFile(parser, 'Hack_Case_2014-01-01.txt');
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
var indexMap = {};

readCases(function(cases) {
    cases.forEach(function(aCase){
        indexMap[aCase.CaseIndex2Name] = aCase.CaseIndex2Name;
    });
    console.log('has read', cases.length, 'cases', Object.keys(indexMap));
});


//readMissions(function(missions) {
//    console.log('Has read', missions.length, 'missions');
//    readCases( function(cases) {
//        console.log('Has read', cases.length, 'cases');
//        cases.forEach(function(aCase){
//            var mission = findMission(missions, aCase.CallCenterId, aCase.CaseFolderId, aCase.CaseId);
//            mission && mergeToLast(aCase, mission);
//            !mission && missions.push(aCase);
//        });
//        //missions.forEach(function(mission) {console.log(mission);});
//        console.log('Now', missions.length, 'missions');
//        missionList = missions;
//    });
//});
//
//readLog(function(logs) {
//    console.log('Has read', logs.length, 'logs');
//});

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

//setTimeout(function() {
//    getStatus(new Date(Date.parse('2014-01-01 10:00:00')));
//}, 500);
