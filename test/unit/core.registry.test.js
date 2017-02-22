"use strict";
var assert = require('assert');
var helper = require("../helper.js");
var core = helper.requireModule('./index.js').core;
var param = {
    "serviceName": "unitTestRegistry",
    "serviceGroup": "unit test",
    "serviceVersion": 1,
    "servicePort": 4999,
    "extKeyRequired": false,
    "requestTimeout": null,
    "requestTimeoutRenewal": null,
    "awareness": false,
    "serviceIp": "127.0.0.1",
    "swagger": false,
    "apiList": {}
};

describe("testing registry functionality", function () {
    it("Load registry", function (done) {
        core.registry.load({
            "serviceName": param.serviceName,
            "serviceGroup": param.serviceGroup,
            "serviceVersion": param.serviceVersion,
            "designatedPort": param.servicePort,
            "extKeyRequired": param.extKeyRequired,
            "requestTimeout": param.requestTimeout,
            "requestTimeoutRenewal": param.requestTimeoutRenewal,
            "awareness": param.awareness,
            "serviceIp": param.serviceIp,
            "swagger": param.swagger,
            "apiList": param.apiList
        }, function (reg) {
            console.log(reg);
            done();
        });
    });
});