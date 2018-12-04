"use strict";
var os = require("os");
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

let metaData = {
	"name": "core_provision",
	"prefix": '',
	"servers": [
		{
			"host": "127.0.0.1",
			"port": 27017
		}
	],
	"credentials": null,
	"URLParam": {
		"poolSize": 5,
		"autoReconnect": true
	}
};

describe("testing registry functionality", function () {
	var myRegistry;
	
	after(function (done) {
		// restore core provision, otherwise, the remaining integration test cases will fail
		core.registry.init(metaData);
		done();
	});
	
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
			assert.ok(reg);
			myRegistry = reg;
			done();
		});
	});
	
	it("Register", function (done) {
		var params = {
			'type': 'service',
			'name': "myService",
			'group': "beaver",
			'ip': "127.0.0.1",
			'port': 4555,
			'extKeyRequired': false,
			'version': "1",
			requestTimeout: 30,
			requestTimeoutRenewal: 5
		};
		core.registry.register(params, function (error, response) {
			assert.ifError(error);
			assert.ok(response);
			done();
		});
	});
	
	it("Register Host", function (done) {
		var params = {
			'env': myRegistry.name.toLowerCase(),
			'serviceName': "myService",
			'serviceIp': "127.0.0.1",
			'hostname': os.hostname().toLowerCase(),
			'version': "1",
			serviceHATask: "myServiceTask"
		};
		core.registry.registerHost(params, myRegistry, function (response) {
			assert.ok(response);
			done();
		});
	});
	
	it("Register", function (done) {
		var params = {
			'type': 'service',
			'name': "controller",
			'group': "beaver",
			'ip': "127.0.0.1",
			'port': 4000,
			'extKeyRequired': false,
			'version': "1",
			requestTimeout: 30,
			requestTimeoutRenewal: 5
		};
		core.registry.register(params, function (error, response) {
			assert.ifError(error);
			assert.ok(response);
			done();
		});
	});
	
	it("Register Host", function (done) {
		var params = {
			'env': myRegistry.name.toLowerCase(),
			'serviceName': "controller",
			'serviceIp': "127.0.0.1",
			'hostname': os.hostname().toLowerCase(),
			'version': "1",
			serviceHATask: "myServiceTask"
		};
		core.registry.registerHost(params, myRegistry, function (response) {
			assert.ok(response);
			done();
		});
	});
	
	it("autoRegister service", function (done) {
		var params = {
			'what': 'services',
			'name': "unitTestRegistry",
			'serviceIp': "127.0.0.1",
			'serviceHATask': "myServiceTask",
			'serviceVersion': "1"
		};
		core.registry.autoRegisterService(params, function (error, response) {
			done();
		});
	});
	
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
			assert.ok(reg);
			myRegistry = reg;
			done();
		});
	});
	
	it("Load registry custom", function (done) { // return it in mocha -=-=-=-=-=
		var custom = core.registry.getCustom("dev");
		assert.ok(custom);
		done();
	});
	
	it("Profile", function (done) {
		var custom = core.registry.profile(function (reg) {
			assert.ok(reg);
			done();
		});
	});
	
	it("reLoad registry", function (done) {
		core.registry.reload({
			"reload": true,
			"serviceName": param.serviceName,
			"serviceGroup": param.serviceGroup,
			"serviceVersion": param.serviceVersion,
			"designatedPort": param.servicePort,
			"extKeyRequired": param.extKeyRequired,
			"requestTimeout": param.requestTimeout,
			"requestTimeoutRenewal": param.requestTimeoutRenewal,
			"awareness": param.awareness,
			"serviceIp": param.serviceIp,
		}, function (err, reg) {
			assert.ifError(err);
			assert.ok(reg);
			done();
		});
	});
	
	it("reLoad registry", function (done) {
		core.registry.reload({
			"reload": true,
			"serviceName": "controller",
			"serviceGroup": "beaver",
			"serviceVersion": 1,
			"designatedPort": 4000,
			"extKeyRequired": false,
			"requestTimeout": 30,
			"requestTimeoutRenewal": 5,
			"awareness": true,
			"serviceIp": "127.0.0.1",
		}, function (err, reg) {
			assert.ifError(err);
			assert.ok(reg);
			done();
		});
	});
	
	it("loadOtherEnvControllerHosts registry", function (done) {
		core.registry.loadOtherEnvControllerHosts(function (err, reg) {
			done();
		});
	});
	
	it("Load registry By Env", function (done) {
		core.registry.loadByEnv({"envCode": "TEST"}, function (reg) {
			done();
		});
	});
	
	it("Register - unable to register service. missing params", function (done) {
		let param = {};
		core.registry.register(param, function (error, response) {
			assert.equal(error.toString(), "Error: unable to register service. missing ip or name param");
			done();
		});
	});
	
	it("Register - type !== service", function (done) {
		let param = {
			ip: "127.0.0.1",
			name: "test",
			port: 80
		};
		core.registry.register(param, function (error, response) {
			assert.ok(response);
			done();
		});
	});
	
	it("loadByEnv - error", function (done) {
		let param = {
			envCode: "dev"
		};
		
		core.registry.loadByEnv(param, function (error, response) {
			assert.ok(response);
			done();
		});
	});
	
	it("loadOtherEnvControllerHosts - success", function (done) {
		core.registry.loadOtherEnvControllerHosts(function (error, response) {
			assert.ok(response);
			done();
		});
	});
	
	it("registerHost - no servip", function (done) {
		core.registry.registerHost({}, {}, function (error, response) {
			assert.equal(error, false);
			done();
		});
	});
	
	it("registerHost - no servip", function (done) {
		let param = {
			serviceIp: "127.0.0.1"
		};
		let registry = {
			name: "test",
			coreDB: {},
			serviceConfig: {
				ports: {
					controller: 4000
				}
			}
		};
		
		core.registry.model = {
			addUpdateServiceIP: function (provision, host, cb) {
				return cb({message: "serviceX"}); // error
			}
		};
		
		try {
			core.registry.registerHost(param, registry, function (error, response) {
				
			});
		} catch (exception) {
			assert.equal(exception.toString(), "Error: Unable to register new host for service:serviceX");
			done();
		}
	});
	
});