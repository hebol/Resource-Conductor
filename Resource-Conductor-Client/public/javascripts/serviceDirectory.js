var srSocket = io.connect(location.hostname + ':1234');
var currentServices = [];
var consumers = {};

srSocket.on('connect', function() {
    console.log('connected to service registry');
});

srSocket.on('updatedServiceList', function(serviceList) {
    console.log('Received list with services',serviceList);
    currentServices = serviceList;
    for (var serviceType in consumers) {
        if (consumers.hasOwnProperty(serviceType)) {
            notifyClients(serviceType, consumers[serviceType]);
        }
    }
});

function notifyClients(serviceType, clientList) {
    var count = 0;
    for (var index in currentServices) {
        if (currentServices.hasOwnProperty(index)) {
            var service = currentServices[index];
            if (serviceType == service.serviceType) {
                clientList.forEach(function(callback){callback && callback(service); count++;});
            }
        }
    }
    console.log("Found",count,"services of type",serviceType);
}

function registerConsumer(serviceType, callback) {
    if (!consumers[serviceType]) {
        consumers[serviceType] = [];
    }
    consumers[serviceType].push(callback);
    notifyClients(serviceType, [callback]);
}
