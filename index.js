'use strict';

module.exports = {
    "core": require("./soajs.core"),
    "es": require("./soajs.es"),
    "mail": require("./soajs.mail"),
    "mongo": require("./soajs.mongo"),
    "mongoStore": require("./soajs.mongoStore"),
    "provision": require("./soajs.provision"),
    "hasher": require("./soajs.core").security.hasher,
    "authorization": {
        "generate": require("./soajs.core").security.authorization.generate
    }
};

