var parse = require('csv-parse');
var fs = require('fs');
var iconv = require('iconv-lite');
var moment = require('moment');

//var dir = '/Users/martin/Dropbox/LSP/Hackaton/Hack_Case_2014-12-31/';
var dir = '../data/';

var processReadData = function (time, result) {
    result.cases.forEach(function(aCase){
        var mission = findMission(result.missions, aCase.CallCenterId, aCase.CaseFolderId, aCase.CaseId);
        mission && mergeToLast(aCase, mission);
        !mission && console.log('Couldn\'t find mission for case', aCase);
    });
    getStatus(time, result);
};

var readDataForTime = function(time, callback) {
    var result = {};
    readMissions(time, function(missions){
        result.missions = missions;
        readCase(time, function(cases) {
            result.cases = cases;
            readLog(time, function(log){
                result.log = log;
                processReadData(time, result);
                callback && callback(result);
            });
        });
    });
};

module.exports = function() {
    var result = {
        readDataForTime: readDataForTime
    };

    return result;
};

var readFile = function(parser, time, base) {
    var filename = dir + base + moment(time).format('YYYY-MM-DD') + '.txt';

    console.log('Will open file in', filename);
    var readStream = fs.createReadStream(filename);
    var converterStream = iconv.decodeStream('latin1');
    readStream.pipe(converterStream).pipe(parser);
};

var readCase = function(time, callback) {
    var parser = parse({delimiter: ';', relax: true, columns: ['CallCenterId','CaseFolderId','CaseId',
        'CreatedTime', 'FinishedTime','PreOrdered','PickupTime','CasePriority',
        'CaseIndex1Name','CaseIndex2Name','latitude','longitude']}, function(err, data) {
        err && console.log('err', err);
        !err && callback && callback(data);
    });
    readFile(parser, time, 'Hack_Case_');
};

var readMissions= function(time, callback) {
    var parser = parse({delimiter: ';', relax: true, columns: ['CallCenterId','CaseFolderId','CaseId','MissionStarted','FinishedTime','ResourceCode','StationCode','FalseAlarm']}, function(err, data) {
        err && console.log('err', err);
        !err && callback && callback(data);
    });
    readFile(parser, time, 'Hack_Mission_');
};

var readLog = function(time, callback) {
    var parser = parse({delimiter: ';', relax: true, columns: ['CallCenterId','CaseFolderId','CaseId','OrderNo','CreatedTime','LogText']}, function(err, data) {
        err && console.log('err', err);
        !err && callback && callback(data);
    });
    readFile(parser, time, 'Hack_Log_');
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

var indexMap = {};

//readCases(function(cases) {
//    cases.forEach(function(aCase){
//        indexMap[aCase.CaseIndex2Name] = aCase.CaseIndex2Name;
//    });
//    console.log('has read', cases.length, 'cases', Object.keys(indexMap));
//});


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

var getStatus = function(time, data) {
    var active = [];
    data.missions.forEach(function(mission) {
        //console.log('looking at mission', mission);
        if (((new Date(mission.CreatedTime)).getTime() <= time.getTime()) &&
            (new Date(mission.FinishedTime).getTime() > time.getTime())) {
            var log = findLog(data.log, mission, time);
            console.log('(', mission.CaseFolderId, ')', mission.CreatedTime, '<', time, '<', mission.FinishedTime, '=>', log && (log.LogText + ' (' + log.CreatedTime + ')'));
            active.push(mission);
        }
    });
    console.log('Has found', active.length, 'active cases');
};

//setTimeout(function() {
//    getStatus(new Date(Date.parse('2014-01-01 10:00:00')));
//}, 500);

module.exports().readDataForTime(new Date('2014-01-01 10:00'), function(result) {
    var info = {
        log: result.log.length,
        missions: result.missions.length,
        cases: result.log.length
    };
   console.log('has read', info);
});