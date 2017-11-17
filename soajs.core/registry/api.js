'use strict';
var fs = require('fs');
var regFile = (process.env.SOAJS_PROFILE || __dirname + "/../../profiles/single.js");
var request = require('request');

module.exports = {
    "init": function () {
    },
    "loadData": function (dbConfiguration, envCode, param, callback) {
        var obj = {};
        return callback(null, obj);
    },
    "registerNewService": function (dbConfiguration, serviceObj, collection, cb) {
        return cb(null);
    },
    "addUpdateServiceIP": function (dbConfiguration, hostObj, cb) {
        return cb(null, true);
    },
    "loadOtherEnvHosts": function (param, cb) {
        var obj = {};
        return cb(null, obj);
    },
    "fetchRegistry": function (param, cb) {
        var err = null;
        var reg = null;

        if (process.env.SOAJS_REGISTRY_API.indexOf(":") === -1)
            err = new Error('Invalid format for SOAJS_REGISTRY_API [hostname:port]: ' + process.env.SOAJS_REGISTRY_API);

        if (!err) {
            var portFromEnv = process.env.SOAJS_REGISTRY_API.substr(process.env.SOAJS_REGISTRY_API.indexOf(":")+1);
            var port = parseInt(portFromEnv);
            if (isNaN(port))
                err = new Error('port must be integer: [' + portFromEnv + ']');
        }

        if (!err) {
            var requestOption = {
                "url": "http://"+process.env.SOAJS_REGISTRY_API+"/getRegistry?env="+param.envCode+"&serviceName="+param.serviceName,
                "json": true
            };
            request (requestOption, function (error, response, body) {
                    if (!error) {
                        if (body.result)
                            reg = body.data;
                    }
                    cb(error, reg);
                });
        }
        else
            cb(err, reg);
    },
    "loadProfile": function (envFrom, cb) {
        if (fs.existsSync(regFile)) {
            delete require.cache[require.resolve(regFile)];
            var regFileObj = require(regFile);
            if (regFileObj && typeof regFileObj === 'object') {
                var registry = {
                    "timeLoaded": new Date().getTime(),
                    "name": envFrom,
                    "environment": envFrom,
                    "profileOnly": true,
                    "coreDB": {
                        "provision": regFileObj
                    }
                };
                registry.coreDB.provision.registryLocation = {
                    "l1": "coreDB",
                    "l2": "provision",
                    "env": registry.environment
                };
                return cb(null, registry);
            }
            else {
                return cb(new Error('Invalid profile file: ' + regFile), null);
            }
        }
        else {
            return cb(new Error('Invalid profile path: ' + regFile), null);
        }
    },
	"getAllEnvironments": function(cb){
		var obj = {};
		return cb(null, obj);
	},
	"addUpdateEnvControllers": function(param, cb){
		return cb(null);
	}
};