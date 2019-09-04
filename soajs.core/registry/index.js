'use strict';
//var fs = require('fs');
let os = require("os");
let request = require('request');
let async = require('async');
let soajsLib = require("soajs.core.libs");

var autoRegHost = process.env.SOAJS_SRV_AUTOREGISTERHOST || true;
if (autoRegHost && typeof(autoRegHost) !== 'boolean') {
    autoRegHost = (autoRegHost === 'true');
}

var regEnvironment = (process.env.SOAJS_ENV || "dev");
regEnvironment = regEnvironment.toLowerCase();

var registry_struct = {};
registry_struct[regEnvironment] = null;
var autoReloadTimeout = {};
var models = {};

var build = {
    "metaAndCoreDB": function (STRUCT, envCode) {
        var metaAndCoreDB = {"metaDB": {}, "coreDB": {}};

        if (STRUCT && STRUCT.dbs && STRUCT.dbs.databases) {
            for (var dbName in STRUCT.dbs.databases) {
                if (Object.hasOwnProperty.call(STRUCT.dbs.databases, dbName)) {
                    var dbRec = STRUCT.dbs.databases[dbName];
                    var dbObj = null;

                    if (dbRec.cluster) {
                        var clusterRec = {};
                        if (STRUCT.dbs.clusters && STRUCT.dbs.clusters[dbRec.cluster])
                            clusterRec = STRUCT.dbs.clusters[dbRec.cluster];
                        else if (STRUCT.resources && STRUCT.resources.cluster && STRUCT.resources.cluster[dbRec.cluster])
                            clusterRec = STRUCT.resources.cluster[dbRec.cluster];
                        dbObj = {
                            "prefix": (dbRec.prefix && dbRec.prefix !== "") ? dbRec.prefix : STRUCT.dbs.config.prefix,
                            "cluster": dbRec.cluster
                        };
                        if (clusterRec.config) {
                            for (var dataConf in clusterRec.config) {
                                if (Object.hasOwnProperty.call(clusterRec.config, dataConf)) {
                                    dbObj[dataConf] = clusterRec.config[dataConf];
                                }
                            }
                        }
                        else {
                            dbObj.servers = clusterRec.servers || null;
                            dbObj.credentials = clusterRec.credentials || null;
                            dbObj.streaming = clusterRec.streaming || null;
                            dbObj.URLParam = clusterRec.URLParam || null;
                            dbObj.extraParam = clusterRec.extraParam || null;
                        }
                    }
                    else {
                        dbObj = {
                            "prefix": (dbRec.prefix && dbRec.prefix !== "") ? dbRec.prefix : STRUCT.dbs.config.prefix,
                            "servers": dbRec.servers || null,
                            "credentials": dbRec.credentials,
                            "streaming": dbRec.streaming || null,
                            "URLParam": dbRec.URLParam || null,
                            "extraParam": dbRec.extraParam || null
                        };
                    }
                    if (dbRec.tenantSpecific) {
                        dbObj.name = "#TENANT_NAME#_" + dbName;
                        metaAndCoreDB.metaDB[dbName] = dbObj;
                    }
                    else {
                        dbObj.registryLocation = {"l1": "coreDB", "l2": dbName, "env": envCode};
                        dbObj.name = dbName;
                        metaAndCoreDB.coreDB[dbName] = dbObj;
                    }
                }
            }
        }

        return metaAndCoreDB;
    },

    "sessionDB": function (STRUCT, env) {
        var sessionDB = null;
        if (STRUCT && STRUCT.dbs && STRUCT.dbs.config) {
            var dbRec = {};
            if (STRUCT.dbs.config.session)
                dbRec = STRUCT.dbs.config.session;
            else if (STRUCT.dbs.session)
                dbRec = STRUCT.dbs.session;
            sessionDB = {
                "name": dbRec.name,
                "prefix": (dbRec.prefix && dbRec.prefix !== "") ? dbRec.prefix : STRUCT.dbs.config.prefix,
                'store': dbRec.store,
                "collection": dbRec.collection,
                'stringify': dbRec.stringify,
                'expireAfter': dbRec.expireAfter,
                'registryLocation': {
                    "l1": "coreDB", "l2": "session", "env": env
                }
            };
            if (dbRec.cluster) {
                var clusterRec = {};
                if (STRUCT.dbs.clusters && STRUCT.dbs.clusters[dbRec.cluster])
                    clusterRec = STRUCT.dbs.clusters[dbRec.cluster];
                else if (STRUCT.resources && STRUCT.resources.cluster && STRUCT.resources.cluster[dbRec.cluster])
                    clusterRec = STRUCT.resources.cluster[dbRec.cluster];

                sessionDB.cluster = dbRec.cluster;

                if (clusterRec.config) {
                    for (var dataConf in clusterRec.config) {
                        if (Object.hasOwnProperty.call(clusterRec.config, dataConf)) {
                            sessionDB[dataConf] = clusterRec.config[dataConf];
                        }
                    }
                }
                else {
                    sessionDB.servers = clusterRec.servers || null;
                    sessionDB.credentials = clusterRec.credentials || null;
                    sessionDB.URLParam = clusterRec.URLParam || null;
                    sessionDB.extraParam = clusterRec.extraParam || null;
                }
            }
            else {
                sessionDB.servers = dbRec.servers || null;
                sessionDB.credentials = dbRec.credentials || null;
                sessionDB.URLParam = dbRec.URLParam || null;
                sessionDB.extraParam = dbRec.extraParam || null;
            }
        }
        return sessionDB;
    },

    "allServices": function (STRUCT, servicesObj) {
        if (STRUCT && Array.isArray(STRUCT) && STRUCT.length > 0) {
            for (var i = 0; i < STRUCT.length; i++) {
                if (STRUCT[i].name === 'controller') {
                    continue;
                }
                servicesObj[STRUCT[i].name] = {
                    "group": STRUCT[i].group || "service",
                    "port": STRUCT[i].port,
                    //"versions": STRUCT[i].versions,
                    "requestTimeoutRenewal": STRUCT[i].requestTimeoutRenewal || 0,
                    "requestTimeout": STRUCT[i].requestTimeout || 30,
                    "maintenance": STRUCT[i].maintenance || null
                };
                if (STRUCT[i].src && STRUCT[i].src.provider && STRUCT[i].src.provider === "endpoint") {
                    servicesObj[STRUCT[i].name].srcType = STRUCT[i].src.provider;
                    servicesObj[STRUCT[i].name].src = STRUCT[i].src;
                }
                //TODO semVerX
                if (STRUCT[i].versions) {
                    servicesObj[STRUCT[i].name].versions = {};
                    for (let ver in STRUCT[i].versions) {
                        if (Object.hasOwnProperty.call(STRUCT[i].versions, ver)) {
                            let unsanitizedVer = soajsLib.version.unsanitize(ver);
                            servicesObj[STRUCT[i].name].versions[unsanitizedVer] = STRUCT[i].versions[ver];

                            if (!servicesObj[STRUCT[i].name].version) {
                                servicesObj[STRUCT[i].name].version = unsanitizedVer;
                                servicesObj[STRUCT[i].name].extKeyRequired = servicesObj[STRUCT[i].name].versions[unsanitizedVer].extKeyRequired || false;
                                servicesObj[STRUCT[i].name].oauth = servicesObj[STRUCT[i].name].versions[unsanitizedVer].oauth || false;
                            }
                            else if (soajsLib.version.isLatest(unsanitizedVer, servicesObj[STRUCT[i].name].version)) {
                                servicesObj[STRUCT[i].name].version = unsanitizedVer;
                                servicesObj[STRUCT[i].name].extKeyRequired = servicesObj[STRUCT[i].name].versions[unsanitizedVer].extKeyRequired || false;
                                servicesObj[STRUCT[i].name].oauth = servicesObj[STRUCT[i].name].versions[unsanitizedVer].oauth || false;
                            }
                        }
                    }
                }
            }
        }
    },

    "allDaemons": function (STRUCT, servicesObj) {
        if (STRUCT && Array.isArray(STRUCT) && STRUCT.length > 0) {
            for (var i = 0; i < STRUCT.length; i++) {
                if (STRUCT[i].name === 'controller') {
                    continue;
                }
                servicesObj[STRUCT[i].name] = {
                    "group": STRUCT[i].group || "daemon",
                    "port": STRUCT[i].port,
                    //"versions": STRUCT[i].versions,
                    "maintenance": STRUCT[i].maintenance || null
                };

                //TODO semVerX
                if (STRUCT[i].versions) {
                    servicesObj[STRUCT[i].name].versions = {};
                    for (let ver in STRUCT[i].versions) {
                        if (Object.hasOwnProperty.call(STRUCT[i].versions, ver)) {
                            let unsanitizedVer = soajsLib.version.unsanitize(ver);
                            servicesObj[STRUCT[i].name].versions[unsanitizedVer] = STRUCT[i].versions[ver];
                        }
                    }
                }
            }
        }
    },

    "servicesHosts": function (STRUCT, servicesObj) {
        if (STRUCT && Array.isArray(STRUCT) && STRUCT.length > 0) {
            for (var i = 0; i < STRUCT.length; i++) {
                if (STRUCT[i].env === regEnvironment) {
                    if (servicesObj[STRUCT[i].name]) {

                        if (STRUCT[i].env.toUpperCase() !== 'DASHBOARD' && STRUCT[i].port && !isNaN(STRUCT[i].port)) {
                            servicesObj[STRUCT[i].name].port = STRUCT[i].port
                        }

                        if (!STRUCT[i].version)
                            STRUCT[i].version = "1";
                        if (!servicesObj[STRUCT[i].name].hosts) {
                            servicesObj[STRUCT[i].name].hosts = {};
                            servicesObj[STRUCT[i].name].hosts.latest = STRUCT[i].version;
                            servicesObj[STRUCT[i].name].hosts[STRUCT[i].version] = [];
                        }
                        if (!servicesObj[STRUCT[i].name].hosts[STRUCT[i].version]) {
                            servicesObj[STRUCT[i].name].hosts[STRUCT[i].version] = [];
                        }
                        if (soajsLib.version.isLatest(STRUCT[i].version, servicesObj[STRUCT[i].name].hosts.latest)) {
                            servicesObj[STRUCT[i].name].hosts.latest = STRUCT[i].version;
                        }
                        if (servicesObj[STRUCT[i].name].hosts[STRUCT[i].version].indexOf(STRUCT[i].ip) === -1) {
                            servicesObj[STRUCT[i].name].hosts[STRUCT[i].version].push(STRUCT[i].ip);
                        }
                    }
                }
            }
        }
    },

    "controllerHosts": function (STRUCT, controllerObj) {
        if (STRUCT && Array.isArray(STRUCT) && STRUCT.length > 0) {
            for (var i = 0; i < STRUCT.length; i++) {
                if (STRUCT[i].name === "controller" && STRUCT[i].env === regEnvironment) {
                    if (!STRUCT[i].version)
                        STRUCT[i].version = "1";
                    if (!controllerObj.hosts) {
                        controllerObj.hosts = {};
                        controllerObj.hosts.latest = STRUCT[i].version;
                        controllerObj.hosts[STRUCT[i].version] = [];
                    }
                    if (!controllerObj.hosts[STRUCT[i].version]) {
                        controllerObj.hosts[STRUCT[i].version] = [];
                    }
                    if (STRUCT[i].version > controllerObj.hosts.latest) {
                        controllerObj.hosts.latest = STRUCT[i].version;
                    }
                    if (controllerObj.hosts[STRUCT[i].version].indexOf(STRUCT[i].ip) === -1) {
                        controllerObj.hosts[STRUCT[i].version].push(STRUCT[i].ip);
                    }
                }
            }
        }
    },

    "registerNewService": function (dbConfiguration, serviceObj, collection, cb) {
        var port = parseInt(serviceObj.port);
        if (isNaN(port)) {
            var error1 = new Error('Service port must be integer: [' + serviceObj.port + ']');
            return cb(error1);
        }
        return registryModule.model.registerNewService(dbConfiguration, serviceObj, collection, cb);
    },

    "buildRegistry": function (registry, registryDBInfo, callback) {
        var metaAndCoreDB = build.metaAndCoreDB(registryDBInfo.ENV_schema, registry.environment);
        registry["tenantMetaDB"] = metaAndCoreDB.metaDB;
        if (!registryDBInfo.ENV_schema || !registryDBInfo.ENV_schema.services || !registryDBInfo.ENV_schema.services.config) {
            var err = new Error('Unable to get [' + registry.environment + '] environment services from db');
            return callback(err);
        }

        registry["domain"] = registryDBInfo.ENV_schema.domain;
        registry["apiPrefix"] = registryDBInfo.ENV_schema.apiPrefix;
        registry["sitePrefix"] = registryDBInfo.ENV_schema.sitePrefix;
        registry["protocol"] = registryDBInfo.ENV_schema.protocol;
        registry["port"] = registryDBInfo.ENV_schema.port;

        registry["endpoints"] = registryDBInfo.ENV_schema.endpoints || {};

        registry["serviceConfig"] = registryDBInfo.ENV_schema.services.config;

        registry["deployer"] = registryDBInfo.ENV_schema.deployer || {};

        registry["custom"] = registryDBInfo.ENV_schema.custom || {};

        registry["resources"] = registryDBInfo.ENV_schema.resources || {};

        for (var coreDBName in metaAndCoreDB.coreDB) {
            if (Object.hasOwnProperty.call(metaAndCoreDB.coreDB, coreDBName)) {
                registry["coreDB"][coreDBName] = metaAndCoreDB.coreDB[coreDBName];
            }
        }

        registry["services"] = {
            "controller": {
                "group": "controller",
                "maxPoolSize": registryDBInfo.ENV_schema.services.controller.maxPoolSize,
                "authorization": registryDBInfo.ENV_schema.services.controller.authorization,
                "port": registryDBInfo.ENV_schema.services.config.ports.controller,
                "requestTimeout": registryDBInfo.ENV_schema.services.controller.requestTimeout || 30,
                "requestTimeoutRenewal": registryDBInfo.ENV_schema.services.controller.requestTimeoutRenewal || 0
            }
        };

        registry["coreDB"]["session"] = build.sessionDB(registryDBInfo.ENV_schema, registry.environment);

        registry["daemons"] = {};
        return callback(null);
    },

    "buildSpecificRegistry": function (param, registry, registryDBInfo, callback) {

        function resume(what) {
            if (!process.env.SOAJS_DEPLOY_HA)
                build.controllerHosts(registryDBInfo.ENV_hosts, registry["services"].controller);

            if (!autoRegHost || param.reload) {
                return callback(null);
            }
            else if (param.serviceIp) {
                if (registry.serviceConfig.awareness.autoRegisterService) {
                    registry[what][param.serviceName].newServiceOrHost = true;
                    if (!registry[what][param.serviceName].hosts) {
                        registry[what][param.serviceName].hosts = {};
                        registry[what][param.serviceName].hosts.latest = param.serviceVersion;
                        registry[what][param.serviceName].hosts[param.serviceVersion] = [];
                    }
                    if (!registry[what][param.serviceName].hosts[param.serviceVersion]) {
                        registry[what][param.serviceName].hosts[param.serviceVersion] = [];
                    }
                    if (registry[what][param.serviceName].hosts[param.serviceVersion].indexOf(param.serviceIp) === -1)
                        registry[what][param.serviceName].hosts[param.serviceVersion].push(param.serviceIp);
                }
                return callback(null);
            }
            else {
                if (!param.serviceIp && !process.env.SOAJS_DEPLOY_HA) {
                    var err = new Error("Unable to register new host ip [" + param.serviceIp + "] for service [" + param.serviceName + "]");
                    return callback(err);
                }
                return callback(null);
            }
        }

        function buildAll() {
            build.allServices(registryDBInfo.services_schema, registry["services"]);

            if (!process.env.SOAJS_DEPLOY_HA)
                build.servicesHosts(registryDBInfo.ENV_hosts, registry["services"]);

            build.allDaemons(registryDBInfo.daemons_schema, registry["daemons"]);

            if (!process.env.SOAJS_DEPLOY_HA)
                build.servicesHosts(registryDBInfo.ENV_hosts, registry["daemons"]);
        }

        if (param.serviceName === "controller") {

            let newServiceObj = {
                'name': "controller",
                'port': 4000,
            };
            if (param.maintenance) {
                newServiceObj.maintenance = param.maintenance;
            }
            build.registerNewService(registry.coreDB.provision, newServiceObj, 'services', function (error) {
                if (error) {
                    var err = new Error('Unable to register new daemon service ' + param.serviceName + ' : ' + error.message);
                    return callback(err);
                }
                buildAll();
                return resume("services");
            });
        }
        else {
            if (param.type && param.type === "daemon") {
                //var schemaPorts = registryDBInfo.ENV_schema.services.config.ports;
                registry["daemons"][param.serviceName] = {
                    'group': param.serviceGroup,
                    'port': param.designatedPort,
                    'version': param.serviceVersion,
                };
                if (process.env.SOAJS_REGISTRY_BUILDALL)
                    buildAll();
                if (param.reload) {
                    return resume("daemons");
                }
                else {
                    //adding daemon service for the first time to services collection
                    var newDaemonServiceObj = {
                        'name': param.serviceName,
                        'group': param.serviceGroup,
                        'port': registry["daemons"][param.serviceName].port,
                        'versions': {}
                    };
                    newDaemonServiceObj.versions[param.serviceVersion] = {
                        'jobs': param.jobList
                    };

                    if (param.maintenance) {
                        newDaemonServiceObj.maintenance = param.maintenance;
                    }

                    build.registerNewService(registry.coreDB.provision, newDaemonServiceObj, 'daemons', function (error) {
                        if (error) {
                            var err = new Error('Unable to register new daemon service ' + param.serviceName + ' : ' + error.message);
                            return callback(err);
                        }
                        return resume("daemons");
                    });
                }
            }
            else {
                //var schemaPorts = registryDBInfo.ENV_schema.services.config.ports;
                registry["services"][param.serviceName] = {
                    'group': param.serviceGroup,
                    'port': param.designatedPort,
                    'requestTimeout': param.requestTimeout,
                    'requestTimeoutRenewal': param.requestTimeoutRenewal,

                    'version': param.serviceVersion,
                    'extKeyRequired': param.extKeyRequired || false
                };
                if (process.env.SOAJS_REGISTRY_BUILDALL)
                    buildAll();
                if (param.reload)
                    return resume("services");
                else {
                    //adding service for the first time to services collection
                    var newServiceObj = {
                        'name': param.serviceName,
                        'group': param.serviceGroup,
                        'port': registry["services"][param.serviceName].port,
                        'swagger': param.swagger,
                        'requestTimeout': registry["services"][param.serviceName].requestTimeout,
                        'requestTimeoutRenewal': registry["services"][param.serviceName].requestTimeoutRenewal,
                        'versions': {}
                    };
                    newServiceObj.versions[param.serviceVersion] = {
                        "extKeyRequired": registry["services"][param.serviceName].extKeyRequired,
                        "urac": param.urac,
                        "urac_Profile": param.urac_Profile,
                        "urac_ACL": param.urac_ACL,
                        "urac_Config": param.urac_Config,
                        "urac_GroupConfig": param.urac_GroupConfig,
                        "tenant_Profile": param.tenant_Profile,
                        "provision_ACL": param.provision_ACL,
                        "oauth": param.oauth,
                        "apis": param.apiList
                    };

                    if (param.maintenance) {
                        newServiceObj.maintenance = param.maintenance;
                    }

                    build.registerNewService(registry.coreDB.provision, newServiceObj, 'services', function (error) {
                        if (error) {
                            var err = new Error('Unable to register new service ' + param.serviceName + ' : ' + error.message);
                            return callback(err);
                        }
                        return resume("services");
                    });
                }
            }
        }
    }
};

