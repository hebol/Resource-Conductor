var googleCache = require('./googleCache.js')('routeDir');
var unitMap = {};

function getUnit(id) {
    return unitMap[id];
}

function addUnit(unit) {
    return unitMap[unit.id] = unit;
}

var loadPatientDelay        = 10 * 60 * 1000,
    hospitalLeaveDelay = 20 * 60 * 1000,
    acknowledgeDelay   = 30 * 1000;

function processRouteForId(id, route) {
    console.log("Received route for id", id, "==>", route);
    //console.log(JSON.stringify(route));
    var steps = googleCache.convertGoogleRoute(route.routes);

    var unit = getUnit(id);
    unit.route.steps = steps;
    var routeDuration = steps && steps.length ? steps[steps.length - 1].time : 0;
    if (routeDuration == 0) {
        console.log('Error in route', route);
    }
    if (unit.status == 'H') {
            unit.atHomeStation = new Date(unit.readyAtHospitalTime.getTime() + routeDuration * 1000);
            unit.route.startTime = unit.readyAtHospitalTime;
    } else {
        if (!unit.atSiteTime) {
            unit.atSiteTime = new Date(unit.acknowledgedTime.getTime() + routeDuration * 1000);
            unit.loadedTime = new Date(unit.atSiteTime.getTime() + loadPatientDelay);
            unit.route.startTime = unit.acknowledgedTime;
        } else {
            unit.atHospitalTime = new Date(unit.loadedTime.getTime() + routeDuration * 1000);
            unit.readyAtHospitalTime = new Date(unit.atHospitalTime.getTime() + hospitalLeaveDelay);
            unit.route.startTime = unit.loadedTime;
        }
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
            console.log('Will move', unit.name, '(', unit.status, ')', 'steps(', unit.route.steps.length, ')', elapsedTime);
            for (var i = unit.route.steps.length - 1 ; i >= 0 ; i--) {
                var aStep = unit.route.steps[i];
                if (elapsedTime > aStep.time) {
                    //console.log('Will move', unit.name, 'to', aStep);

                    unit.latitude = aStep.latitude;
                    unit.longitude = aStep.longitude;
                    unit.distance = getDistanceFromPositionsInKm(unit, unit.targetPos);
                    result = unit;
                    if (i == unit.route.steps.length - 1) {
                        console.log('Vehicle', unit.name, 'moved to target location');
                        unit.route.steps = [];
                    }
                    break;
                }
            }
        } else {
            console.log('Unit', unit.name, 'is out of time (steps:', unit.route.steps.length, elapsedTime, 'start', unit.route.startTime, 'now', time, ')');
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

var index = [
    'Förgiftning, överdos',
    'Bröstsmärtor/Hjärtsjukdom',
    'Extremitet/Sårskador/Mindre trauma',
    'Misstanke om sjukvårdsbehov',
    'Olyckor (Trauma)',
    'Livsfara - (temporär indexering)',
    'Våld-misshandel',
    'Medvetslös-vuxen',
    'Osäkra uppgifter/Svårt sjuk patient',
    'Liggande sjuktransport',
    'Buk/urinvägar',
    'Slaganfall (Stroke)-förlamningar',
    'Andningssvårigheter',
    'Blödning. ej trauma',
    'Huvudvärk. Yrsel',
    'Graviditet/förlossning (från v.20)',
    'Beställt uppdrag mellan vårdenheter',
    'Gyn-graviditet (före v.20)',
    'O-Interntransporter SU',
    'Diabetes',
    'Krampanfall',
    'Feber',
    'Medvetslös-barn',
    'Brännskada/Elskada',
    'Barn-sjukdom',
    'Ryggbesvär',
    'Suicidmisstanke-psykiatri',
    'Allergi',
    'Webbeställning (2.0)',
    'Ögon-öron-näsa-hals',
    'Hypo/Hypertermi',
    'Drunkningstillbud',
    'Barn-förgiftning',
    'Kemikalier-gaser',
    'Räddningsuppdrag',
    'Djurbett/Insektsstick',
    'Dykeriolycka',
    'Övrigt',
    'Helikopter 5920'];

var getDistanceFromPositionsInKm = function(pos1, pos2) {
    var result = null;
    if (pos1 && pos2) {
        var deg2rad = function(deg) {
            return deg * (Math.PI/180);
        };
        var R = 6371; // Radius of the earth in km
        var dLat = deg2rad(pos2.latitude - pos1.latitude);  // deg2rad below
        var dLon = deg2rad(pos2.longitude - pos1.longitude);
        var a =
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(deg2rad(pos1.latitude)) * Math.cos(deg2rad(pos2.latitude)) *
                Math.sin(dLon/2) * Math.sin(dLon/2)
            ;
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        result = R * c; // Distance in km
        result = Math.round(result * 100) / 100;
    }
    return result;
};


var sahlgrenska = {latitude: 57.683088,longitude: 11.959884, name: "Sahlgrenska"}; // Ej barn eller ortopedi
var molndal     = {latitude: 57.661244,longitude: 12.012948, name: "Sahlgrenska"}; // Medicin och ortoped, ej barn, kirurg, trauma
var ostra       = {latitude: 57.7206,  longitude: 12.0535,   name: "Östra"};       // Barn, medicin och kirurgi, ej vissa trauma och ortoped (men barnortopedi)
var kungalv     = {latitude: 57.878,   longitude: 11.969,    name: "Kungälv"};     // medicin, kirurgi, ortoped (vissa trauma) ej barn)
var nal         = {latitude: 58.318567,longitude: 12.265557, name: "NÄL"};         // ?

var getHospitalLocationForCase = function(aCase) {
    var selected;
    var shortest;
    if (aCase.index.indexOf('arn') >= 0) {
        selected = ostra;
    } else {
        if (aCase.index == 'Suicidmisstanke-psykiatri') {
            selected = ostra;
        } else {
            if (aCase.index == 'Extremitet/Sårskador/Mindre trauma') {
                selected = molndal;
            } else {
                var available = [sahlgrenska, molndal, ostra, kungalv, nal];
                available.forEach(function(hospital) {
                    var distance = getDistanceFromPositionsInKm(aCase, hospital);
                    if (!selected || shortest > distance) {
                        selected = hospital;
                        shortest = distance;
                    }
                });
            }
        }
    }

    console.log('Selected hospital', selected.name);
    if (shortest) {
        console.log('The hospital was closest; it was', Math.round(shortest * 100) / 100, 'km away');
    }

    return selected;
};


var copyPos = function (from, to) {
    to.latitude  = from.latitude;
    to.longitude = from.longitude;
    console.log('copyPos(=>', to, ')');

    return to;
};

var Unit = function(args) {
    var that    = this;

    that.reset = function() {
        that.type = 'A';
        that.status = 'K';
        that.route = {
            startTime: null,
            steps: null
        };
        that.assignedTime = null;
        that.acknowledgedTime = null;
        that.atSiteTime = null;
        that.loadedTime = null;
        that.atHospitalTime = null;
        that.readyAtHospitalTime = null;
        that.currentCase = null;
        that.targetPos = null;
    };

    that.id     = -1;
    if (args.constructor === Array) {
        args.forEach(function(unit, index, list){
            list[index] = new Unit(unit);
        });
        return args;
    } else {
        that.reset();
        copyProperties(args, that);
    }

    that.atSite = function() {
        that.status = 'F';
        copyPos(that.currentCase, that);
        that.route.steps = null;
        that.targetPos = null;
    };

    that.atHome = function() {
        that.status = 'K';
        copyPos(that.homeStationPos, that);
        that.route.steps = null;
        that.targetPos = null;
    };

    that.moveToCase = function() {
        that.route.steps = null;
        that.status = 'U';
        that.targetPos = copyPos(that.currentCase, {});
        routeConsumer.emit('getRouteForId', that, that.currentCase, that.id);
    };

    that.moveToHomeStation = function() {
        that.route.steps = null;
        that.status = 'H';
        that.targetPos = copyPos(that.homeStationPos, {});
        routeConsumer.emit('getRouteForId', that, that.homeStationPos, that.id);
    };

    that.atHospital = function() {
        that.status = 'S';
        copyPos(that.targetPos, that);
        that.route.steps = null;
        that.targetPos = null;
    };

    that.moveToHospital = function() {
        that.route.startTime = that.loadedTime;
        that.route.steps = null;
        that.status = 'L';
        var toPos = getHospitalLocationForCase(that.currentCase);

        that.targetPos = copyPos(toPos, {});
        console.log('Will move to', that.targetPos);

        routeConsumer.emit('getRouteForId', that, toPos, that.id);
    };

    that.processLogs = function(logs, aCase) {
        console.log('Will update', that.name, 'with', logs);
        logs.sort(function(a,b) {return a.CreatedTime.localeCompare(b.CreatedTime);});
        logs.forEach(function(aLog) {
            var time = new Date(aLog.CreatedTime);
            if (aLog.LogText.indexOf('knuten, status T')) {
                that.assignedTime = time;
                that.status = 'T';
            }
            if (aLog.LogText.indexOf('status U')) {
                that.acknowledgedTime = time;
                that.status = 'U';
            }
            if (aLog.LogText.indexOf('status F')) {
                that.atSiteTime = time;
                copyPos(aCase, that);
                that.status = 'F';
            }
            if (aLog.LogText.indexOf('status L')) {
                that.loadedTime = time;
                copyPos(aCase, that);
                that.status = 'L';
            }
            if (aLog.LogText.indexOf('status S')) {
                that.atHospitalTime = time;
                copyPos(getHospitalLocationForCase(aCase), that);
                that.status = 'S';
            }
            if (aLog.LogText.indexOf('status H')) {
                that.readyAtHospitalTime = time;
                that.status = 'H';
            }
            if (aLog.LogText.indexOf('klar')) {
                that.readyAtHospitalTime = time;
                that.status = 'K';
                copyPos(that.homeStationPos, that);
            }
            that.currentCase = aCase;
            if (!that.readyAtHospitalTime && that.atHospitalTime) {
                that.readyAtHospitalTime = new Date(that.atHospitalTime.getTime() + hospitalLeaveDelay);
            }
            if (!that.atHospitalTime && that.loadedTime) {
                that.moveToHospital();
            }
            if (!that.loadedTime && that.atSiteTime) {
                that.loadedTime = new Date(that.atSiteTime.getTime() + loadPatientDelay);
            }
            if (!that.atSiteTime && that.acknowledgedTime) {
                that.moveToCase();
            }
            if (!that.acknowledgedTime && that.assignedTime) {
                that.readyAtHospitalTime = new Date(that.atHospitalTime.getTime() + acknowledgeDelay);
            }
            console.log('Unit updated to state', that);
        });
    };

    that.assignCase = function(aCase, time) {
        console.log('unit', that.name, 'asked to go to', aCase.CaseFolderId, 'at', time);
        addUnit(that);
        that.status = 'T';
        that.assignedTime = time;
        that.acknowledgedTime = new Date(time.getTime() + acknowledgeDelay);
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
                        result = that;
                    }
                    break;
                case 'U':
                    if (that.atSiteTime && time.getTime() > that.atSiteTime.getTime()) {
                        that.atSite();
                        result = that;
                    }
                    break;
                case 'F':
                    if (time.getTime() > that.loadedTime.getTime()) {
                        that.moveToHospital();
                        result = that;
                    }
                    break;
                case 'L':
                    if (that.atHospitalTime && time.getTime() > that.atHospitalTime.getTime()) {
                        that.atHospital();
                        result = that;
                    }
                    break;
                case 'S':
                    if (time.getTime() > that.readyAtHospitalTime.getTime()) {
                        that.moveToHomeStation();
                        result = that;
                    }
                    break;
                case 'H':
                    if (time.getTime() > that.atHomeStation.getTime()) {
                        that.atHome();
                        result = that;
                    }
                    break;
            }
            if (that.hasRoute()) {
                result = moveUnitForTime(that, time) || result;
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

/*
var index2 =
[ 'Sänkt eller sjunkande medvetandegrad',
    'Starka smärtor mitt i bröstet',
    'Misstanke om lårbenshalsfraktur (collumfraktur)',
    'Brand i byggnad',
    'Bröstsmärtor, upplevs ej som kraftiga',
    'Kross- eller penetrerande skada i ansikte/hals',
    'Misstanke om fraktur',
    '',
    'Plötslig hjärtklappning',
    'Kontrollerad blödning',
    'Misstanke om grovt våld och allvarlig personskada',
    'Reagerar inte på tilltal eller skakningar. Andas som vanligt',
    'Misstanke om förgiftning/överdos',
    'Misstanke om påverkan på vitala funktioner',
    'Misstanke om hjärnskakning (commotio)?',
    'Ingen misstanke om påverkan på vital funktioner',
    'Misstanke om högenergivåld',
    'Inopererad pacemaker och/eller ICD (defibrillator)',
    'Misstanke om mindre trauma',
    'Ihållande buksmärtor med eller utan feber',
    'Svimfärdig och/eller illamående, blek och kallsvettig',
    'Misstanke om misshandel',
    'Akut halvsidesförlamning (--)',
    'Överflyttning',
    'Andningssvårigheter',
    'Näsblödning. Stoppar inte trots åtgärder',
    'Yrsel',
    'Småvärkar eller värkar som inte är lika starka hela tiden. Före 36:e grav.veckan',
    'Passning annat område',
    'Starka ihållande smärtor i ljumsken',
    'Mindre skärsår och skrubbsår',
    'Övrig trpt',
    'Misstanke om fraktur i ogynnsam miljö',
    'Måttlig blödning från underlivet',
    'Bokad tid',
    'Diabetiker som mår dåligt eller är mycket trött',
    'Anfallet är över. Slö och/eller förvirrad',
    'Misstanke om allvarliga hjärtproblem',
    'Buksmärtor',
    'Reagerar inte på tilltal eller skakningar. Ingen andning',
    'Plötslig afasi (svårt att finna ord) (--)',
    'Transport till/från vårdenhet',
    'Svagt immunförsvar och feber',
    'Patientstyrning',
    'Transport mellan vårdenheter',
    'Barnet reagerar inte på tilltal eller skakningar. Andas som vanligt',
    'Brännskada i ansiktet och/eller misstanke om brännskada i luftvägarna',
    'Feber, skällande hosta. Medtagen',
    'Andningssvårigheter och bröstsmärtor',
    'Bröstsmärtor och andningssvårigheter',
    'Andnöd, känner sig svimfärdig',
    'Ihållande starka ryggsmärtor',
    'Reagerar inte på tilltal eller skakningar',
    'Andnöd, känd astma. Ej effekt av egna mediciner',
    'Brännskada på barn/vuxen',
    'Misstanke om allvarlig psykisk sjukdom',
    'Plötsliga starka buksmärtor, blek och kallsvettig',
    'Pågående kramper',
    'Slappt, blekt och/ eller cyanotiskt ("blåaktigt barn") barn. Knappt kontaktbar',
    'Allvarlig kniv-, kross- eller peneterande skada',
    'Sänkt eller sjunkande medvetande',
    'Måttlig blödning, svår att stoppa',
    'Andnöd, blek kallsvettig',
    'Svårt att svälja och/eller uttalad dregling',
    'Ogynnsam miljö',
    'Diffusa bröstsmärtor hos kvinnor',
    'Svår andnöd eller andnöd som snabbt förvärras',
    'Reagerar inte på tilltal eller skakning',
    'Nytillkommen kraftlöshet och/eller domningar i armar och ben',
    'Misstanke om luxation',
    'Svår huvudvärk',
    'Kräkningar och/eller diarréer',
    'Hjärtat slår oregelbundet. Orolig',
    'Misstanke om allvarlig blandförgiftning (t.ex. tabletter/alkohol)',
    'Stor blödning som inte stoppar',
    'Tilltagande svullnad i mun och svalg',
    'Intensiv huvudvärk med förlamningar och/eller talsvårigheter',
    'Allvarligt hot om självmord',
    'Smärtor och kräks mycket rött, färskt blod',
    'Ryggsmärtor, kan ej kissa',
    'Stora mängder svart, tjärliknande avföring. Blek och kallsvettig',
    'Bröstsmärtor hos diabetiker, oavsett varaktighet',
    'Akut transport mellan vårdenheter',
    'Övrigt',
    'Svår andnöd vid kronisk lungsjukdom. Ej effekt av egna mediciner',
    'Akut krisreaktion',
    'Bröstsmärtor, känner sig svimfärdig',
    'Kräks gammalt blod (kaffesump)',
    'Misstanke om skallskada',
    'Svårt medtaget barn med kraftiga smärtor i intervall eller kontinuerligt',
    'Kräks eller har diarré',
    'Klarar ej annat transportsätt',
    'Starka smärtor',
    'Plötslig afasi (svårt att finna ord)',
    'Utlovad tid',
    'Ihållande starka smärtor i ryggen eller sidan. Feber',
    'Känner sig svimfärdig. Medtagen',
    'Misstanke om lårbenshalsfraktur (Collumfraktur)',
    'Blek och kallsvettig',
    'Läkemedelsförgiftning/överdos, allvarligt självmordsförsök',
    'Rinner mycket färskt blod från ändtarmen',
    'Fall från hög höjd (>3m)',
    'HLR pågår',
    'Smärtor i skuldror, armar eller käkar. Svimfärdig och/eller illamående',
    'Starka intervallsmärtor i buken, korsryggen eller sidan',
    'Smärtor i ryggen',
    'Ryggsmärtor, haft diskbråck tidigare',
    'Plötsligt avvikande beteende',
    'Förlamning eller nedsatt känsel/rörlighet i armar/ben',
    'Blek kallsvettig och/eller påverkat medvetande. Kan ej dricka',
    'Pågående kramper eller har haft kramper',
    'Vrickad eller stukad led',
    'Febrig, hosta. Påfallande irriterad',
    'Blödning och/eller smärta från 20:e graviditetsveckan',
    'Kraftig blödning från underlivet',
    'Starka smärtor i nedre delen av buken, problem med att kissa, med eller utan kateter',
    'Starka ihållande smärtor',
    'Smärtor och kräks gammalt blod (kaffesump), blek och kallsvettig',
    'Stora mängder svart, tjärliknande avföring',
    'Behandling',
    'Plötsligt kraftlös i armarna. Svimfärdig och/eller illamående',
    'Automatiskt brandlarm',
    'Kronisk hjärtsvikt, tilltagande andningssvårigheter',
    'T-HLR pågår',
    'Rött, svullet ben (ventrombos)',
    'Plötslig förlamning som snabbt blir bättre',
    'TIA - Afasi/snedhet i ansikte/förlamning som har upphört under senaste 24 tim',
    'Smärtor och kräks gammalt blod (kaffesump)',
    'Feber. Klarar inte annat transportsätt',
    'Feber, pågående kramper',
    'Misstanke om främmande föremål i luftvägarna/Vuxen',
    'Panikångest',
    'Näsblödning som inte stoppar trots åtgärder',
    'Blek, kallsvettig och blöder fortfarande.',
    'Korta hugg av smärta i bröstet',
    'Ihållande smärta/värkar från 20 grav.veckan, med eller utan vattenavgång',
    'Plötslig, intensiv "ovanlig" huvudvärk. "Som en blixt från klar himmel". Medtagen',
    'Mår dåligt efter allergisk reaktion',
    'Påverkat eller sjunkande medvetande',
    'Intensiva buksmärtor hela tiden, kraftigt medtagen',
    'Gravid, plötsligt starka och ihållande smärtor',
    'Rött, svullet och smärtande ben (ventrombos)',
    'Klarar nästan inte av att svälja och har svårt att prata',
    'Sjuktransport/sjukresor',
    'Smärtor och andningssvårigheter',
    'Problem med att kissa',
    'Måttlig blödning,svår att stoppa',
    'Oklara problem',
    'Skottskada',
    'Skurit sig, blödningen under kontroll',
    'Visar tecken på "dille" (delirium tremens)',
    'Varit avsvimmad, vaken nu',
    'Reagerar inte på tilltal eller skakningar. Rosslande/agonal andning',
    'Sexuellt våld',
    'Stopp i urinkateter',
    'Cellgiftbehandlad Cytostatikabehandlad) patient med hög feber och påverkat allmäntillstånd',
    'Hög feber och medtagen. Snabb försämring',
    'Misstanke om lårbensfraktur (Femur)',
    'Gravid, andningssvårigheter',
    'Plötsliga smärtor i nedre delen av magen, ev. gravid',
    'Plötslig uppkommen kraftig andnöd. Ingen känd sjukdom',
    'Kross- eller peneterande skada i ansikte/hals',
    'Högenergivåld och/eller multipla skador',
    'Pågående blödning, blek och kallsvettig',
    'Svår yrsel. Blek, kallsvettig och /eller svimningstendens',
    'Blek, kallsvettig och/eller svimningsten',
    'Vattenavgång och/eller värkar. Fostret ligger inte normalt',
    'Feber och hosta',
    'Pågående förlossning/förlossningen klar',
    'Förlossningen är klar. Barnet slappt,  andas dåligt/inte alls',
    'Plötsligt sned i ansiktet',
    'Haft flera krampanfall. Vaknar inte mellan anfallen',
    'Ihållande starka smärtor i pungen',
    'Tilltagande huvudvärk efter slag mot huvudet',
    'Barnet reagerar inte på tilltal eller skakningar. Ingen andning',
    'Starka smärtor, blek och kallsvettig',
    'Akut halvsidesförlamning',
    'Misstanke om hjärnskakning (commotio)',
    'Feber',
    'Feber, smärtor i magen',
    'Skadad och/eller påverkad av hushållsström/starkström',
    'Andas dåligt, med få och/eller ytliga andetag',
    'Akut nedsatt känsel/rörlighet i ben/armar',
    'Ryggsmärtor, delvis förlamad i något av benen',
    'Öppen fraktur',
    'Blek, kallsvettig och/eller har svimningstendens',
    'Ont i halsen, svårt att öppna munnen, feber',
    'Blod i urinen',
    'Klåda och utslag. Inga andra symtomer',
    'Kräks mindre mängd rött, färskt blod',
    'Blek, kallsvettig och/eller avvikande beteende. Kan dricka och äta',
    'Nytillkommen sväljsvårighet',
    'Gravid med magsmärtor',
    'Märkbart slö eller orolig',
    'Vit, kall och smärtande extremitet (artäremboli). Medtagen',
    'Misstanke om fraktur i halsrygg',
    'Plötsligt synbortfall, känner sig svimfärdig',
    'Stor blödning svår att stoppa',
    'Plötsliga starka ryggsmärtor, känner sig svimfärdig',
    'Feber och/eller infektion',
    'Nedkyld. Apatisk, slö, orolig eller oklar',
    'Misstanke om främmande föremål i luftvägarna/Barn',
    'Djupt sår - möjlig skada på senor och nerver',
    'Akuta buksmärtor, blek kallsvettig',
    'Känd, svår allergi eller allergisk reaktion',
    'Brännskada och/eller elskada på barn',
    'Haft kramper, väckbar nu',
    'Plötslig hjärtklappning. Orolig',
    'Cellgiftbehandlad Cytostatikabehandlad) patient med feber',
    'Orolig för allergisk reaktion. Inga symptomer nu',
    'Klämskada, påverkade vitala funktioner',
    'Misstanke om fraktur på halsrygg',
    'Plötsligt förlorat känseln i benen',
    'Utsatt för högenergivåld, helt vaken, till synes utan skador',
    'Liten brännskada (mindre än 1 % av huden - motsvarande den skadades handflata)',
    'Stor öppen skada och/eller öppen fraktur',
    'Hög feber, kraftig huvudvärk och/eller nacksmärta',
    'Bröstsmärtor efter mindre trauma (revbensfraktur?)',
    'Lättambulans',
    'Uppmätt högt blodsocker',
    'Blek, kallsvettig, känner sig svimfärdig',
    'Skurit sig, stor blodförlust, allvarligt självmordsförsök',
    'Skada direkt mot öga',
    'Känd epilepsi, enstaka anfall. Vaken',
    'Plötsliga starka ryggsmärtor, blek och kallsvettig',
    'Starka, ihållande smärtor i eller vid ögonen',
    'Avsliten kroppsdel',
    'Smärtor endast vid djup inandning eller rörelse',
    'Sveda eller smärta vid vattenkastning med eller utan feber',
    'Misstanke om djup kylskada. (Hård känsellös hud som inte kan röras mot underliggande vävnad)',
    'Intensiv huvudvärk, nacksmärta. Hjärnhinneinflammation?',
    'Hängning, allvarligt självmordsförsök',
    'Tidsbeställd brådskande transport',
    'Obehag eller smärtor i bröst, skuldror, armar eller käkar',
    'Tilltagande huvudvärk, har shunt inopererad',
    'Allvarlig brännskada på barn/vuxen',
    'Mindre frätskada i eller vid öga',
    'Hög feber, nackstyv, medtagen. Hjärnhinneinflammation?',
    'Kräks gammalt blod (kaffesump). Blek och kallsvettig',
    'Bukbesvär, påverkad, diarré. Gravid',
    'Den olycksdrabbade ligger i vattnet',
    'Hostar/kräks upp mycket rött, färskt blod',
    'Andnöd, är skadad',
    'Stor frätskada i eller vid öga',
    'Tagit centralstimulerande drog, har bröstsmärtor',
    'Vattnet har gått, inga värkar. Efter 36:e grav.veckan',
    'Gravid, ökande huvudvärk och/eller påverkan på synen',
    'Polisinsats',
    'Tagit okänd mängd av läkemedel, kemisk produkt, växter eller svampar',
    'Röntgen',
    'Gravid, ökande huvudvärk och eller påverkan på synen',
    'Andningsvårigheter eller andas inte som vanligt',
    'Omföderska med mera än 5 min mellan värkarna. Efter 36:e grav.veckan',
    'Barnet reagerar inte på tilltal eller skakningar. Rosslande/agonal andning',
    'Blödning efter operation av halsmandlar (tonsillectomi)',
    'Mindre mängd svart, tjärliknande avföring',
    'Har andningssvårigheter, troligen bröstkorgsskada',
    'Misstanke om skelettskada på extremiteterna',
    'Vattnet har gått, barnet ej fixerat',
    'Aktivera annan vårdkompetens internt',
    'Plötsligt sviktande syn på ett eller båda ögonen',
    'Näsblödning',
    'Allvarlig frätskada i ansikte och/eller ögon',
    'Kan/har  ha tagit okänd mängd av skadligt ämne. Osäkra upplysningar',
    'Fått i sig petroleumhaltig produkt. Hostar eller har andningsvårigheter',
    'Snuvig, och/eller feber, öronvärk, hosta, ont i halsen',
    'Ont i magen',
    'Hostar upp lite blod tillsammans med slem',
    'Krampanfall efter färsk skallskada',
    'Klämskada',
    'Transport utan vårdbehov',
    'Stor öppen/penetrerande skada i eller vid öga',
    'Hopp från hög höjd, allvarligt självmordsförsök',
    'Gas- eller koloxidförgiftning, allvarligt självmordsförsök',
    'Vapen, allvarligt självmordsförsök',
    'Feber, har annan allvarlig kronisk sjukdom',
    'Blek, kallsvettig och/eller svårt skadad',
    'Nedkyld, påverkat medvetande',
    'Fått i sig petroleumhaltig produkt. Hostar eller har andningssvårigheter',
    'Fått i sig frätande ämnen',
    'Vaken, känner sig svimfärdig',
    'Fastklämd person',
    'Misstanke om penetrerande främmande föremål',
    'Ej gravid, onormala smärtor, blödning',
    'Klämskada på fingrar/tår eller misstanke om brutna fingrar/tår',
    'Fallit från låg höjd eller i samma plan i samband med elolycka',
    'Reaktion efter djurbett/insektsstick',
    'Huggormsbett hos barn',
    'Varit utsatt för små mängder gas eller giftigt ämne',
    'Brand i fordon',
    'Gravid, pågående eller har haft kramper',
    'Småvärkar eller värkar som inte är lika starka hela tiden. Efter 36:e grav.veckan',
    'Hög feber hos barn under två månader',
    'Fått i sig petroleumhaltig produkt',
    'Fått en stöt av hushållsström (230 volt)',
    'Slö och slapp, knappt väckbar',
    'Orolig för dykarsjuka. Inga symptom eller smärtor nu',
    'Misstanke om att ha druckit träsprit',
    'Utsatt för stark hetta. Varm. Utmattad',
    'Nedkyld, svårt skadad',
    'Rött och irriterat öga',
    'Djupa djurbett, oavsett kroppsdel',
    'Förstföderska med mer än 2 min. mellan värkarna. Efter 36:grav.veckan',
    'Fått ett hårt slag mot öga, känner sig svimfärdig',
    'Hostat upp främmande föremål, andas bra',
    'Insektsstick i mun/svalg eller exteriört i denna region. Svårt att andas, prata och/eller svälja',
    'Varit utsatt för rök, svårt att prata och svälja',
    'Plötsliga utslag. Svårt medtagen',
    'Stor blödning som inte stoppar efter djurbett',
    'Helt utmattad efter att legat i vatten',
    'Gravid, bukbesvär, påverkad, diarré',
    'Diabetiker, pågående kramper',
    'Svetsat. Smärtor, nedsatt syn',
    'Varm efter kraftig fysisk ansträngning. Utmattad',
    'Vattenavgång . Något annat än barnet syns (t.ex. navelsträngen)',
    'Ormbett. Allmänpåverkad',
    'Blek och kallsvettig, svimningstendens',
    'Gravid, blöder från underlivet',
    'Gravid, ökande huvudvärk och eller påverkan på synen före v.20',
    'Småskador (skärsår och skrubbsår)',
    'Slö och/eller orolig',
    'Misstanke om barnmisshandel',
    'Fått i sig syra/lut, sväljsvårigheter',
    'Småskador (skärsår, skrubbsår)',
    'Stor skada på eller vid öra, sjunkande eller sänkt medvetande',
    'Sjuktransportbil',
    'Våldsoffer med akut krisreaktion',
    'Mindre frätskada på vuxen',
    'Bärhjälp',
    'Slag mot magen',
    'Annan allvarlig skada i samband med brännskada',
    'Allvarlig frätskada på vuxen',
    'Djupa, allvarliga djurbett i ansiktet och/eller på halsen',
    'Plötslig kraftlöshet och/eller domningar i armar och ben',
    'Smärtor eller värkar efter slag/trauma mot magen',
    'Orolig för att få allergiska besvär av samma orsak som tidigare. Inga symptom nu',
    'Frätskada på barn',
    'Varit utsatt för rök/gaser',
    'Liten frätskada på händer, genitallia eller ansikte/ögon',
    'Skräp som sitter fast i ögat',
    'Plötsligt sned i ansiktet (--)',
    'Krampanfall med feber och utslag. Hjärnhinneinflammation?',
    'Medtagen och slö direkt efter dykning',
    'Andningsbesvär',
    'Plötsligen fått tät och rinnande näsa',
    'Fått i sig små mängder av skadligt ämne',
    'Kemikalie/gasolycka. Misstanke om allvarlig personskada',
    'Andnings- och sväljsvårigheter och/eller dregling, hög feber',
    'Larm från annan Ambulans',
    'Fullt vaken och andas som vanligt efter att ofrivilligt legat i vatten',
    'Huvudvärk',
    'Trafikolycka',
    'Andnöd',
    'Transportuppdrag',
    'Allergi',
    'Hjärtstopp',
    'Bröstsmärtor',
    'Medvetslöshet',
    'Stroke',
    'Trauma - Penetrerande' ];
    */