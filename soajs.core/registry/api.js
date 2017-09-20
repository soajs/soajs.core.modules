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
    "loadOtherEnvHosts": function (param, cb) {
        var obj = {};
        return cb(null, obj);
    },
    "fetchRegistry": function (param, cb){
        //TODO: build request to controller
        cb(null, {});
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
                return cb (new Error('Invalid profile file: ' + regFile), null);
            }
        }
        else {
            return cb (new Error('Invalid profile path: ' + regFile), null);
        }
    }
};