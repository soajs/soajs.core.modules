"use strict";
var assert = require('assert');
var helper = require("../helper.js");
var coreProvisionLib = helper.requireModule('./soajs.core/provision/lib');

describe("core provision lib tests", function () {

    let packACL = {
        "dashboard": {
            "oauth": [{
                version: "1x2",
                get: ["General"],
                delete: ["General"]
            }]
        }
    };
    let scopeACL = {
        "dashboard": {
            "oauth": {
                "1x2": {
                    access: false,
                    apisPermission: "restricted",
                    get: {
                        General: {
                            apis: {
                                "/authorization": {}
                            }
                        }
                    },
                    post: {
                        General: {
                            apis: {
                                "/token": {}
                            }
                        }
                    },
                    delete: {
                        General: {
                            apis: {
                                "/accessToken/:token": {
                                    access: false
                                },
                                "/refreshToken/:token": {
                                    access: false
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    it("success", function (done) {
        let what2expect = {
            "dashboard": {
                "oauth": {
                    "1x2": {
                        "access": false,
                        "apisPermission": "restricted",
                        "get": {"apis": {"/authorization": {}}},
                        "delete": {
                            "apis": {
                                "/accessToken/:token": {"access": false},
                                "/refreshToken/:token": {"access": false}
                            }
                        }
                    }
                }
            }
        };
        let acl = coreProvisionLib.getACLFromScope(scopeACL, packACL);
        console.log(JSON.stringify(acl));
        assert.deepStrictEqual(acl, what2expect, "Unable to create ACL from scope");
        done();
    });

});