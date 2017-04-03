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
            if (ex) return cb(error('server_error'));

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
    }
};

module.exports = provision;