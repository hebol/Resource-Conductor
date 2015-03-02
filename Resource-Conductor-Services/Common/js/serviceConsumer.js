var config = require('./configService.js');
module.exports = function(serviceType, systemName, receiveMap) {
    var connectedSockets = {};
    var disconnectedSockets = {};
    var receiveData = receiveMap;
    var result = {
        isConnected: function() {
            return Object.keys(connectedSockets).length > 0;
        },
        autoConnect: function() {
            config.registerServiceDiscovery(function(list) {
                console.log("Got list of", list.length, "services");
                list.forEach(result.connectToService);
            });
        },
        connectToService: function(service, callback) {
            console.log("Asked to connect to service of type", service.serviceType, "URL", service.url);
            var socket = connectedSockets[service.serviceId];
            var registerFunction = function (aSocket, anId, serviceId) {
                aSocket.on(anId, function(data, data2, data3) {
                    if (connectedSockets[serviceId]) {
                        receiveData && receiveData[anId] && receiveData[anId](data, data2, data3);
                    }
                });
            };
            if (!socket) {
                socket = disconnectedSockets[service.serviceId];
                if (!socket) {
                    console.log("Creating new consumer socket for", service.serviceType);
                    socket = require('socket.io-client')(service.url);
                    connectedSockets[service.serviceId] = socket;

                    socket.on('connect', function() {
                        console.log("Now connected to service of type", serviceType);
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
    config.registerConsumer([serviceType], result.connectToService, result.disconnectFromService);
    return result;
};




