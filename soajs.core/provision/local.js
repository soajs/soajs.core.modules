'use strict';


module.exports = {
    "init": function (config) {

    },
    
    "getAccessToken": function (bearerToken, cb) {
        return cb(false, false);
    },
    "getRefreshToken": function (bearerToken, cb) {
        return cb(false, false);
    },
    "saveAccessToken": function (accessToken, clientId, expires, user, cb) {
        return cb(false);
    },
    "saveRefreshToken": function (refreshToken, clientId, expires, user, cb) {
        return cb(false);
    },

    "getDaemonGrpConf": function (grp, name, cb) {
        return cb();
    },
    "getPackagesFromDb": function (code, cb) {
        return cb();
    },
    "getKeyFromDb": function (key, tId, oauth, cb) {
        return cb();
    }
};
