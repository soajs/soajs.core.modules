'use strict';
let fs = require('fs');
let Mongo = require('../../soajs.mongo');
let soajsLib = require("soajs.core.libs");
let soajsUtils = soajsLib.utils;

var regFile = (process.env.SOAJS_PROFILE || __dirname + "/../../profiles/single.js");
var mongo;
var environmentCollectionName = 'environment';
var hostCollectionName = 'hosts';
var controllersCollectionName = 'controllers';
var servicesCollectionName = 'services';
var daemonsCollectionName = 'daemons';
var resourcesCollectionName = 'resources';
var customCollectionName = 'custom_registry';

function initMongo(dbConfiguration) {
    if (!mongo) {
        mongo = new Mongo(dbConfiguration);

        mongo.createIndex(environmentCollectionName, {code: 1}, {unique: true}, function (err, result) {
        });
        mongo.createIndex(hostCollectionName, {env: 1}, {}, function (err, result) {
        });
        mongo.createIndex(hostCollectionName, {name: 1, env: 1}, {}, function (err, result) {
        });
        mongo.createIndex(servicesCollectionName, {name: 1}, {}, function (err, result) {
        });
        mongo.createIndex(servicesCollectionName, {port: 1, name: 1}, {unique: true}, function (err, result) {});
    }
}

function buildResources(destination, resources, envCode) {
    if (resources && Array.isArray(resources) && resources.length > 0) {
        for (var i = 0; i < resources.length; i++) {
            if (resources[i].type) {
                if (!destination[resources[i].type])
                    destination[resources[i].type] = {};
                if (resources[i].created === envCode.toUpperCase() || !resources[i].sharedEnvs || (resources[i].sharedEnvs && resources[i].sharedEnvs[envCode.toUpperCase()]))
                    destination[resources[i].type][resources[i].name] = resources[i];
            }
        }
    }
}

function buildCustomRegistry(destination, custom, envCode) {
    if (custom && Array.isArray(custom) && custom.length > 0) {
        for (var i = 0; i < custom.length; i++) {
            if (custom[i].created === envCode.toUpperCase() || !custom[i].sharedEnvs || (custom[i].sharedEnvs && custom[i].sharedEnvs[envCode.toUpperCase()]))
                destination[custom[i].name] = custom[i];
        }
    }
}

