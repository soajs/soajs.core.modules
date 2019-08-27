'use strict';

const core = require("../soajs.core");
const auth = require('basic-auth');
let log = null;

const async = require ("async");

let struct_oauths = {};
let struct_keys = {};
let struct_packages = {};
let struct_tenants = {};

/**
 *
 * @param keyStruct
 * @param extKey
 * @returns {*}
 */
function getKeyData(keyStruct, extKey) {
    var obj = null;
    if (keyStruct && keyStruct.extKeys) {
        var extKeysLen = keyStruct.extKeys.length;
        for (var i = 0; i < extKeysLen; i++) {
            if (keyStruct.extKeys[i].extKey === extKey) {
                if (!keyStruct.extKeys[i].expDate || (keyStruct.extKeys[i].expDate && (keyStruct.extKeys[i].expDate > new Date().getTime()))) {
                    obj = {
                        "key": keyStruct.key,
                        "extKey": extKey,
                        "tenant": {
                            "id": keyStruct.tenant.id,
                            "code": keyStruct.tenant.code,
                            "locked": keyStruct.tenant.locked,
                            "type": keyStruct.tenant.type,
                            "profile": keyStruct.tenant.profile
                        },
                        "application": {
                            "product": keyStruct.application.product,
                            "package": keyStruct.application.package,
                            "appId": keyStruct.application.appId,
                            "acl": keyStruct.application.acl,
                            "acl_all_env": keyStruct.application.acl_all_env
                        },
                        "device": keyStruct.extKeys[i].device,
                        "env": keyStruct.extKeys[i].env,
                        "geo": keyStruct.extKeys[i].geo,
                        "config": keyStruct.config
                    };
                    if (keyStruct.tenant.main)
                        obj.tenant.main = keyStruct.tenant.main;
                }
            }
        }
    }
    return obj;
}

//TODO: must clone key and package object before returning them in the below methods
/**
 *
 * @type {{init: "init", getExternalKeyData: "getExternalKeyData", getPackageData: "getPackageData", loadProvision: "loadProvision", getTenantKeys: "getTenantKeys", generateExtKey: "generateExtKey"}}
 */
