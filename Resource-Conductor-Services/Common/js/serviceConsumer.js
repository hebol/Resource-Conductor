var config = require('./configService.js');
module.exports = function(serviceType, systemName, receiveMap) {
    var connectedSockets = {};
    var disconnectedSockets = {};
    var receiveData = receiveMap;
    var result = {
        connectToService: function(service, callback) {
            console.log("Asked to connect to", service);
            var socket = connectedSockets[service.serviceId];
            var registerFunction = function (aSocket, anId, serviceId) {
                aSocket.on(anId, function(data) {
                    if (connectedSockets[serviceId]) {
                        receiveData && receiveData[anId] && receiveData[anId](data);
                    }
                });
            };
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
                    for (var funId in receiveData) {
                        registerFunction(socket, funId, service.serviceId);
                    }
                } else {
                    console.log("reusing old socket for", service.serviceType);
                    connectedSockets[service.serviceId] = socket;
                    disconnectedSockets[service.serviceId] = null;
                    callback && callback(true);
                }
            }
        },

        emit: function(message, callback) {
            for (var id in connectedSockets) {
                connectedSockets[id].emit(message, callback);
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
    config.setup(systemName);
    config.registerConsumer(["time-service"], result.connectToService, result.disconnectFromService);
    return result;
};