module.exports = {
    "init": function () {
    },
    "loadData": function (dbConfiguration, envCode, param, callback) {
        initMongo(dbConfiguration);
        mongo.findOne(environmentCollectionName, {'code': envCode.toUpperCase()}, function (error, envRecord) {
            if (error) {
                return callback(error);
            }
            var obj = {};
            if (envRecord && JSON.stringify(envRecord) !== '{}') {
                obj['ENV_schema'] = envRecord;
            }
            else
                obj['ENV_schema'] = {};
            //build resources plugged for this environment
            var criteria = {};
            if ("DASHBOARD" === envCode.toUpperCase()) {
                criteria = {
                    'created': envCode.toUpperCase(),
                    'plugged': true
                };
            }
            else {
                criteria = {
                    $or: [
                        {
                            'created': envCode.toUpperCase(),
                            'plugged': true
                        }, {
                            // 'created': "DASHBOARD",
                            'plugged': true,
                            'shared': true
                        }]
                };
            }
            mongo.find(resourcesCollectionName, criteria, function (error, resourcesRecords) {
                obj['ENV_schema'].resources = {};
                if (resourcesRecords) {
                    buildResources(obj['ENV_schema'].resources, resourcesRecords, envCode);
                }
                //build custom registry
                mongo.find(customCollectionName, criteria, function (error, customRecords) {
                    if (!obj['ENV_schema'].custom)
                        obj['ENV_schema'].custom = {};
                    if (customRecords) {
                        buildCustomRegistry(obj['ENV_schema'].custom, customRecords, envCode);
                    }
                    mongo.find(servicesCollectionName, function (error, servicesRecords) {
                        if (error) {
                            return callback(error);
                        }
                        if (servicesRecords && Array.isArray(servicesRecords) && servicesRecords.length > 0) {
                            obj['services_schema'] = servicesRecords;
                        }
                        mongo.find(daemonsCollectionName, function (error, daemonsRecords) {
                            if (error) {
                                return callback(error);
                            }
                            if (servicesRecords && Array.isArray(daemonsRecords) && daemonsRecords.length > 0) {
                                obj['daemons_schema'] = daemonsRecords;
                            }
                            if (process.env.SOAJS_DEPLOY_HA) {
                                return callback(null, obj);
                            }
                            else {
                                mongo.find(hostCollectionName, {'env': envCode}, function (error, hostsRecords) {
                                    if (error) {
                                        return callback(error);
                                    }
                                    if (hostsRecords && Array.isArray(hostsRecords) && hostsRecords.length > 0) {
                                        obj['ENV_hosts'] = hostsRecords;
                                    }
                                    return callback(null, obj);
                                });
                            }
                        });
                    });
                });
            });
        });
    },
    "registerNewService": function (dbConfiguration, serviceObj, collection, cb) {
        initMongo(dbConfiguration);
        mongo.findOne(collection, {
            'port': serviceObj.port,
            'name': {'$ne': serviceObj.name}
        }, function (error, record) {
            if (error) {
                return cb(error, null);
            }
            if (!record) {
                let s = {
                    '$set': {}
                };
                for (let p in serviceObj) {
                    if (Object.hasOwnProperty.call(serviceObj, p)) {
                        if (p !== "versions")
                            s.$set[p] = serviceObj[p];
                    }
                }
                if (serviceObj.versions) {
                    for (let pv in serviceObj.versions) {
                        if (Object.hasOwnProperty.call(serviceObj.versions, pv)) {
                            //TODO semVerX
                            let s_pv = soajsLib.version.sanitize(pv);
                            for (let pvp in serviceObj.versions[pv]) {
                                if (Object.hasOwnProperty.call(serviceObj.versions[pv], pvp)) {
                                    s.$set['versions.' + s_pv + '.' + pvp] = serviceObj.versions[pv][pvp];
                                }
                            }
                        }
                    }
                }
                mongo.update(collection, {'name': serviceObj.name}, s, {'upsert': true}, function (error) {
                    return cb(error);
                });
            }
            else {
                let error2 = new Error('Service port [' + serviceObj.port + '] is taken by another service [' + record.name + '].');
                return cb(error2);
            }
        });
    },
    "addUpdateServiceIP": function (dbConfiguration, hostObj, cb) {
        initMongo(dbConfiguration);
        if (hostObj) {

            var criteria = {
                'env': hostObj.env,
                'name': hostObj.name,
                'version': hostObj.version
            };

            if (hostObj.serviceHATask) {
                criteria.serviceHATask = hostObj.serviceHATask;
            }
            else {
                criteria.ip = hostObj.ip;
                criteria.hostname = hostObj.hostname;
            }

            mongo.update(hostCollectionName, criteria, {'$set': hostObj}, {'upsert': true}, function (err) {
                if (err)
                    return cb(err, false);
                else
                    return cb(null, true);
            });
        }
        else
            return cb(null, false);
    },
    "loadOtherEnvHosts": function (param, cb) {
        initMongo(param.dbConfig);
        var pattern = new RegExp("controller", "i");
        var condition = (process.env.SOAJS_TEST) ? {'name': {'$regex': pattern}} : {
            'name': {'$regex': pattern},
            'env': {'$ne': param.envCode}
        };
        mongo.find(hostCollectionName, condition, cb);
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
    "getAllEnvironments": function (cb) {
        mongo.find(environmentCollectionName, {}, cb);
    },
    "addUpdateEnvControllers": function (param, cb) {
        let condition = {
            "env": param.env.toLowerCase(),
            "ip": param.ip
        };

        if (!process.env.SOAJS_MANUAL) {
            condition.ip = "127.0.0.1";
        }

        if (param.data && param.data.services) {
            for (let service in param.data.services) {
                if (param.data.services[service].awarenessStats) {
                    for (let hostIp in param.data.services[service].awarenessStats) {
                        let hostIp2 = hostIp.replace(/\./g, "_dot_");
                        param.data.services[service].awarenessStats[hostIp2] = soajsUtils.cloneObj(param.data.services[service].awarenessStats[hostIp]);
                        if (hostIp2 !== hostIp)
                            delete param.data.services[service].awarenessStats[hostIp];
                    }
                }
                if (param.data.services[service].hosts) {
                    for (let ver in param.data.services[service].hosts) {
                        let san_ver = soajsLib.version.sanitize(ver);
                        param.data.services[service].hosts[san_ver] = soajsUtils.cloneObj(param.data.services[service].hosts[ver]);
                        if (san_ver !== ver)
                            delete param.data.services[service].hosts[ver];
                    }
                }
                if (param.data.services[service].versions) {
                    for (let ver in param.data.services[service].versions) {
                        let san_ver = soajsLib.version.sanitize(ver);
                        param.data.services[service].versions[san_ver] = soajsUtils.cloneObj(param.data.services[service].versions[ver]);
                        if (san_ver !== ver)
                            delete param.data.services[service].versions[ver];
                    }
                }
            }
        }

        if (param.data && param.data.daemons) {
            for (let service in param.data.daemons) {
                if (param.data.daemons[service].awarenessStats) {
                    for (let hostIp in param.data.daemons[service].awarenessStats) {
                        let hostIp2 = hostIp.replace(/\./g, "_dot_");
                        param.data.daemons[service].awarenessStats[hostIp2] = soajsUtils.cloneObj(param.data.daemons[service].awarenessStats[hostIp]);
                        delete param.data.daemons[service].awarenessStats[hostIp];
                    }
                }
                if (param.data.daemons[service].hosts) {
                    for (let ver in param.data.daemons[service].hosts) {
                        let san_ver = soajsLib.version.sanitize(ver);
                        param.data.daemons[service].hosts[san_ver] = soajsUtils.cloneObj(param.data.daemons[service].hosts[ver]);
                        delete param.data.daemons[service].hosts[ver];
                    }
                }
                if (param.data.daemons[service].versions) {
                    for (let ver in param.data.daemons[service].versions) {
                        let san_ver = soajsLib.version.sanitize(ver);
                        param.data.daemons[service].versions[san_ver] = soajsUtils.cloneObj(param.data.daemons[service].versions[ver]);
                        delete param.data.daemons[service].versions[ver];
                    }
                }
            }
        }

        let document = {
            "$set": {
                "data": param.data,
                "ts": param.ts
            }
        };
        mongo.update(controllersCollectionName, condition, document, {
            "upsert": true,
            "safe": true,
            "multi": false
        }, cb);
    }
};