dateUtil = {
    day: [
        "söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"
    ],
    month: [
        "jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"
    ],
    padTime: function(time) {
        var result = "";

        return ("00" + time).slice(-2);
    },
    getTime: function(date) {
        return this.padTime(date.getHours()) + ':' + this.padTime(date.getMinutes()) + ':' + this.padTime(date.getSeconds());
    },
    getDate: function(date) {
        return this.day[date.getDay()] + ' ' + date.getUTCDate() + ' ' + this.month[date.getUTCMonth()];
    },
    getDateTime: function(date) {
        return date.getFullYear()+"-"+this.padTime(date.getMonth())+"-"+this.padTime(date.getDay())+" "+this.getTime(date);
    }
};