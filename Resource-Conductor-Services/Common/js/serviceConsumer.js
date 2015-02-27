module.exports = function(serviceType, receiveFunction) {
    var connectedSockets = {};
    var disconnectedSockets = {};
    var receiveData = receiveFunction;
    return {
        connectToService: function(service, callback) {
            console.log("Asked to connect to", service);
            var socket = connectedSockets[service.serviceId];
            if (!socket) {
                socket = disconnectedSockets[service.serviceId];
                if (!socket) {
                    console.log("Creating new socket for", service.serviceType);
                    socket = require('socket.io-client')(service.url);
                    connectedSockets[service.serviceId] = socket;

                    socket.on('connect', function() {
                        console.log("Now connected to number service!");
                        callback && callback(true);
                    });
                    socket.on('number', function(number) {
                        if (connectedSockets[service.serviceId]) {
                            receiveData && receiveData(number);
                        }
                    });
                } else {
                    console.log("reusing old socket for", service.serviceType);
                    connectedSockets[service.serviceId] = socket;
                    disconnectedSockets[service.serviceId] = null;
                    callback && callback(true);
                }
            }
        },

        disconnectFromService: function(service, callback) {
            if (service) {
                var socket = connectedSockets[service.serviceId];
                console.log("Asked to disconnectFrom", service.serviceId);
                disconnectedSockets[service.serviceId] = socket;
                connectedSockets[service.serviceId] = null;
                callback && callback(socket);
            }
        }
    };
};


