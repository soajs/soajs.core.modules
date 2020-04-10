"use strict";

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const os = require("os");
const request = require('request');
const async = require('async');
const soajsLib = require("soajs.core.libs");

let autoRegHost = process.env.SOAJS_SRV_AUTOREGISTERHOST || true;
if (autoRegHost && typeof(autoRegHost) !== 'boolean') {
	autoRegHost = (autoRegHost === 'true');
}

let regEnvironment = (process.env.SOAJS_ENV || "dev");
regEnvironment = regEnvironment.toLowerCase();

let registry_struct = {};
registry_struct[regEnvironment] = null;
let autoReloadTimeout = {};
let models = {};

let modelName = "mongo";
let model = null;

let build = {
	"metaAndCoreDB": function (STRUCT, envCode, timeLoaded) {
		let metaAndCoreDB = {"metaDB": {}, "coreDB": {}};
		
		if (STRUCT && STRUCT.dbs && STRUCT.dbs.databases) {
			for (let dbName in STRUCT.dbs.databases) {
				if (Object.hasOwnProperty.call(STRUCT.dbs.databases, dbName)) {
					let dbRec = STRUCT.dbs.databases[dbName];
					let dbObj = null;
					
					if (dbRec.cluster) {
						let clusterRec = {};
						if (STRUCT.dbs.clusters && STRUCT.dbs.clusters[dbRec.cluster]) {
							clusterRec = STRUCT.dbs.clusters[dbRec.cluster];
						} else if (STRUCT.resources && STRUCT.resources.cluster && STRUCT.resources.cluster[dbRec.cluster]) {
							clusterRec = STRUCT.resources.cluster[dbRec.cluster];
						}
						dbObj = {
							"prefix": (dbRec.prefix && dbRec.prefix !== "") ? dbRec.prefix : STRUCT.dbs.config.prefix,
							"cluster": dbRec.cluster
						};
						if (clusterRec.config) {
							for (let dataConf in clusterRec.config) {
								if (Object.hasOwnProperty.call(clusterRec.config, dataConf)) {
									dbObj[dataConf] = clusterRec.config[dataConf];
								}
							}
						} else {
							dbObj.servers = clusterRec.servers || null;
							dbObj.credentials = clusterRec.credentials || null;
							dbObj.streaming = clusterRec.streaming || null;
							dbObj.URLParam = clusterRec.URLParam || null;
							dbObj.extraParam = clusterRec.extraParam || null;
						}
					} else {
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
						if (dbRec.cluster) {
							dbObj.registryLocation = {
								"l1": "metaDB",
								"l2": dbObj.name,
								"env": envCode,
								"cluster": dbRec.cluster,
								"timeLoaded": timeLoaded
							};
						}
					} else {
						dbObj.registryLocation = {
							"l1": "coreDB",
							"l2": dbName,
							"env": envCode,
							"timeLoaded": timeLoaded
						};
						if (dbRec.cluster) {
							dbObj.registryLocation.cluster = dbRec.cluster;
						}
						dbObj.name = dbName;
						metaAndCoreDB.coreDB[dbName] = dbObj;
					}
				}
			}
		}
		
		return metaAndCoreDB;
	},
	
	"sessionDB": function (STRUCT, env, timeLoaded) {
		let sessionDB = null;
		if (STRUCT && STRUCT.dbs && STRUCT.dbs.config) {
			let dbRec = {};
			if (STRUCT.dbs.config.session) {
				dbRec = STRUCT.dbs.config.session;
			} else if (STRUCT.dbs.session) {
				dbRec = STRUCT.dbs.session;
			}
			sessionDB = {
				"name": dbRec.name,
				"prefix": (dbRec.prefix && dbRec.prefix !== "") ? dbRec.prefix : STRUCT.dbs.config.prefix,
				'store': dbRec.store,
				"collection": dbRec.collection,
				'stringify': dbRec.stringify,
				'expireAfter': dbRec.expireAfter,
				'registryLocation': {
					"l1": "coreDB", "l2": "session", "env": env, "timeLoaded": timeLoaded
				}
			};
			if (dbRec.cluster) {
				let clusterRec = {};
				if (STRUCT.dbs.clusters && STRUCT.dbs.clusters[dbRec.cluster]) {
					clusterRec = STRUCT.dbs.clusters[dbRec.cluster];
				} else if (STRUCT.resources && STRUCT.resources.cluster && STRUCT.resources.cluster[dbRec.cluster]) {
					clusterRec = STRUCT.resources.cluster[dbRec.cluster];
				}
				sessionDB.cluster = dbRec.cluster;
				sessionDB.registryLocation.cluster = dbRec.cluster;
				
				if (clusterRec.config) {
					for (let dataConf in clusterRec.config) {
						if (Object.hasOwnProperty.call(clusterRec.config, dataConf)) {
							sessionDB[dataConf] = clusterRec.config[dataConf];
						}
					}
				} else {
					sessionDB.servers = clusterRec.servers || null;
					sessionDB.credentials = clusterRec.credentials || null;
					sessionDB.URLParam = clusterRec.URLParam || null;
					sessionDB.extraParam = clusterRec.extraParam || null;
				}
			} else {
				sessionDB.servers = dbRec.servers || null;
				sessionDB.credentials = dbRec.credentials || null;
				sessionDB.URLParam = dbRec.URLParam || null;
				sessionDB.extraParam = dbRec.extraParam || null;
			}
		}
		return sessionDB;
	},
	
	"allServices": function (STRUCT, servicesObj, gatewayServiceName) {
		if (STRUCT && Array.isArray(STRUCT) && STRUCT.length > 0) {
			for (let i = 0; i < STRUCT.length; i++) {
				if (STRUCT[i].name === gatewayServiceName || STRUCT[i].name === "controller") {
					continue;
				}
				servicesObj[STRUCT[i].name] = {
					"group": STRUCT[i].group || "service",
					"port": STRUCT[i].port,
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
							
							servicesObj[STRUCT[i].name].versions[unsanitizedVer] = {
								"extKeyRequired": STRUCT[i].versions[ver].extKeyRequired || false,
								"urac": STRUCT[i].versions[ver].urac || false,
								"urac_Profile": STRUCT[i].versions[ver].urac_Profile || false,
								"urac_ACL": STRUCT[i].versions[ver].urac_ACL || false,
								"urac_Config": STRUCT[i].versions[ver].urac_Config || false,
								"urac_GroupConfig": STRUCT[i].versions[ver].urac_GroupConfig || false,
								"tenant_Profile": STRUCT[i].versions[ver].tenant_Profile || false,
								"provision_ACL": STRUCT[i].versions[ver].provision_ACL || false,
								"oauth": STRUCT[i].versions[ver].oauth || false,
								"interConnect": STRUCT[i].versions[ver].interConnect || null
							};
							
							if (!servicesObj[STRUCT[i].name].version) {
								servicesObj[STRUCT[i].name].version = unsanitizedVer;
								servicesObj[STRUCT[i].name].extKeyRequired = servicesObj[STRUCT[i].name].versions[unsanitizedVer].extKeyRequired || false;
								servicesObj[STRUCT[i].name].oauth = servicesObj[STRUCT[i].name].versions[unsanitizedVer].oauth || false;
							} else if (soajsLib.version.isLatest(unsanitizedVer, servicesObj[STRUCT[i].name].version)) {
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
	
	"allDaemons": function (STRUCT, servicesObj, gatewayServiceName) {
		if (STRUCT && Array.isArray(STRUCT) && STRUCT.length > 0) {
			for (let i = 0; i < STRUCT.length; i++) {
				if (STRUCT[i].name === gatewayServiceName) {
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
							servicesObj[STRUCT[i].name].versions[unsanitizedVer] = {
								"extKeyRequired": STRUCT[i].versions[ver].extKeyRequired || false,
								"urac": STRUCT[i].versions[ver].urac || false,
								"urac_Profile": STRUCT[i].versions[ver].urac_Profile || false,
								"urac_ACL": STRUCT[i].versions[ver].urac_ACL || false,
								"urac_Config": STRUCT[i].versions[ver].urac_Config || false,
								"urac_GroupConfig": STRUCT[i].versions[ver].urac_GroupConfig || false,
								"tenant_Profile": STRUCT[i].versions[ver].tenant_Profile || false,
								"provision_ACL": STRUCT[i].versions[ver].provision_ACL || false,
								"oauth": STRUCT[i].versions[ver].oauth || false,
								"interConnect": STRUCT[i].versions[ver].interConnect || null
							};
						}
					}
				}
			}
		}
	},
	
	"servicesHosts": function (STRUCT, servicesObj) {
		if (STRUCT && Array.isArray(STRUCT) && STRUCT.length > 0) {
			for (let i = 0; i < STRUCT.length; i++) {
				if (STRUCT[i].env === regEnvironment) {
					if (servicesObj[STRUCT[i].name]) {
						
						if (STRUCT[i].env.toUpperCase() !== 'DASHBOARD' && STRUCT[i].port && !isNaN(STRUCT[i].port)) {
							servicesObj[STRUCT[i].name].oport = servicesObj[STRUCT[i].name].port;
							servicesObj[STRUCT[i].name].port = STRUCT[i].port;
						}
						
						if (!STRUCT[i].version) {
							STRUCT[i].version = "1";
						}
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
			for (let i = 0; i < STRUCT.length; i++) {
				if (STRUCT[i].name === controllerObj.name && STRUCT[i].env === regEnvironment) {
					if (!STRUCT[i].version) {
						STRUCT[i].version = controllerObj.version;
					}
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
		if (process.env.SOAJS_DEPLOY_HA) {
			return cb(null);
		}
		let port = parseInt(serviceObj.port);
		if (isNaN(port)) {
			let error1 = new Error('Service port must be integer: [' + serviceObj.port + ']');
			return cb(error1);
		}
		return model.registerNewService(dbConfiguration, serviceObj, collection, cb);
	},
	
	"buildRegistry": function (param, registry, registryDBInfo, callback) {
		let metaAndCoreDB = build.metaAndCoreDB(registryDBInfo.ENV_schema, registry.environment, registry.timeLoaded);
		registry.tenantMetaDB = metaAndCoreDB.metaDB;
		if (!registryDBInfo.ENV_schema || !registryDBInfo.ENV_schema.services || !registryDBInfo.ENV_schema.services.config) {
			let err = new Error('Unable to get [' + registry.environment + '] environment services from db');
			return callback(err);
		}
		
		registry.domain = registryDBInfo.ENV_schema.domain;
		registry.apiPrefix = registryDBInfo.ENV_schema.apiPrefix;
		registry.sitePrefix = registryDBInfo.ENV_schema.sitePrefix;
		registry.protocol = registryDBInfo.ENV_schema.protocol;
		registry.port = registryDBInfo.ENV_schema.port;
		
		registry.endpoints = registryDBInfo.ENV_schema.endpoints || {};
		
		registry.serviceConfig = registryDBInfo.ENV_schema.services.config;
		
		registry.deployer = registryDBInfo.ENV_schema.deployer || {};
		
		registry.custom = registryDBInfo.ENV_schema.custom || {};
		
		registry.resources = registryDBInfo.ENV_schema.resources || {};
		
		for (let coreDBName in metaAndCoreDB.coreDB) {
			if (Object.hasOwnProperty.call(metaAndCoreDB.coreDB, coreDBName)) {
				registry.coreDB[coreDBName] = metaAndCoreDB.coreDB[coreDBName];
			}
		}
		
		registry.services = {
			"controller": {
				"name": registryDBInfo.ENV_schema.services.controller.name || "controller", //AH
				"group": registryDBInfo.ENV_schema.services.controller.group || "SOAJS Core Service", //AH
				"version": registryDBInfo.ENV_schema.services.controller.version || "1", //AH
				/*
				* We should use the below once we revamp and limit this to just controller
				* this might not be true because of loadEnv we will always need to know the information of other env
				*
				"name": param.serviceName || "controller",
				"group": param.serviceGroup || "SOAJS Core Service",
				"version": param.serviceVersion || "1",
				 */
				"maxPoolSize": registryDBInfo.ENV_schema.services.controller.maxPoolSize,
				"authorization": registryDBInfo.ENV_schema.services.controller.authorization,
				"port": registryDBInfo.ENV_schema.services.config.ports.controller,
				"requestTimeout": registryDBInfo.ENV_schema.services.controller.requestTimeout || 30,
				"requestTimeoutRenewal": registryDBInfo.ENV_schema.services.controller.requestTimeoutRenewal || 0
			}
		};
		
		registry.coreDB.session = build.sessionDB(registryDBInfo.ENV_schema, registry.environment, registry.timeLoaded);
		
		registry.daemons = {};
		return callback(null);
	},
	
	"buildSpecificRegistry": function (param, registry, registryDBInfo, callback) {
		function resume(what, gatewayKey) {
			if (!process.env.SOAJS_DEPLOY_HA) {
				build.controllerHosts(registryDBInfo.ENV_hosts, registry.services.controller);
			}
			let keyIndex = gatewayKey || param.serviceName;
			
			if (!autoRegHost || param.reload) {
				return callback(null);
			} else if (param.serviceIp) {
				if (registry.serviceConfig.awareness.autoRegisterService) {
					registry[what][keyIndex].newServiceOrHost = true;
					if (!registry[what][keyIndex].hosts) {
						registry[what][keyIndex].hosts = {};
						registry[what][keyIndex].hosts.latest = param.serviceVersion;
						registry[what][keyIndex].hosts[param.serviceVersion] = [];
					}
					if (!registry[what][keyIndex].hosts[param.serviceVersion]) {
						registry[what][keyIndex].hosts[param.serviceVersion] = [];
					}
					if (registry[what][keyIndex].hosts[param.serviceVersion].indexOf(param.serviceIp) === -1) {
						registry[what][keyIndex].hosts[param.serviceVersion].push(param.serviceIp);
					}
				}
				return callback(null);
			} else {
				if (!param.serviceIp && !process.env.SOAJS_DEPLOY_HA) {
					let err = new Error("Unable to register new host ip [" + param.serviceIp + "] for service [" + keyIndex + "]");
					return callback(err);
				}
				return callback(null);
			}
		}
		
		function buildAll() {
			build.allServices(registryDBInfo.services_schema, registry.services, registry.services.controller.name);
			
			if (!process.env.SOAJS_DEPLOY_HA) {
				build.servicesHosts(registryDBInfo.ENV_hosts, registry.services);
			}
			build.allDaemons(registryDBInfo.daemons_schema, registry.daemons, registry.services.controller.name);
			
			if (!process.env.SOAJS_DEPLOY_HA) {
				build.servicesHosts(registryDBInfo.ENV_hosts, registry.daemons);
			}
		}
		
		if (param.serviceName === registry.services.controller.name) {
			
			let newServiceObj = {
				'name': registry.services.controller.name,
				'port': registry.services.controller.port,
			};
			if (param.maintenance) {
				newServiceObj.maintenance = param.maintenance;
			}
			build.registerNewService(registry.coreDB.provision, newServiceObj, 'services', function (error) {
				if (error) {
					let err = new Error('Unable to register new service ' + param.serviceName + ' : ' + error.message);
					return callback(err);
				}
				buildAll();
				return resume("services", "controller");
			});
		} else {
			if (param.type && param.type === "daemon") {
				//var schemaPorts = registryDBInfo.ENV_schema.services.config.ports;
				registry.daemons[param.serviceName] = {
					'group': param.serviceGroup,
					'port': param.designatedPort,
					'version': param.serviceVersion,
				};
				if (process.env.SOAJS_REGISTRY_BUILDALL) {
					buildAll();
				}
				if (param.reload) {
					return resume("daemons");
				} else {
					//adding daemon service for the first time to services collection
					let newDaemonServiceObj = {
						'name': param.serviceName,
						'group': param.serviceGroup,
						'port': registry.daemons[param.serviceName].port,
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
							let err = new Error('Unable to register new daemon service ' + param.serviceName + ' : ' + error.message);
							return callback(err);
						}
						return resume("daemons");
					});
				}
			} else {
				//var schemaPorts = registryDBInfo.ENV_schema.services.config.ports;
				registry.services[param.serviceName] = {
					'group': param.serviceGroup,
					'port': param.designatedPort,
					'requestTimeout': param.requestTimeout,
					'requestTimeoutRenewal': param.requestTimeoutRenewal,
					
					'version': param.serviceVersion,
					'extKeyRequired': param.extKeyRequired || false
				};
				if (process.env.SOAJS_REGISTRY_BUILDALL) {
					buildAll();
				}
				if (param.reload) {
					return resume("services");
				} else {
					//adding service for the first time to services collection
					let newServiceObj = {
						'name': param.serviceName,
						'group': param.serviceGroup,
						'port': registry.services[param.serviceName].port,
						'swagger': param.swagger,
						'requestTimeout': registry.services[param.serviceName].requestTimeout,
						'requestTimeoutRenewal': registry.services[param.serviceName].requestTimeoutRenewal,
						'versions': {}
					};
					newServiceObj.versions[param.serviceVersion] = {
						"extKeyRequired": registry.services[param.serviceName].extKeyRequired,
						"urac": param.urac,
						"urac_Profile": param.urac_Profile,
						"urac_ACL": param.urac_ACL,
						"urac_Config": param.urac_Config,
						"urac_GroupConfig": param.urac_GroupConfig,
						"tenant_Profile": param.tenant_Profile,
						"provision_ACL": param.provision_ACL,
						"oauth": param.oauth,
						"apis": param.apiList,
						"interConnect": param.interConnect
					};
					
					if (param.maintenance) {
						newServiceObj.maintenance = param.maintenance;
					}
					
					build.registerNewService(registry.coreDB.provision, newServiceObj, 'services', function (error) {
						if (error) {
							let err = new Error('Unable to register new service ' + param.serviceName + ' : ' + error.message);
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
	model.loadProfile(envFrom, function (err, registry) {
		if (registry) {
			if (!registry_struct[registry.environment]) {
				registry_struct[registry.environment] = registry;
			} else {
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
	if (modelName === "api") {
		model.fetchRegistry(param, function (err, registry) {
			if (!err) {
				registry.profileOnly = false;
				registry_struct[registry.environment] = registry;
			}
			return cb(err);
		});
	} else {
		loadProfile(param.envCode, function (err, registry) {
			if (registry) {
				model.loadData(registry.coreDB.provision, registry.environment, param, function (error, RegistryFromDB) {
					if (error || !RegistryFromDB) {
						return cb(error);
					} else {
						build.buildRegistry(param, registry, RegistryFromDB, function (err) {
							if (err) {
								return cb(err);
							}
							if (param.donotBbuildSpecificRegistry) {
								return cb(null);
							} else {
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
			} else {
				return cb(new Error("Empty profile, unable to continue loading registry"));
			}
		});
	}
}

function getRegistry(param, cb) {
	if (param.reload || process.env.SOAJS_TEST || !registry_struct[param.envCode] || registry_struct[param.envCode].profileOnly) {
		loadRegistry(param, function (err) {
			if (err && registry_struct && registry_struct[param.envCode] && registry_struct[param.envCode].profileOnly) {
				registry_struct[param.envCode] = null;
			}
			let reg = registry_struct[param.envCode];
			if (reg && reg.serviceConfig.awareness.autoRelaodRegistry) {
				let autoReload = function () {
					getRegistry(param, function () {
						// cb(err, reg);
					});
				};
				if (!autoReloadTimeout[reg.environment]) {
					autoReloadTimeout[reg.environment] = {};
				}
				if (autoReloadTimeout[reg.environment].timeout) {
					clearTimeout(autoReloadTimeout[reg.environment].timeout);
				}
				autoReloadTimeout[reg.environment].setBy = param.setBy;
				autoReloadTimeout[reg.environment].timeout = setTimeout(autoReload, reg.serviceConfig.awareness.autoRelaodRegistry);
			}
			
			return cb(err, registry_struct[param.envCode]);
		});
	} else {
		return cb(null, registry_struct[param.envCode]);
	}
}

let registryModule = {
	"init": function () {
		if (process.env.SOAJS_SOLO && process.env.SOAJS_SOLO === "true") {
			modelName = "local";
		} else if (process.env.SOAJS_REGISTRY_API) {
			modelName = "api";
		} else {
			modelName = "mongo";
		}
		models[modelName] = require("./" + modelName + ".js");
		models[modelName].init();
		model = models[modelName];
	},
	
	"setModel": function (_model) {
		model = _model;
	},
	
	"profile": function (cb) {
		loadProfile(regEnvironment, function (err, registry) {
			return cb(registry);
		});
	},
	"register": function (param, cb) {
		if (param.ip && param.name) {
			param.extKeyRequired = param.extKeyRequired || false;
			let what = ((param.type === "service") ? "services" : "daemons");
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
				} else {
					registry_struct[regEnvironment][what][param.name] = {
						"group": param.group,
						"port": param.port
					};
				}
			} else {
				if (registry_struct[regEnvironment][what][param.name].port !== param.port) {
					registry_struct[regEnvironment][what][param.name].port = param.port;
				}
			}
			
			if (param.maintenance) {
				registry_struct[regEnvironment][what][param.name].maintenance = param.maintenance;
			}
			
			registry_struct[regEnvironment][what][param.name].extKeyRequired = param.extKeyRequired;
			registry_struct[regEnvironment][what][param.name].version = param.version;
			
			if (!registry_struct[regEnvironment][what][param.name].versions) {
				registry_struct[regEnvironment][what][param.name].versions = {};
			}
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
				registry_struct[regEnvironment][what][param.name].versions[param.version].interConnect = param.interConnect;
			} else {
				registry_struct[regEnvironment][what][param.name].versions[param.version] = {
					"extKeyRequired": param.extKeyRequired,
					"oauth": param.oauth,
					"urac": param.urac,
					"urac_Profile": param.urac_Profile,
					"urac_ACL": param.urac_ACL,
					"urac_Config": param.urac_Config,
					"urac_GroupConfig": param.urac_GroupConfig,
					"tenant_Profile": param.tenant_Profile,
					"provision_ACL": param.provision_ACL,
					"interConnect": param.interConnect
				};
			}
			
			if (!registry_struct[regEnvironment][what][param.name].hosts) {
				registry_struct[regEnvironment][what][param.name].hosts = {};
				registry_struct[regEnvironment][what][param.name].hosts.latest = param.version;
			}
			
			if (!registry_struct[regEnvironment][what][param.name].hosts[param.version]) {
				registry_struct[regEnvironment][what][param.name].hosts[param.version] = [];
			}
			
			if (registry_struct[regEnvironment][what][param.name].hosts[param.version].indexOf(param.ip) === -1) {
				registry_struct[regEnvironment][what][param.name].hosts[param.version].push(param.ip);
			}
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
					let newServiceObj = {};
					if (param.maintenance) {
						newServiceObj.maintenance = param.maintenance;
					}
					
					build.registerNewService(registry_struct[regEnvironment].coreDB.provision, newDaemonServiceObj, 'daemons', function (error) {
						if (error) {
							let err = new Error('Unable to register new daemon service ' + param.serviceName + ' : ' + error.message);
							return cb(err);
						}
						return cb(null, registry_struct[regEnvironment][what][param.name]);
					});
				} else {
					//adding service for the first time to services collection
					let newServiceObj = {
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
						"oauth": param.oauth,
						"interConnect": param.interConnect
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
						}, registry_struct[regEnvironment], () => {
						});
					}
					catch (e) {
					
					}
					
					build.registerNewService(registry_struct[regEnvironment].coreDB.provision, newServiceObj, 'services', function (error) {
						if (error) {
							let err = new Error('Unable to register new service ' + param.serviceName + ' : ' + error.message);
							return cb(err);
						}
						return cb(null, registry_struct[regEnvironment][what][param.name]);
					});
				}
			} else {
				return cb(null, registry_struct[regEnvironment][what][param.name]);
			}
		} else {
			return cb(new Error("unable to register service. missing ip or name param"));
		}
	},
	"getCustom": function (envCode) {
		let env = envCode || regEnvironment;
		return registry_struct[env].custom;
	},
	"get": function (envCode) {
		let env = envCode || regEnvironment;
		return registry_struct[env];
	},
	"load": function (param, cb) {
		if (!param) {
			param = {};
		}
		param.reload = false;
		param.envCode = regEnvironment;
		param.setBy = "load";
		return getRegistry(param, function (err, reg) {
			if (err) {
				throw new Error('Unable to load Registry Db Info: ' + err.message);
			} else {
				return cb(reg);
			}
		});
	},
	"reload": function (param, cb) {
		if (!param) {
			param = {};
		}
		param.reload = true;
		param.envCode = regEnvironment;
		param.setBy = "reload";
		getRegistry(param, function (err, reg) {
			cb(err, reg);
			let envArray = [];
			for (let envCode in registry_struct) {
				if (Object.hasOwnProperty.call(registry_struct, envCode)) {
					if (envCode !== regEnvironment && registry_struct[envCode]) {
						envArray.push({"reload": true, "envCode": envCode});
					}
				}
			}
			if (envArray.length > 0) {
				async.mapSeries(envArray, getRegistry, function () {
				});
			}
		});
	},
	"loadByEnv": function (param, cb) {
		if (!param) {
			param = {};
		}
		param.reload = true;
		param.envCode = param.envCode.toLowerCase();
		param.setBy = "loadByEnv";
		
		if (!Object.hasOwnProperty.call(param, "donotBbuildSpecificRegistry")) {
			param.donotBbuildSpecificRegistry = true;
		}
		return getRegistry(param, function (err, reg) {
			if (err) {
				return cb(err);
			}
			return cb(null, reg);
		});
	},
	"loadOtherEnvControllerHosts": function (gatewayServiceName, cb) {
		let dbConfig = null;
		if (!cb && typeof gatewayServiceName === "function") {
			cb = gatewayServiceName;
			gatewayServiceName = "controller";
		}
		let getHosts = function () {
			if (dbConfig) {
				return model.loadOtherEnvHosts({
					"gatewayName": gatewayServiceName,
					"envCode": regEnvironment,
					"dbConfig": dbConfig
				}, cb);
			} else {
				return cb(new Error("unable to find provision config information to connect to!"));
			}
		};
		if (registry_struct[regEnvironment]) {
			dbConfig = registry_struct[regEnvironment].coreDB.provision;
			getHosts();
		} else {
			loadProfile(regEnvironment, function (err, registry) {
				dbConfig = registry.coreDB.provision;
				getHosts();
			});
		}
	},
	"registerHost": function (param, registry, cb) {
		if (param.serviceIp) {
			let hostObj = {
				'env': registry.name.toLowerCase(),
				'name': param.serviceName,
				'ip': param.serviceIp,
				'port': param.servicePort,
				//'gatewayPort': registry.serviceConfig.ports.controller,
				'hostname': os.hostname().toLowerCase(),
				'version': param.serviceVersion
			};
			if (param.serviceHATask) {
				hostObj.serviceHATask = param.serviceHATask;
			}
			model.addUpdateServiceIP(registry.coreDB.provision, hostObj, function (error, registered) {
				if (error) {
					throw new Error("Unable to register new host for service:" + error.message);
				}
				cb(registered);
			});
		} else {
			cb(false);
		}
	},
	"autoRegisterService": function (param, cb) {
		let controllerSRV = registry_struct[regEnvironment].services.controller;
		let serviceSRV = registry_struct[regEnvironment][param.what][param.name];
		// if param.mw=1 means endpoint is registering, we should call register on gateway
		if ((!serviceSRV || !serviceSRV.newServiceOrHost) && !param.mw) {
			return cb(null, false);
		}
		
		if (controllerSRV && controllerSRV.hosts && controllerSRV.hosts.latest && controllerSRV.hosts[controllerSRV.hosts.latest]) {
			async.each(controllerSRV.hosts[controllerSRV.hosts.latest],
				function (ip, callback) {
					let requestOptions = {
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
					} else {
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
						requestOptions.body.interConnect = param.interConnect;
					}
					
					if (param.serviceHATask) {
						requestOptions.qs.serviceHATask = param.serviceHATask;
					}
					request(requestOptions, function (error) {
						return (error) ? callback(error) : callback(null);
					});
					
				}, function (err) {
					return (err) ? cb(err, false) : cb(null, true);
				});
		} else {
			return cb(new Error("Unable to find any controller host"), false);
		}
	},
	"getAllRegistriesInfo": function (cb) {
		model.getAllEnvironments(cb);
	},
	"addUpdateEnvControllers": function (param, cb) {
		model.addUpdateEnvControllers(param, cb);
	}
};

module.exports = registryModule;