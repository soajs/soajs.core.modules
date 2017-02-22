"use strict";
var assert = require('assert');

describe("importing sample data", function () {
    it("do import", function (done) {
        done();
    });

    after(function (done) {
        console.log('test data imported.');
        require("./core.email.test.js");
        require("./core.error.test.js");
        require("./core.key.test.js");
        require("./core.logger.test.js");
        require("./core.meta.test.js");
        require("./core.provision.test.js");
        require("./core.security.test.js");
        require("./core.validator.test.js");
        require("./soajs.mongo.test.js");
        require("./soajs.es.test.js");
        require("./soajs.contentbuilder.test.js");
        require("./soajs.mongoStore.test.js");
        require("./soajs.provision.test.js");
        done();
    });
});