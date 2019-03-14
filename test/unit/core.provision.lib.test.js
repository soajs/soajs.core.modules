"use strict";
var assert = require('assert');
var helper = require("../helper.js");
var coreProvisionLib = helper.requireModule('./soajs.core/provision/lib');

describe("core provision lib tests", function () {

    it("success with version", function (done) {
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
                        get: [{
                            group: "General",
                            apis: {
                                "/authorization": {}
                            }
                        }],
                        post: [{
                            group: "General",
                            apis: {
                                "/token": {}
                            }
                        }],
                        delete: [{
                            group: "General",
                            apis: {
                                "/accessToken/:token": {
                                    access: false
                                },
                                "/refreshToken/:token": {
                                    access: false
                                }
                            }
                        }]
                    }
                }
            }
        };
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
        assert.deepStrictEqual(acl, what2expect, "Unable to create ACL from scope with version");
        done();
    });

    it("success without version", function (done) {
        let packACL = {
            "dashboard": {
                "oauth": [{
                    get: ["General"],
                    delete: ["General"]
                }]
            }
        };
        let scopeACL = {
            "dashboard": {
                "oauth": {
                    access: false,
                    apisPermission: "restricted",
                    get: [{
                        group: "General",
                        apis: {
                            "/authorization": {}
                        }
                    }],
                    post: [{
                        group: "General",
                        apis: {
                            "/token": {}
                        }
                    }],
                    delete: [{
                        group: "General",
                        apis: {
                            "/accessToken/:token": {
                                access: false
                            },
                            "/refreshToken/:token": {
                                access: false
                            }
                        }
                    }]
                }
            }
        };
        let what2expect = {
            "dashboard": {
                "oauth": {
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
        };
        let acl = coreProvisionLib.getACLFromScope(scopeACL, packACL);
        console.log(JSON.stringify(acl));
        assert.deepStrictEqual(acl, what2expect, "Unable to create ACL from scope without version");
        done();
    });

});