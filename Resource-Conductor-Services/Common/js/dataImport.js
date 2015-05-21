var parse = require('csv-parse');
var fs = require('fs');
var iconv = require('iconv-lite');
var moment = require('moment');

//var dir = '/Users/martin/Dropbox/LSP/Hackaton/Hack_Case_2014-12-31/';
var dir = '../data/';

var processReadData = function (time, result, validUnitNames) {
    result.cases.forEach(function(aCase) {
        var mission = findMission(result.missions, aCase.CallCenterId, aCase.CaseFolderId, aCase.CaseId);
        mission && mergeToLast(aCase, mission);
        if (!mission) {
            aCase.MissionStarted = aCase.CreatedTime;
            result.missions.push(aCase);
            mission = aCase;
            console.log('Couldn\'t find mission for case', aCase);
        }
    });
    getStatus(time, result, validUnitNames);
    result.cases = result.missions.filter(function(aCase) {return new Date(aCase.FinishedTime).getTime() >= time.getTime() && parseInt(aCase.CasePriority) < 4;});
    result.cases.forEach(function(aCase){ aCase.FinishedTime = null;});
    result.missions = null;
    delete result.missions;
};

var logReadResult = function (result, time) {
    var info = {
        logs: result.logs.length,
        cases: result.cases.length
    };
    console.log('Has read', info, 'about', time);
};

var readDataForTime = function(time, validUnitNames, callback) {
    var result = {};
    readMissions(time, function(missions){
        result.missions = missions;
        readCase(time, function(cases) {
            result.cases = cases;
            readLog(time, function(log){
                result.logs = log.filter(function(aLog){ return Date.parse(aLog.CreatedTime) <= time.getTime(); });
                processReadData(time, result, validUnitNames);
                logReadResult(result, time);
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

var getResourceIdFromLog = function (log) {
    var result = null;
    if (log.LogText.indexOf('Lastat') == 0 || log.LogText.indexOf('Larm mot') == 0 || log.LogText.indexOf('Framme') == 0) {
        var len = log.LogText.length;
        result = log.LogText.substring(len - 9, len - 1);
    } else {
        result = log.LogText.substring(0, 8);
    }
    if (!result) {
        console.log('Unable to find a resource id from log text', log.LogText);
    }

    return result;
};

var findLog = function (list, aMission, time, validUnitNames) {
    var result = null;
    list.forEach(function(log) {
       if (log.CaseFolderId == aMission.CaseFolderId && log.CallCenterId == aMission.CallCenterId) {
           if (Date.parse(log.CreatedTime) <= time.getTime()) {
               var resourceId = getResourceIdFromLog(log);
               if (validUnitNames[resourceId]) {
                   aMission.resources = aMission.resources || [];
                   if (aMission.resources.indexOf(resourceId) < 0) {
                       aMission.resources.push(resourceId);
                       console.log('Adding resource', resourceId, 'to mission', aMission.CaseFolderId);
                   }

                   if (result == null || result.CreatedTime < log.CreatedTime) {
                       result = log;
                   }
               }
           }
       }
    });
    return result;
};

var getStatus = function(time, data, validUnitNames) {
    var active = [];
    data.missions.forEach(function(mission) {
        //console.log('looking at mission', mission);
        if (((new Date(mission.CreatedTime)).getTime() <= time.getTime()) &&
            (new Date(mission.FinishedTime).getTime() > time.getTime())) {
            var log = findLog(data.logs, mission, time, validUnitNames);
            console.log('(', mission.CaseFolderId, ')', mission.CreatedTime, '<', time, '<', mission.FinishedTime, '=>', log && (log.LogText + ' (' + log.CreatedTime + ')'));
            active.push(mission);
        }
    });
    console.log('Has found', active.length, 'active cases');
};

//setTimeout(function() {
//    getStatus(new Date(Date.parse('2014-01-01 10:00:00')));
//}, 500);
