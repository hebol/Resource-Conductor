var diarySocket;

var getDiary = function() {
    diarySocket.emit('queryDiaryData');
};


$(document).ready(function() {
    var diaryTable =$("#diaryTable")
        .dataTable({columns: [
            { data: 'id'     },
            { data: 'time'   },
            { data: 'message'}
        ],
        "order": [[ 1, "desc" ]],
        "iDisplayLength": 25
    });


    registerConsumer('log-service', function(service) {
        diarySocket = io.connect(service.url);
        diarySocket.on('diaryData', function (data) {
            console.log(data);
            diaryTable.fnAddData(data);
        });
    });

    window.setInterval(getDiary, 5000);
});