function loadProfile(envFrom, cb) {
    registryModule.model.loadProfile(envFrom, function (err, registry) {
        if (registry) {
            if (!registry_struct[registry.environment])
                registry_struct[registry.environment] = registry;
            else {
                registry_struct[registry.environment].timeLoaded = registry.timeLoaded;
                registry_struct[registry.environment].name = registry.name;
                registry_struct[registry.environment].environment = registry.environment;
                registry_struct[registry.environment].profileOnly = registry.profileOnly;
                registry_struct[registry.environment].coreDB.provision = registry.coreDB.provision;
            }
        }
        return cb(err, registry);
    });
}

function loadRegistry(param, cb) {
    if (registryModule.modelName === "api") {
        registryModule.model.fetchRegistry(param, function (err, registry) {
            if (!err) {
                registry.profileOnly = false;
                registry_struct[registry.environment] = registry;
            }
            return cb(err);
        });
    }
    else {
        loadProfile(param.envCode, function (err, registry) {
            if (registry) {
                registryModule.model.loadData(registry.coreDB.provision, registry.environment, param, function (error, RegistryFromDB) {
                    if (error || !RegistryFromDB)
                        return cb(error);
                    else {
                        build.buildRegistry(registry, RegistryFromDB, function (err) {
                            if (err)
                                return cb(err);
                            if (param.donotBbuildSpecificRegistry) {
                                return cb(null);
                            }
                            else {
                                build.buildSpecificRegistry(param, registry, RegistryFromDB, function (err) {
                                    if (!err) {
                                        registry.profileOnly = false;
                                        registry_struct[registry.environment] = registry;
                                    }
                                    return cb(err);
                                });
                            }
                        });
                    }
                });
            }
            else {
                return cb(new Error("Empty profile, unable to continue loading registry"));
            }
        });
    }
}

