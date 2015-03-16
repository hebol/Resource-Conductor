var config = require('./configService.js');
module.exports = function(serviceType, systemName, receiveMap, doAutoConnect) {
    var connectedSockets = {};
    var disconnectedSockets = {};
    var receiveData = receiveMap;
    var result = {
        isConnected: function() {
            var isConnected = false;
            Object.getOwnPropertyNames(connectedSockets).forEach(function(key){
                if (connectedSockets[key].connected) {
                    isConnected = true;
                }
            });
            return isConnected;
        },
        connectToService: function(service, callback) {
            console.log("Asked to connect to service of type", service.serviceType, "URL", service.url);
            var socket = connectedSockets[service.serviceId];
            var registerFunction = function (aSocket, anId, serviceId) {
                aSocket.on(anId, function(data1, data2, data3, data4, data5) {
                    if (connectedSockets[serviceId]) {
                        receiveData && receiveData[anId] && receiveData[anId](data1, data2, data3, data4, data5);
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

        emit: function(message, arg1, arg2, arg3, arg4, arg5) {
            //console.log("emit(", "message", message, "callback", callback, "arg1", arg1, "arg2", arg2, "arg3", arg3);
            for (var id in connectedSockets) {
                connectedSockets[id].emit(message, arg1, arg2, arg3, arg4, arg5);
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
    var autoConnectFunction;
    if (doAutoConnect) {
        autoConnectFunction = function(list) {
            console.log("Got list of", list.length, "services");
            list.forEach(result.connectToService);
        };
    }
    config.registerConsumer([serviceType], result.connectToService, result.disconnectFromService, autoConnectFunction);
    return result;
};




