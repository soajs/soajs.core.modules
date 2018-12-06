'use strict';
var crypto = require('crypto');
var models = {};

var provision = {
    "model": null,
    "init": function (dbConfig) {
        var modelName = "mongo";
        if (process.env.SOAJS_SOLO && process.env.SOAJS_SOLO === "true") {
            models.local = require("./local.js");
            modelName = "local";
        }
        else {
            models.mongo = require("./mongo.js");
            modelName = "mongo";
        }
        models[modelName].init(dbConfig);
        provision.model = models[modelName];
    },
    "getAccessToken": function (bearerToken, cb) {
        return provision.model.getAccessToken(bearerToken, cb);
    },
    "getRefreshToken": function (bearerToken, cb) {
        return provision.model.getRefreshToken(bearerToken, cb);
    },
    "saveAccessToken": function (accessToken, clientId, expires, user, cb) {
        return provision.model.saveAccessToken(accessToken, clientId, expires, user, cb);
    },
    "saveRefreshToken": function (refreshToken, clientId, expires, user, cb) {
        return provision.model.saveRefreshToken(refreshToken, clientId, expires, user, cb);
    },
    "generateToken": function (cb) {
        //NOTE: map the param of crypro to registry to give flexibility
        crypto.randomBytes(256, function (ex, buffer) {
            if (ex) return cb(new Error('Error in Ecrypting Generate Token'));

            var token = crypto
                .createHash('sha1')
                .update(buffer)
                .digest('hex');

            cb(false, token);
        });
    },

    "getPackages": function (cb) {
        return provision.model.getPackagesFromDb(null, cb);
    },
    "getKeysOauths": function (cb) {
        return provision.model.getKeyFromDb(null, null, true, cb);
    },
    "getKeys": function (cb) {
        return provision.model.getKeyFromDb(null, null, false, cb);
    },
    "getKey": function (key, cb) {
        return provision.model.getKeyFromDb(key, null, false, function (err, data) {
            if (err || !(data && data[key])) {
                return cb(err);
            }
            return cb(null, data[key]);
        });
    },
    "getTenant": function (tId, cb) {
        return provision.model.getKeyFromDb(null, tId, true, function (err, data) {
            if (err || !(data && data.tenantData && data.tenantData[tId])) {
                return cb(err);
            }
            return cb(null, data.tenantData[tId]);
        });
    },
    "getTenantOauth": function (tId, cb) {
        return provision.model.getKeyFromDb(null, tId, true, function (err, data) {
            if (err || !(data && data.oauthData && data.oauthData[tId])) {
                return cb(err);
            }
            return cb(null, data.oauthData[tId]);
        });
    },
    "getPackage": function (code, cb) {
        return provision.model.getPackagesFromDb(code, function (err, data) {
            if (err || !(data && data[code])) {
                return cb(err);
            }
            return cb(null, data[code]);
        });
    },/*
    "getTenantKeys": function (tId, cb) {
        return provision.model.getKeyFromDb(null, tId, false, cb);
    },*/
    "getDaemonGrpConf": function (grp, name, cb) {
        return provision.model.getDaemonGrpConf(grp, name, cb);
    },
	
	"getTenantByCode": function(code, cb){
		provision.model.getTenantFromCode(code, cb);
	},
	
	"getEnvironmentExtKeyWithDashboardAccess": function(tenant, cb){
		provision.getTenantByCode(tenant.code, function(error, record){
			if(error){
				return cb(error);
			}
			
			if (!record) {
				return cb(new Error("No Tenant found"));
			}
			
			var extKey = findExtKeyForEnvironment(record, process.env.SOAJS_ENV.toUpperCase());
			if (!extKey) {
				return cb(new Error("No External key found for Environment" + process.env.SOAJS_ENV.toUpperCase() + ", for this tenant"));
			}
			
			let data = {
				extKey: extKey,
				locked: record.locked || false
			};
			
			return cb(null, data);
		});
		
		function findExtKeyForEnvironment(tenantRecord, env) {
			let extKey = null;
			//loop in tenant applications
			tenantRecord.applications.forEach(function (oneApplication) {
				
				if(process.env.SOAJS_SAAS){
					//loop in tenant keys
					oneApplication.keys.forEach(function (oneKey) {
						
						let serviceConfig;
						if(oneKey.config && oneKey.config[env.toLowerCase()]){
							serviceConfig = (oneKey.config[env.toLowerCase()]) ? oneKey.config[env.toLowerCase()].SOAJS_SAAS : null;
							if(!serviceConfig && oneKey.config[env.toLowerCase()].commonFields && oneKey.config[env.toLowerCase()].commonFields.SOAJS_SAAS){
								serviceConfig = oneKey.config[env.toLowerCase()].commonFields.SOAJS_SAAS;
							}
						}
						
						if(serviceConfig && serviceConfig[tenant.soajs_project]){
							//if soajs_project is found in one of the applications configuration, then use ONLY that ext key
							//loop in tenant ext keys
							oneKey.extKeys.forEach(function (oneExtKey) {
								//get the ext key for the request environment who also has dashboardAccess true
								//note: only one extkey per env has dashboardAccess true, simply find it and break
								if (oneExtKey.env && oneExtKey.env === env && oneExtKey.dashboardAccess && !oneExtKey.deprecated) {
									extKey = oneExtKey.extKey;
								}
							});
						}
						else if(!serviceConfig){
							//loop in tenant ext keys
							oneKey.extKeys.forEach(function (oneExtKey) {
								//get the ext key for the request environment who also has dashboardAccess true
								//note: only one extkey per env has dashboardAccess true, simply find it and break
								if (oneExtKey.env && oneExtKey.env === env && oneExtKey.dashboardAccess && !oneExtKey.deprecated) {
									extKey = oneExtKey.extKey;
								}
							});
						}
					});
				}
				else{
					//loop in tenant keys
					oneApplication.keys.forEach(function (oneKey) {
						//loop in all tenant ext keys, Open Source || DBTN
						oneKey.extKeys.forEach(function (oneExtKey) {
							//get the ext key for the request environment who also has dashboardAccess true
							//note: only one extkey per env has dashboardAccess true, simply find it and break
							if (oneExtKey.env && oneExtKey.env === env && oneExtKey.dashboardAccess && !oneExtKey.deprecated) {
								extKey = oneExtKey.extKey;
							}
						});
					});
				}
			});
			
			return extKey;
		}
	},
	
	"getEnvironmentsFromACL": function(ACL, envRecords){
		var envInfo = [];
		
		envRecords.forEach(function (oneEnv) {
			envInfo.push({
				domain: oneEnv.domain,
				sitePrefix: oneEnv.sitePrefix,
				apiPrefix: oneEnv.apiPrefix,
				port: oneEnv.port,
				protocol: oneEnv.protocol,
				code: oneEnv.code.toUpperCase(),
				deployer: {
					type: oneEnv.deployer.type,
					selected: oneEnv.deployer.selected
				}
			});
		});
		
		if (process.env.SOAJS_ENV.toLowerCase() !== 'dashboard') {
			var environments = Object.keys(ACL);
			var tmpEnv = [];
			envRecords.forEach(function (oneEnv) {
				tmpEnv.push(oneEnv.code);
			});
			
			for (let i = environments.length - 1; i >= 0; i--) {
				if (tmpEnv.indexOf(environments[i].toUpperCase()) !== -1 && !ACL[environments[i]].access && !ACL[environments[i]].apis && !ACL[environments[i]].apisRegExp && !ACL[environments[i]].apisPermission) {
					environments[i] = environments[i].toUpperCase();
				}
			}
			
			for (let i = envInfo.length - 1; i >= 0; i--) {
				if (environments.indexOf(envInfo[i].code.toUpperCase()) === -1) {
					envInfo.splice(i, 1);
				}
			}
		}
		
		return envInfo;
	}
};

module.exports = provision;