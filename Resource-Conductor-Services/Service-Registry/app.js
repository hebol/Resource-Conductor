var serverPort = 1234;
var io         = require('socket.io')();

var serviceList = {};

var sizeObject = function(obj) {
    var size = 0;
    var key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            size++;
        }
    }
    return size;
};

io.on('connection', function(socket) {
    var registeredServices = {};
    console.log('connecting:', socket.id);

    function updateServiceList(target) {
        console.log("Sending list of", sizeObject(serviceList), "services");
        target.emit('updatedServiceList', serviceList);
    }
    updateServiceList(socket);

    socket.on('registerService', function(service) {
        console.log('Register received:', service);
        serviceList[service.serviceId] = service;
        registeredServices[service.serviceId] = service;
        updateServiceList(io.sockets);
    });

    socket.on('unregisterService', function(serviceId) {
        console.log('Unregister received:', serviceId);
        delete serviceList[serviceId];
        delete registeredServices[serviceId];
        updateServiceList(io.sockets);
    });

    socket.on('disconnect', function() {
        console.log('disconnecting:', socket.id);
        Object.keys(registeredServices).forEach(function (serviceId) {
            var service = serviceList[serviceId];
            console.log("Removing service", serviceId, "for disconnected client", socket.id, "type", service.serviceType);
            delete serviceList[serviceId];
            delete registeredServices[serviceId];
        });
        updateServiceList(io.sockets);
    });
});

console.log("Has started server on port", serverPort);
io.listen(serverPort);