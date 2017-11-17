"use strict";

var assert = require('assert');
var helper = require("../helper.js");
var coreProvision = helper.requireModule('./soajs.core/provision/index');

describe("core provision tests", function () {
	
	var metaData = {
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
	/*
	 describe("getOAuthToken", function() {
	 it("fail - no params", function(done) {
	 coreProvision.init(metaData);
	 coreProvision.getOauthToken("", function(error, response) {
	 assert.ifError(error);
	 assert.ok(!response);
	 done();
	 });
	 });
	 
	 it("fail - wrong params", function(done) {
	 coreProvision.init(metaData);
	 coreProvision.getOauthToken("abcd", function(error, response) {
	 assert.ifError(error);
	 assert.ok(!response);
	 done();
	 });
	 });
	 
	 it("success - correct params", function(done) {
	 coreProvision.init(metaData);
	 coreProvision.getOauthToken("60cf8406626ac96261b47a9126f76241e8384629", function(error, response) {
	 assert.ifError(error);
	 assert.ok(!response);
	 done();
	 });
	 });
	 });
	 */
	describe("getPackages", function () {
		it("success - returns packages", function (done) {
			coreProvision.init(metaData);
			coreProvision.getPackages(function (error, packages) {
				assert.ifError(error);
				assert.ok(packages);
				var packageCodes = Object.keys(packages);
				assert.ok(packageCodes.length > 0);
				done();
			});
		});
	});
	
	describe("getKeysOAuths", function () {
		it("success - returns keys", function (done) {
			coreProvision.init(metaData);
			coreProvision.getKeysOauths(function (error, keys) {
				assert.ifError(error);
				assert.ok(keys);
				assert.ok(keys.keyData);
				assert.ok(keys.oauthData);
				done();
			});
		});
	});
	
	describe("getKeys", function () {
		it("success - returns keys", function (done) {
			coreProvision.init(metaData);
			coreProvision.getKeys(function (error, keys) {
				assert.ifError(error);
				assert.ok(keys);
				//console.log(keys);
				done();
			});
		});
	});
	
	describe("getKey", function () {
		it("fail - no key provided", function (done) {
			coreProvision.init(metaData);
			coreProvision.getKey(null, function (error, info) {
				assert.ifError(error);
				assert.ok(!info);
				done();
			});
		});
		
		it("fail - wrong key provided", function (done) {
			coreProvision.init(metaData);
			coreProvision.getKey("abcd", function (error, info) {
				assert.ifError(error);
				assert.ok(!info);
				done();
			});
		});
		
		it("success - returns key Info", function (done) {
			coreProvision.init(metaData);
			coreProvision.getKey("d1eaaf5fdc35c11119330a8a0273fee9", function (error, info) {
				assert.ifError(error);
				assert.ok(info);
				//console.log(info);
				done();
			});
		});
	});
	
	describe("getPackage", function () {
		it("fail - no code provided", function (done) {
			coreProvision.init(metaData);
			coreProvision.getPackage(null, function (error, info) {
				assert.ifError(error);
				assert.ok(!info);
				done();
			});
		});
		
		it("fail - wrong code provided", function (done) {
			coreProvision.init(metaData);
			coreProvision.getPackage("abcd", function (error, info) {
				assert.ifError(error);
				assert.ok(!info);
				done();
			});
		});
		
		it("success - returns package Info", function (done) {
			coreProvision.init(metaData);
			coreProvision.getPackage("TPROD_BASIC", function (error, info) {
				assert.ifError(error);
				assert.ok(info);
				//console.log(info);
				done();
			});
		});
	});
	/*
	 describe("getTenantKeys", function() {
	 it("fail - wrong tId provided", function(done) {
	 coreProvision.init(metaData);
	 coreProvision.getTenantKeys("10d2cb5fc04ce51e06000010", function(error, info) {
	 assert.ifError(error);
	 assert.ok(!info);
	 done();
	 });
	 });
	 
	 it("success - returns tId Keys", function(done) {
	 coreProvision.init(metaData);
	 coreProvision.getTenantKeys("10d2cb5fc04ce51e06000001", function(error, keys) {
	 assert.ifError(error);
	 assert.ok(keys);
	 //console.log(keys);
	 done();
	 });
	 });
	 
	 it("success - no tId provided, returns all keys", function(done) {
	 coreProvision.init(metaData);
	 coreProvision.getTenantKeys(null, function(error, info) {
	 assert.ifError(error);
	 assert.ok(info);
	 //console.log(info);
	 done();
	 });
	 });
	 });
	 */
	
	describe("getTenantByCode", function () {
		it("success redirect", function (done) {
			coreProvision.getTenantByCode("code", function () {
				done();
			});
		});
	});
	
	describe("getEnvironmentExtKeyWithDashboardAccess", function () {
		let tenant = {
			code: "DSBD",
			applications: [
				{
					"product": "DSBRD",
					"package": "DSBRD_MAIN",
					// "appId": ObjectId('5512926a7a1f0e2123f638de'),
					"description": "This application uses the Dashboard Public Package.",
					"_TTL": 604800000,
					"keys": [
						{
							"key": "38145c67717c73d3febd16df38abf311",
							"extKeys": [
								{
									"env": "DASHBOARD",
									"extKey": "d44dfaaf1a3ba93adc6b3368816188f96134dfedec7072542eb3d84ec3e3d260f639954b8c0bc51e742c1dff3f80710e3e728edb004dce78d82d7ecd5e17e88c39fef78aa29aa2ed19ed0ca9011d75d9fc441a3c59845ebcf11f9393d5962549",
									"device": null,
									"geo": null
								}
							],
							"config": {}
						}
					]
				}
			]
		};
		
		// before(function (done) {
		//
		// });
		
		after(function (done) {
			// restore core provision, otherwise, the remaining integration test cases will fail
			coreProvision.init(metaData);
			done();
		});
		
		it("Failed - db error", function (done) {
			coreProvision.model = {
				getTenantFromCode: function (code, cb) {
					return cb({
						code: 111,
						message: "error"
					});
				}
			};
			
			coreProvision.getEnvironmentExtKeyWithDashboardAccess(tenant, function (output1) {
				done();
			});
		});
		
		it("Failed - tenant not found", function (done) {
			coreProvision.model = {
				getTenantFromCode: function (code, cb) {
					return cb();
				}
			};
			
			coreProvision.getEnvironmentExtKeyWithDashboardAccess(tenant, function (output1) {
				done();
			});
		});
		
		it("Failed - tenant found - No External key found for Environment", function (done) {
			coreProvision.model = {
				getTenantFromCode: function (code, cb) {
					return cb(null, tenant);
				}
			};
			
			coreProvision.getEnvironmentExtKeyWithDashboardAccess(tenant, function (output1) {
				done();
			});
		});
		
		it("Success - tenant found - External key found for Environment", function (done) {
			process.env.SOAJS_ENV = "DASHBOARD";
			tenant.applications[0].keys[0].extKeys[0].dashboardAccess = true;
			
			coreProvision.model = {
				getTenantFromCode: function (code, cb) {
					return cb(null, tenant);
				}
			};
			
			coreProvision.getEnvironmentExtKeyWithDashboardAccess(tenant, function () {
				done();
			});
		});
	});
	
	describe("getEnvironmentsFromACL", function () {
		let acl = {
			"dev": {},
			"dashboard": {}
		};
		let envs = [
			{
				domain: "test",
				prefix: "test",
				apiPrefix: "test",
				sitePrefix: "test",
				code: "DEV",
				port: 1234,
				deployer: {
					type: "test",
					selected: true,
				}
			}
		];
		
		it("success", function (done) {
			process.env.SOAJS_ENV = "DEV";
			coreProvision.getEnvironmentsFromACL(acl, envs);
			done();
		});
	});
	
});