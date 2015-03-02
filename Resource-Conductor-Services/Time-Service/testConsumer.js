process.title = 'time-consumer';

var consumer = require('../Common/js/serviceConsumer')('time-service', 'time-consumer',
    {
        'time': function(time) { console.log("Now received", time);}
    }
);
