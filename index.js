'use strict';
/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

module.exports = {
    "core": require("./soajs.core"),
    //"es": require("./soajs.es"),
    "mail": require("./soajs.mail"),
    "mongo": require("./soajs.mongo"),
    "mongoStore": require("./soajs.mongoStore"),
    "provision": require("./soajs.provision"),
    "hasher": require("./soajs.core").security.hasher,
    "authorization": {
        "generate": require("./soajs.core").security.authorization.generate
    }
};

