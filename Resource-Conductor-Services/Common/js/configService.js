var srSocket = require('socket.io-client')('ws://localhost:1234');
var registeredServices = {};
var connectedToServices = {};
var consumerConnectCallback;
var consumerDisconnectCallback;
var consumerTypes = [];
var componentName;
var hostIp = 'localhost';

var uuid = require('node-uuid');
var hasRegisteredConfig = false;

function toList(object) {
   var result = [];
    for (var id in object) {
        if (object.hasOwnProperty(id)) {
            result.push(object[id]);
        }
    }
    return result;
}

srSocket.on('connect', function() {
    console.log('connected to service registry');
    Object.keys(registeredServices).forEach(function (service) {
        srSocket.emit('registerService', registeredServices[service]);
    });
});

module.exports.setup = function(aName) {
    console.log("Setting up system", aName);
    componentName = aName;
    if (!hasRegisteredConfig) {
        setupConfigService();
    }
};

module.exports.registerService = function(port, serviceType) {
    var id = uuid.v1();
    registeredServices[id] = {
        serviceType: serviceType,
        componentName:componentName,
        url:'ws://' + hostIp + ':' + port,
        serviceId: id
    };
    console.log('Will register service:', registeredServices[id]);
};

module.exports.registerConsumer = function(typeList, connectCallback, disconnectCallback) {
    consumerConnectCallback = connectCallback;
    consumerDisconnectCallback = disconnectCallback;
    consumerTypes = typeList;
    console.log("Hi consumer");
};

var setupConfigService = function() {
    hasRegisteredConfig = true;
    var io = require('socket.io')();
    var port = io.listen(0).httpServer.address().port;

    module.exports.registerService(port, "config");

    console.log("Has started config server on port", port);

    io.sockets.on('connect', function (aSocket) {
        console.log("Has been connected on config service");

        aSocket.on('getSystemMetadata', function () {
            var data = {
                producedServices: toList(registeredServices),
                canConsume: consumerTypes,
                connectedTo: connectedToServices
            };
            console.log("Transmitting metadata", data);
            aSocket.emit('systemMetadata', data);
        });

        aSocket.on('connectTo', function (service) {
            console.log('asked to connect to', service);
            connectedToServices[service.serviceId] = service;
            consumerConnectCallback && consumerConnectCallback(service, function(status) {
                console.log('Reply from connect was', status, "now connected to", connectedToServices);
                aSocket.emit('connectStatus', status);
            });
            !consumerConnectCallback && aSocket.emit('connectStatus', false);
        });

        aSocket.on('disconnectAll', function () {
            console.log('asked to disconnect all');
            for (var serviceId in connectedToServices) {
                var service = connectedToServices[serviceId];
                consumerDisconnectCallback && consumerDisconnectCallback(service);
                connectedToServices[serviceId] = null;
            }
            aSocket.emit('connectStatus', true);
        });

        aSocket.on('disconnectFrom', function (serviceId) {
            console.log('asked to disconnect from', serviceId);
            var service = connectedToServices[serviceId];
            consumerDisconnectCallback && consumerDisconnectCallback(service);

            connectedToServices[serviceId] = null;
        });
    });
};


var os = require('os');
var ifaces = os.networkInterfaces();

Object.keys(ifaces).forEach(function (ifname) {
    var alias = 0;

    ifaces[ifname].forEach(function (iface) {
        if ('IPv4' !== iface.family || iface.internal !== false) {
            // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
            return;
        }

        if (alias >= 1) {
            // this single interface has multiple ipv4 addresses
            console.log(ifname + ':' + alias, iface.address);
            hostIp = iface.address;
        } else {
            // this interface has only one ipv4 address
            console.log(ifname, iface.address);
            hostIp = iface.address;
        }
    });
});
