var Unit = function(args) {
    var state = 'K';
    var route = [];
    var id;

    this.tick = function(time, type) {
        if (type == 'tick') {

        }
    };
    this.getType = function() {
        return 'A';
    };
    this.getState = function() {
        return state;
    };
};

module.exports = {
    Unit: Unit
};