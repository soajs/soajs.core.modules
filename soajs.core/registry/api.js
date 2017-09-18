'use strict';
var fs = require('fs');
var Mongo = require('../../soajs.mongo');
var regFile = (process.env.SOAJS_PROFILE || __dirname + "/../../profiles/single.js");
var mongo;

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
    "loadRegistryByEnv": function (param, cb) {
        var obj = {};
        return cb(null, obj);
    },
    "loadOtherEnvHosts": function (param, cb) {
        var obj = {};
        return cb(null, obj);
    },
    "loadProfile": function (envFrom) {
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
                return registry;
            }
            else {
                throw new Error('Invalid profile path: ' + regFile);
            }
        }
        else {
            throw new Error('Invalid profile path: ' + regFile);
        }
        return null;
    }
};