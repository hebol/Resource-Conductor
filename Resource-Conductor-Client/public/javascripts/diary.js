var diarySocket;

var getDiary = function() {
    diarySocket.emit('queryDiaryData');
};

// Make the table defaultsort on time in descending
// order and show 25 items per page.
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
            if (data.length > 0) {
                diaryTable.fnAddData(data);
            }
        });
        getDiary();
    });
});