var getRegistry = function (param, cb) {
    if (param.reload || process.env.SOAJS_TEST || !registry_struct[param.envCode] || registry_struct[param.envCode].profileOnly) {
        loadRegistry(param, function (err) {
            if (err && registry_struct && registry_struct[param.envCode] && registry_struct[param.envCode].profileOnly)
                registry_struct[param.envCode] = null;
            var reg = registry_struct[param.envCode];
            if (reg && reg.serviceConfig.awareness.autoRelaodRegistry) {
                var autoReload = function () {
                    getRegistry(param, function (err, reg) {
                        // cb(err, reg);
                    });
                };
                if (!autoReloadTimeout[reg.environment])
                    autoReloadTimeout[reg.environment] = {};
                if (autoReloadTimeout[reg.environment].timeout)
                    clearTimeout(autoReloadTimeout[reg.environment].timeout);
                autoReloadTimeout[reg.environment].setBy = param.setBy;
                autoReloadTimeout[reg.environment].timeout = setTimeout(autoReload, reg.serviceConfig.awareness.autoRelaodRegistry);
            }

            return cb(err, registry_struct[param.envCode]);
        });
    }
    else {
        return cb(null, registry_struct[param.envCode]);
    }
};

var registryModule = {
    "init": function (modelName) {
        if (process.env.SOAJS_SOLO && process.env.SOAJS_SOLO === "true") {
            registryModule.modelName = "local";
        }
        else if (process.env.SOAJS_REGISTRY_API) {
            registryModule.modelName = "api";
        }
        else {
            registryModule.modelName = "mongo";
        }
        models[registryModule.modelName] = require("./" + registryModule.modelName + ".js");
        models[registryModule.modelName].init();
        registryModule.model = models[registryModule.modelName];
    },

    "modelName": "mongo",
    "model": null,

    "profile": function (cb) {
        loadProfile(regEnvironment, function (err, registry) {
            return cb(registry);
        });
    },
    "register": function (param, cb) {
        if (param.ip && param.name) {
            param.extKeyRequired = param.extKeyRequired || false;
            var what = ((param.type === "service") ? "services" : "daemons");
            if (!registry_struct[regEnvironment][what][param.name]) {
                if (!param.port) {
                    return cb(new Error("unable to register service. missing port param"));
                }
                if (param.type === "service") {
                    registry_struct[regEnvironment][what][param.name] = {
                        "group": param.group,
                        "port": param.port,
                        "requestTimeout": param.requestTimeout,
                        "requestTimeoutRenewal": param.requestTimeoutRenewal
                    };
                }
                else {
                    registry_struct[regEnvironment][what][param.name] = {
                        "group": param.group,
                        "port": param.port
                    };
                }
            }
            else {
                if (registry_struct[regEnvironment][what][param.name].port != param.port)
                    registry_struct[regEnvironment][what][param.name].port = param.port;
            }

            if (param.maintenance) {
                registry_struct[regEnvironment][what][param.name].maintenance = param.maintenance;
            }

            registry_struct[regEnvironment][what][param.name].extKeyRequired = param.extKeyRequired;
            registry_struct[regEnvironment][what][param.name].version = param.version;

            if (!registry_struct[regEnvironment][what][param.name].versions)
                registry_struct[regEnvironment][what][param.name].versions = {};
            if (registry_struct[regEnvironment][what][param.name].versions[param.version]) {
                registry_struct[regEnvironment][what][param.name].versions[param.version].extKeyRequired = param.extKeyRequired;
                registry_struct[regEnvironment][what][param.name].versions[param.version].oauth = param.oauth;
                registry_struct[regEnvironment][what][param.name].versions[param.version].urac = param.urac;
                registry_struct[regEnvironment][what][param.name].versions[param.version].urac_Profile = param.urac_Profile;
                registry_struct[regEnvironment][what][param.name].versions[param.version].urac_ACL = param.urac_ACL;
                registry_struct[regEnvironment][what][param.name].versions[param.version].urac_Config = param.urac_Config;
                registry_struct[regEnvironment][what][param.name].versions[param.version].urac_GroupConfig = param.urac_GroupConfig;
                registry_struct[regEnvironment][what][param.name].versions[param.version].tenant_Profile = param.tenant_Profile;
                registry_struct[regEnvironment][what][param.name].versions[param.version].provision_ACL = param.provision_ACL;
            }
            else {
                registry_struct[regEnvironment][what][param.name].versions[param.version] = {
                    "extKeyRequired": param.extKeyRequired,
                    "oauth": param.oauth,
                    "urac": param.urac,
                    "urac_Profile": param.urac_Profile,
                    "urac_ACL": param.urac_ACL,
                    "urac_Config": param.urac_Config,
                    "urac_GroupConfig": param.urac_GroupConfig,
                    "tenant_Profile": param.tenant_Profile,
                    "provision_ACL": param.provision_ACL
                };
            }

            if (!registry_struct[regEnvironment][what][param.name].hosts) {
                registry_struct[regEnvironment][what][param.name].hosts = {};
                registry_struct[regEnvironment][what][param.name].hosts.latest = param.version;
            }

            if (!registry_struct[regEnvironment][what][param.name].hosts[param.version]) {
                registry_struct[regEnvironment][what][param.name].hosts[param.version] = [];
            }

            if (registry_struct[regEnvironment][what][param.name].hosts[param.version].indexOf(param.ip) === -1)
                registry_struct[regEnvironment][what][param.name].hosts[param.version].push(param.ip);

            registry_struct[regEnvironment].timeLoaded = new Date().getTime();

            //register in DB if MW
            if (param.mw) {
                if ("daemon" === param.type) {
                    //adding daemon service for the first time to services collection
                    let newDaemonServiceObj = {
                        'name': param.name,
                        'group': param.group,
                        'port': param.port
                    };
                    if (param.maintenance) {
                        newServiceObj.maintenance = param.maintenance;
                    }

                    build.registerNewService(registry_struct[regEnvironment].coreDB.provision, newDaemonServiceObj, 'daemons', function (error) {
                        if (error) {
                            var err = new Error('Unable to register new daemon service ' + param.serviceName + ' : ' + error.message);
                            return cb(err);
                        }
                        return cb(null, registry_struct[regEnvironment][what][param.name]);
                    });
                }
                else {
                    //adding service for the first time to services collection
                    var newServiceObj = {
                        'name': param.name,
                        'group': param.group,
                        'port': param.port,
                        'swagger': param.swagger,
                        'requestTimeout': param.requestTimeout,
                        'requestTimeoutRenewal': param.requestTimeoutRenewal,
                        'versions': {}
                    };
                    newServiceObj.versions[param.version] = {
                        "extKeyRequired": param.extKeyRequired,
                        "urac": param.urac,
                        "urac_Profile": param.urac_Profile,
                        "urac_ACL": param.urac_ACL,
                        "urac_Config": param.urac_Config,
                        "urac_GroupConfig": param.urac_GroupConfig,
                        "tenant_Profile": param.tenant_Profile,
                        "provision_ACL": param.provision_ACL,
                        "oauth": param.oauth
                    };
                    if (param.maintenance) {
                        newServiceObj.maintenance = param.maintenance;
                    }
                    if (param.apiList) {
                        param.version = "" + (param.version || 1);
                        newServiceObj.versions[param.version].apis = param.apiList;
                    }

                    try {
                        registryModule.registerHost({
                            "serviceName": param.name,
                            "serviceVersion": param.version,
                            "servicePort": param.port,
                            "serviceIp": param.ip
                        }, registry_struct[regEnvironment], (registered) => {
                        });
                    }
                    catch (e){

                    }

                    build.registerNewService(registry_struct[regEnvironment].coreDB.provision, newServiceObj, 'services', function (error) {
                        if (error) {
                            let err = new Error('Unable to register new service ' + param.serviceName + ' : ' + error.message);
                            return cb(err);
                        }
                        return cb(null, registry_struct[regEnvironment][what][param.name]);
                    });
                }
            }
            else
                return cb(null, registry_struct[regEnvironment][what][param.name]);
        }
        else
            return cb(new Error("unable to register service. missing ip or name param"));
    },
    "getCustom": function (envCode) {
        var env = envCode || regEnvironment;
        return registry_struct[env].custom;
    },
    "get": function (envCode) {
        var env = envCode || regEnvironment;
        return registry_struct[env];
    },
    "load": function (param, cb) {
        if (!param) param = {};
        param.reload = false;
        param.envCode = regEnvironment;
        param.setBy = "load"
        return getRegistry(param, function (err, reg) {
            if (err)
                throw new Error('Unable to load Registry Db Info: ' + err.message);
            else
                return cb(reg);
        });
    },
    "reload": function (param, cb) {
        if (!param) param = {};
        param.reload = true;
        param.envCode = regEnvironment;
        param.setBy = "reload";
        getRegistry(param, function (err, reg) {
            cb(err, reg);
            var envArray = [];
            for (var envCode in registry_struct) {
                if (Object.hasOwnProperty.call(registry_struct, envCode)) {
                    if (envCode !== regEnvironment && registry_struct[envCode]) {
                        envArray.push({"reload": true, "envCode": envCode});
                    }
                }
            }
            if (envArray.length > 0) {
                async.mapSeries(envArray, getRegistry, function (err, results) {
                });
            }
        });
    },
    "loadByEnv": function (param, cb) {
        if (!param) param = {};
        param.reload = true;
        param.envCode = param.envCode.toLowerCase();
        param.setBy = "loadByEnv";

        if (!Object.hasOwnProperty.call(param, "donotBbuildSpecificRegistry"))
            param.donotBbuildSpecificRegistry = true;

        return getRegistry(param, function (err, reg) {
            if (err)
                return cb(err);

            return cb(null, reg);
        });
    },
    "loadOtherEnvControllerHosts": function (cb) {
        var dbConfig = null;
        var getHosts = function () {
            if (dbConfig) {
                return registryModule.model.loadOtherEnvHosts({
                    "envCode": regEnvironment,
                    "dbConfig": dbConfig
                }, cb);
            }
            else
                return cb(new Error("unable to find provision config information to connect to!"));
        };
        if (registry_struct[regEnvironment]) {
            dbConfig = registry_struct[regEnvironment].coreDB.provision;
            getHosts();
        }
        else {
            loadProfile(regEnvironment, function (err, registry) {
                dbConfig = registry.coreDB.provision;
                getHosts();
            });
        }
    },
    "registerHost": function (param, registry, cb) {
        if (param.serviceIp) {
            var hostObj = {
                'env': registry.name.toLowerCase(),
                'name': param.serviceName,
                'ip': param.serviceIp,
                'port': param.servicePort,
                //'gatewayPort': registry.serviceConfig.ports.controller,
                'hostname': os.hostname().toLowerCase(),
                'version': param.serviceVersion
            };
            if (param.serviceHATask)
                hostObj.serviceHATask = param.serviceHATask;

            registryModule.model.addUpdateServiceIP(registry.coreDB.provision, hostObj, function (error, registered) {
                if (error) {
                    throw new Error("Unable to register new host for service:" + error.message);
                }
                cb(registered);
            });
        }
        else {
            cb(false);
        }
    },
    "autoRegisterService": function (param, cb) {
        var controllerSRV = registry_struct[regEnvironment].services.controller;
        var serviceSRV = registry_struct[regEnvironment][param.what][param.name];
        // if param.mw=1 means endpoint is registering, we should call register on gateway
        if ((!serviceSRV || !serviceSRV.newServiceOrHost) && !param.mw) {
            return cb(null, false);
        }

        if (controllerSRV && controllerSRV.hosts && controllerSRV.hosts.latest && controllerSRV.hosts[controllerSRV.hosts.latest]) {
            async.each(controllerSRV.hosts[controllerSRV.hosts.latest],
                function (ip, callback) {
                    var requestOptions = {
                        'uri': 'http://' + ip + ':' + (controllerSRV.port + registry_struct[regEnvironment].serviceConfig.ports.maintenanceInc) + '/register',
                        "json": true,
                        "method": "post"
                    };
                    requestOptions.qs = {};
                    requestOptions.body = {
                        "name": param.name,
                        "group": serviceSRV.group,
                        "port": param.port || serviceSRV.port,
                        "ip": param.serviceIp,
                        "version": param.serviceVersion
                    };

                    if (param.what === "daemons") {
                        requestOptions.body.type = "daemon";
                    }
                    else {
                        requestOptions.body.type = "service";
                        requestOptions.body.oauth = param.oauth;
                        requestOptions.body.urac = param.urac;
                        requestOptions.body.urac_Profile = param.urac_Profile;
                        requestOptions.body.urac_ACL = param.urac_ACL;
                        requestOptions.body.urac_Config = param.urac_Config;
                        requestOptions.body.urac_GroupConfig = param.urac_GroupConfig;
                        requestOptions.body.tenant_Profile = param.tenant_Profile;
                        requestOptions.body.provision_ACL = param.provision_ACL;
                        requestOptions.body.extKeyRequired = serviceSRV.extKeyRequired;
                        requestOptions.body.requestTimeout = serviceSRV.requestTimeout;
                        requestOptions.body.requestTimeoutRenewal = serviceSRV.requestTimeoutRenewal;
                        requestOptions.body.mw = param.mw;
                    }

                    if (param.serviceHATask)
                        requestOptions.qs.serviceHATask = param.serviceHATask;

                    request(requestOptions, function (error) {
                        return (error) ? callback(error) : callback(null);
                    });

                }, function (err) {
                    return (err) ? cb(err, false) : cb(null, true);
                });
        }
        else {
            return cb(new Error("Unable to find any controller host"), false);
        }
    },
    "getAllRegistriesInfo": function (cb) {
        registryModule.model.getAllEnvironments(cb);
    },
    "addUpdateEnvControllers": function (param, cb) {
        registryModule.model.addUpdateEnvControllers(param, cb);
    }
};
module.exports = registryModule;