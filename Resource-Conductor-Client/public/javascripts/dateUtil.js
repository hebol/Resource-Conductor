dateUtil = {
    day: [
        "Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"
    ],
    month: [
        "Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec",
    ],
    padTime: function(time) {
       return ("00" + time).slice(-2);
    },
    getTime: function(date) {
        return this.padTime(date.getHours()) + ':' + this.padTime(date.getMinutes()) + ':' + this.padTime(date.getSeconds());
    },
    getDate: function(date) {
        return this.day[date.getDay()] + ' ' + (date.getUTCDay() + 1)+ ' ' + this.month[date.getUTCMonth()];
    }
};