var provision = {
    "init": function (dbConfig, logger) {
        log = logger;
        core.provision.init(dbConfig);
    },
    "getExternalKeyData": function (extKey, keyConfig, cb) {
        if (!extKey)
            return cb(core.error.generate(200));

        core.key.getInfo(extKey, keyConfig, function (err, keyObj) {
            if (err)
                return cb(err);

            if (struct_keys[keyObj.key] && (!struct_keys[keyObj.key]._TTL || (struct_keys[keyObj.key]._TTL && struct_keys[keyObj.key]._TIME && (struct_keys[keyObj.key]._TIME > (new Date().getTime() - struct_keys[keyObj.key]._TTL))))) {
                var obj = getKeyData(struct_keys[keyObj.key], extKey);
                if (obj) {
                    return cb(null, obj);
                }
            }
            core.provision.getKey(keyObj.key, function (err, key) {
                if (err)
                    return cb(err, null);
                if (!key)
                    return cb(core.error.generate(153));

                struct_keys[keyObj.key] = key;
                var obj = getKeyData(struct_keys[keyObj.key], extKey);
                return cb(null, obj);
            });
        });
    },
    "getTenantData": function (tId, cb) {
        if (!tId)
            return cb(core.error.generate(205));
        if (struct_tenants[tId])
            return cb(null, struct_tenants[tId]);

        core.provision.getTenant(tId, function (err, tenant) {
            if (err)
                return cb(err);
            if (!tenant)
                return cb(core.error.generate(206));
            struct_tenants[tId] = tenant;
            return cb(null, tenant);
        });
    },
    "getTenantOauth": function (tId, cb) {
        if (!tId)
            return cb(core.error.generate(205));
        if (struct_oauths[tId])
            return cb(null, struct_oauths[tId]);

        core.provision.getTenantOauth(tId, function (err, tenantOauth) {
            if (err)
                return cb(err);
            if (!tenantOauth)
                return cb(core.error.generate(206));
            struct_oauths[tId] = tenantOauth;
            return cb(null, tenantOauth);
        });
    },
    "getPackageData": function (code, cb) {
        if (!code)
            return cb(core.error.generate(201));

        if (struct_packages[code] && (!struct_packages[code]._TTL || (struct_packages[code]._TTL && struct_packages[code]._TIME && (struct_packages[code]._TIME > (new Date().getTime() - struct_packages[code]._TTL)))))
            return cb(null, struct_packages[code]);

        core.provision.getPackage(code, function (err, pack) {
            if (err)
                return cb(err);

            if (pack) {
                struct_packages[code] = pack;
                return cb(null, pack);
            }
            else {
                return cb(core.error.generate(201));
            }
        });
    },
    "getPackagesData": function (arrCodes, cb) {
        if (!arrCodes || !Array.isArray(arrCodes) || arrCodes.length < 1) {
            return cb(core.error.generate(209), null);
        }
        let packagesData = [];
        if (arrCodes.length === 1) {
            provision.getPackageData(arrCodes[0], (err, pack) => {
                if (err) {
                    return cb(err, null);
                }
                else {
                    packagesData.push(pack);
                    return cb(null, packagesData);
                }
            });
        }
        else {
            async.each(arrCodes, (code, callback) => {
                if (struct_packages[code] &&
                    (!struct_packages[code]._TTL ||
                        (struct_packages[code]._TTL &&
                            struct_packages[code]._TIME &&
                            (struct_packages[code]._TIME > (new Date().getTime() - struct_packages[code]._TTL))))) {
                    packagesData.push(struct_packages[code]);
                    return callback();
                }
                else {
                    core.provision.getPackages(function (err, packs) {
                        if (err) {
                            log.error("unable to load all packages from provision: ", err);
                            return callback(err);
                        }
                        else {
                            struct_packages = packs;
                            if (struct_packages[code]) {
                                packagesData.push(struct_packages[code]);
                                return callback();
                            }
                            else {
                                log.error("unable to load all packages from provision: cannot find package - " + code);
                                return callback(core.error.generate(209));
                            }
                        }
                    });
                }
            }, (err) =>{
                if (err)
                    return cb(err, null);
                else
                    return cb(null, packagesData);
            });
        }
    },
    "loadProvision": function (cb) {

        core.provision.getPackages(function (err, packs) {
            if (err) {
                log.error("unable to load all packages from provision: ", err);
                return cb(false);
            }
            else {
                struct_packages = packs;
                core.provision.getKeysOauths(function (err, keysOauths) {
                    if (err) {
                        log.error("unable to load all keys from provision: ", err);
                        return cb(false);
                    }
                    else {
                        if (keysOauths) {
                            struct_keys = keysOauths.keyData;
                            struct_oauths = keysOauths.oauthData;
                            struct_tenants = keysOauths.tenantData;
                        }
                        cb(true);
                    }
                });
            }
        });

        //NOTE: for now we just do the callback. we should use async parallel
        //return cb(true);
    },
    "loadDaemonGrpConf": function (grp, name, cb) {
        if (grp && name) {
            core.provision.getDaemonGrpConf(grp, name, function (err, grpConf) {
                if (err) {
                    log.error("unable to load daemon group config for daemon [" + name + "] and group [" + grp + "] : ", err);
                    return cb(false);
                }
                return cb(null, grpConf);
            });
        }
        else {
            log.error("unable to load daemon group config for daemon [" + name + "] and group [" + grp + "]");
            return cb(false, null);
        }
    }, /*
     "getTenantKeys": function (tId, cb) {
     core.provision.getTenantKeys(tId, function (err, data) {
     if (err) {
     log.error(err);
     return cb(core.error.generate(202));
     }
     return cb(null, data);
     });
     },*/
    "generateInternalKey": function (cb) {
        core.key.generateInternalKey(function (err, intKey) {
            if (err) {
                log.error(err);
                return cb(core.error.generate(204));
            }
            return cb(null, intKey);
        });
    },
    "generateExtKey": function (key, keyConfig, cb) {
        if (!key) {
            var err = core.error.generate(203);
            log.error(err);
            return cb(err);
        }
        core.provision.getKey(key, function (err, data) {
            if (err || !data) {
                log.error(err);
                return cb(core.error.generate(203));
            }
            core.key.generateExternalKey(key, data.tenant, data.application, keyConfig, function (err, extKey) {
                if (err) {
                    log.error(err);
                    return cb(core.error.generate(203));
                }
                return cb(null, extKey);
            });
        });
    },

    "getTenantByCode": function (tenantCode, cb) {
        core.provision.getTenantByCode(tenantCode, cb);
    },

    "getEnvironmentExtKeyWithDashboardAccess": function (tenant, cb) {
        core.provision.getTenantByCode(tenant, cb);
    },

    "getEnvironmentsFromACL": function (ACL, Environments) {
        return core.provision.getTenantByCode(ACL, Environments);
    },

    "generateSaveAccessRefreshToken": function (user, req, cb) {
        var userFromAuthorise = auth(req);
        var clientId = (userFromAuthorise) ? userFromAuthorise.name : req.soajs.tenant.id.toString();

        provision.oauthModel.generateToken("accessToken", req, function (error, aToken) {
            if (error) {
                return cb(error);
            }

            provision.oauthModel.generateToken("refreshToken", req, function (error, rToken) {
                if (error) {
                    return cb(error);
                }

                var registry = core.registry.get();
                var oauthConfiguration = registry.serviceConfig.oauth;

                var now = new Date();
                var aExpires = new Date(now);
                aExpires.setSeconds(aExpires.getSeconds() + oauthConfiguration.accessTokenLifetime);

                var rExpires = new Date(now);
                rExpires.setSeconds(rExpires.getSeconds() + oauthConfiguration.refreshTokenLifetime);

                provision.oauthModel.saveAccessToken(aToken, clientId, aExpires, user, function (error) {
                    if (error) {
                        return cb(error);
                    }

                    provision.oauthModel.saveRefreshToken(rToken, clientId, rExpires, user, function (error) {
                        if (error) {
                            return cb(error);
                        }

                        return cb(null, {
                            "token_type": "bearer",
                            "access_token": aToken,
                            "expires_in": oauthConfiguration.accessTokenLifetime,
                            "refresh_token": rToken

                        })
                    });
                });
            });
        });
    },
    "oauthModel": {
        "getClient": function (clientId, clientSecret, cb) {
            if (struct_oauths[clientId]) {
                if (clientSecret === null || struct_oauths[clientId].secret === clientSecret)
                    return cb(false, {"clientId": clientId});
            }
            return cb(false, false);
        },
        "grantTypeAllowed": function (clientId, grantType, cb) {
            return cb(false, true);

            //NOTE: we want the grants to be only at registry and not by tenant, thus set in MW oauth
            //if (struct_oauths[clientId] && struct_oauths[clientId].grants && (struct_oauths[clientId].grants.indexOf(grantType) >= 0))
            //    return cb(false, true);
            //else
            //    return cb(false, false);
        },
        "getAccessToken": function (bearerToken, cb) {
            core.provision.getAccessToken(bearerToken, cb);
        },
        "getRefreshToken": function (bearerToken, cb) {
            core.provision.getRefreshToken(bearerToken, cb);
        },
        "saveAccessToken": function (accessToken, clientId, expires, user, cb) {
            core.provision.saveAccessToken(accessToken, clientId, expires, user, cb);
        },
        "saveRefreshToken": function (refreshToken, clientId, expires, user, cb) {
            core.provision.saveRefreshToken(refreshToken, clientId, expires, user, cb);
        },
        "getUser": function (username, password, callback) {
            callback(false, false);
        },
        "generateToken": function (type, req, cb) {
            core.provision.generateToken(cb);
        }
    }
};

module.exports = provision;