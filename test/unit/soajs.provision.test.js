"use strict";
let assert = require('assert');
let helper = require("../helper.js");
let core = helper.requireModule('./soajs.core');
let soajsProvision = helper.requireModule('./soajs.provision');
let ObjectId = require("mongodb").ObjectID;

let keyConfig = {
	"algorithm": 'aes256',
	"password": 'soajs key lal massa'
};
let key = "d1eaaf5fdc35c11119330a8a0273fee9";
let extKey = "aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac";
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
		"useUnifiedTopology": true
	}
};
let soajsMongo = helper.requireModule('./index.js').mongo;
let mongo = new soajsMongo(metaData);

describe('testing soajs provisioning', function () {
	let internalKey, externalKey;
	let log = core.getLogger("standalone", {src: true, level: 'debug'});
	soajsProvision.init(metaData, log);
	
	describe("testing generateInternalKey", function () {
		
		it("success - will return data", function (done) {
			soajsProvision.generateInternalKey(function (error, data) {
				assert.ifError(error);
				assert.ok(data);
				internalKey = data;
				done();
			});
		});
	});
	
	describe("testing generateExternalKey", function () {
		
		it("fail - no param", function (done) {
			soajsProvision.generateExtKey(null, keyConfig, function (error, data) {
				assert.ok(error);
				assert.ok(!data);
				done();
			});
		});
		
		it("fail - wrong key", function (done) {
			soajsProvision.generateExtKey("abcd", keyConfig, function (error, data) {
				assert.ok(error);
				assert.ok(!data);
				done();
			});
		});
		
		it("success - will return data", function (done) {
			soajsProvision.generateExtKey(key, keyConfig, function (error, data) {
				assert.ifError(error);
				assert.ok(data);
				externalKey = data;
				done();
			});
		});
	});
	
	describe("testing getExternalKeyData", function () {
		
		it("fail - no param given", function (done) {
			soajsProvision.getExternalKeyData(null, keyConfig, function (error, data) {
				assert.ok(error);
				assert.ok(!data);
				assert.equal(error.code, 200);
				done();
			});
		});
		
		it("fail - no param given", function (done) {
			soajsProvision.getExternalKeyData("abcd", keyConfig, function (error, data) {
				assert.ok(error);
				assert.ok(!data);
				done();
			});
		});
		
		it("success - will return data", function (done) {
			soajsProvision.getExternalKeyData(extKey, keyConfig, function (error, data) {
				assert.ifError(error);
				assert.ok(data);
				//console.log(data);
				done();
			});
		});
		
		it('success - add an expired key', function (done) {
			mongo.findOne('tenants', {}, function (error, response) {
				assert.ifError(error);
				assert.ok(response);
				response.applications.push({
					"product": "TPROD",
					"package": "TPROD_EXAMPLE03",
					"appId": new ObjectId("30d2cb5fc04ce51e06000003"),
					"description": "this is a description for app testing...",
					"_TTL": 2000, // 4 seconds
					"keys": [
						{
							"key": internalKey,
							"extKeys": [
								{
									"expDate": new Date().getTime() - 86400000,
									"extKey": externalKey,
									"device": {},
									"geo": {}
								}
							],
							"config": {
								"urac": {}
							}
						}
					]
				});
				mongo.save('tenants', response, function (error) {
					assert.ifError(error);
					setTimeout(function () {
						
						soajsProvision.getExternalKeyData(externalKey, keyConfig, function (error, data) {
							//assert.ifError(error);
							//assert.ok(data);
							//console.log(error, data);
							response.applications.pop();
							mongo.save('tenants', response, function (error) {
								assert.ifError(error);
								done();
							});
						});
					}, 3000);
				});
				
			});
		});
	});
	
	describe("testing getPackageData", function () {
		
		it("fail - no param given", function (done) {
			soajsProvision.getPackageData(null, function (error, data) {
				assert.ok(error);
				assert.ok(!data);
				assert.equal(error.code, 201);
				done();
			});
		});
		
		it("fail - no param given", function (done) {
			soajsProvision.getPackageData("abcd", function (error, data) {
				assert.ok(error);
				assert.ok(!data);
				assert.equal(error.code, 201);
				done();
			});
		});
		
		it("success - will return data", function (done) {
			soajsProvision.getPackageData("TPROD_BASIC", function (error, data) {
				assert.ifError(error);
				assert.ok(data);
				done();
			});
		});
	});
	
	describe("testing getPackagesData", function () {
		
		it("fail - no param given", function (done) {
			soajsProvision.getPackagesData(null, function (error, data) {
				assert.ok(error);
				assert.ok(!data);
				assert.equal(error.code, 209);
				done();
			});
		});
		
		it("fail - empty array", function (done) {
			soajsProvision.getPackagesData([], function (error, data) {
				assert.ok(error);
				assert.ok(!data);
				assert.equal(error.code, 209);
				done();
			});
		});
		
		it("fail - wrong pack code", function (done) {
			soajsProvision.getPackagesData(["abcd"], function (error, data) {
				assert.ok(error);
				assert.ok(!data);
				assert.equal(error.code, 201);
				done();
			});
		});
		
		it("success - array of 1 pack code", function (done) {
			soajsProvision.getPackagesData(["TPROD_BASIC"], function (error, data) {
				assert.ifError(error);
				assert.ok(data);
				done();
			});
		});
		
		it("success - array of 3 pack codes", function (done) {
			soajsProvision.getPackagesData(["TPROD_BASIC", "TPROD_BASI2", "TPROD_EXAMPLE03"], function (error, data) {
				console.log(error, data);
				assert.ifError(error);
				assert.ok(data);
				done();
			});
		});
	});
	
	describe("getTenantData", function () {
		it("fail - wrong tId provided", function (done) {
			soajsProvision.getTenantData("10d2cb5fc04ce51e06000010", function (error, info) {
				assert.ok(error);
				done();
			});
		});
		
		it("fail - tId provided as null ", function (done) {
			soajsProvision.getTenantData(null, function (error, info) {
				assert.ok(error);
				done();
			});
		});
		
		it("success - will return tenant data", function (done) {
			mongo.findOne('tenants', {}, function (error, response) {
				assert.ifError(error);
				assert.ok(response);
				soajsProvision.getTenantData(response._id, function (error, info) {
					assert.ifError(error);
					assert.ok(info);
					done();
				});
			});
		});
	});
	
	describe("loadDaemonGrpConf", function () {
		it("fail - wrong info provided", function (done) {
			soajsProvision.loadDaemonGrpConf('test', null, function (error, info) {
				assert.equal(error, false);
				assert.ifError(info);
				done();
			});
		});
		
		it("success - will return daemon conf", function (done) {
			let document = {
				"daemonConfigGroup": "testGroup",
				"daemon": "test",
				"interval": 200000,
				"status": 1,
				"solo": false,
				"processing": "parallel",
				"type": "interval",
				"jobs": {},
				"order": []
			};
			mongo.insert("daemon_grpconf", document, function (error) {
				assert.ifError(error);
				
				soajsProvision.loadDaemonGrpConf('testGroup', 'test', function (error, response) {
					assert.ifError(error);
					assert.ok(response);
					done();
				});
			});
		});
	});
});

describe("oauthModel tests", function () {
	
	describe("getClient tests", function () {
		it("fail - no client id provided", function (done) {
			soajsProvision.oauthModel.getClient(null, null, function (error, response) {
				assert.ok(!error);
				assert.ok(!response);
				done();
			});
		});
		
		it("success - no secret provided", function (done) {
			soajsProvision.init(metaData);
			soajsProvision.loadProvision(function (loaded) {
				assert.ok(loaded);
				soajsProvision.oauthModel.getClient('10d2cb5fc04ce51e06000001', null, function (error, response) {
					assert.ok(!error);
					assert.ok(response);
					assert.deepEqual(response, {"clientId": "10d2cb5fc04ce51e06000001"});
					done();
				});
			});
		});
		
		it("success - all provided correctly", function (done) {
			soajsProvision.init(metaData);
			soajsProvision.loadProvision(function (loaded) {
				assert.ok(loaded);
				soajsProvision.oauthModel.getClient('10d2cb5fc04ce51e06000001', "shhh this is a secret", function (error, response) {
					assert.ok(!error);
					assert.ok(response);
					assert.deepEqual(response, {"clientId": "10d2cb5fc04ce51e06000001"});
					done();
				});
			});
		});
	});
	
	describe("grantTypeAllowed tests", function () {
		before(function (done) {
			soajsProvision.init(metaData);
			soajsProvision.loadProvision(function (loaded) {
				assert.ok(loaded);
				done();
			});
		});
		
		it("fail - no params provided", function (done) {
			soajsProvision.oauthModel.grantTypeAllowed(null, null, function (error, response) {
				assert.ok(!error);
				assert.ok(response);
				done();
			});
		});
		
		it("fail - no grantType provided", function (done) {
			soajsProvision.oauthModel.grantTypeAllowed('10d2cb5fc04ce51e06000001', null, function (error, response) {
				assert.ok(!error);
				assert.ok(response);
				done();
			});
		});
		
		it("success - all provided correctly grantType=password", function (done) {
			soajsProvision.oauthModel.grantTypeAllowed('10d2cb5fc04ce51e06000001', "password", function (error, response) {
				assert.ok(!error);
				assert.ok(response);
				done();
			});
		});
		
		it("success - all provided correctly grantType=refresh_token", function (done) {
			soajsProvision.oauthModel.grantTypeAllowed('10d2cb5fc04ce51e06000001', "refresh_token", function (error, response) {
				assert.ok(!error);
				assert.ok(response);
				done();
			});
		});
		
	});
	
	describe("saveAccessToken tests", function () {
		
		it("success tests", function (done) {
			soajsProvision.oauthModel.saveAccessToken("e21538dd55806e47436227c9d2ab8f76348cee12", "10d2cb5fc04ce51e06000001", null, "22d2cb5fc04ce51e06000001", function (err, token) {
				assert.ok(!err);
				assert.ok(!token);
				done();
			});
		});
	});
	
	describe("saveRefreshToken tests", function () {
		
		it("success tests", function (done) {
			soajsProvision.oauthModel.saveRefreshToken("4eaef80c01709fb7cb058aaf9ca9921f6a4da222", "10d2cb5fc04ce51e06000001", null, "22d2cb5fc04ce51e06000001", function (err, token) {
				assert.ok(!err);
				assert.ok(!token);
				done();
			});
		});
	});
	
	describe("getAccessToken tests", function () {
		
		it("success tests", function (done) {
			soajsProvision.oauthModel.getAccessToken("e21538dd55806e47436227c9d2ab8f76348cee12", function (err, token) {
				assert.ok(!err);
				assert.ok(token);
				done();
			});
		});
	});
	
	describe("getRefreshToken tests", function () {
		
		it("success tests", function (done) {
			soajsProvision.oauthModel.getRefreshToken("4eaef80c01709fb7cb058aaf9ca9921f6a4da222", function (err, token) {
				assert.ok(!err);
				assert.ok(token);
				done();
			});
		});
	});
	
	describe("getUser tests", function () {
		
		it("success tests", function (done) {
			soajsProvision.oauthModel.getUser(null, null, function (err, users) {
				assert.ok(!err);
				done();
			});
		});
	});
});

describe("testing generate tokens", function () {
	
	it("success - should generate tokens", function (done) {
		let req = {
			headers: {},
			soajs: {
				tenant: {
					id: "10d2cb5fc04ce51e06000001"
				},
				registry: {
					serviceConfig: {
						oauth: {
							grants: [
								"password",
								"refresh_token"
							],
							accessTokenLifetime: 7200.0,
							refreshTokenLifetime: 1209600.0,
							debug: false
						}
					}
				}
			}
		};
		
		let user = {
			"_id": '58cff717423cbb6425df4e3f',
			"locked": true,
			"username": "owner",
			"firstName": "owner",
			"lastName": "owner",
			"email": "me@localhost.com",
			"ts": 1490024215844,
			"status": "active",
			"profile": {},
			"groups": [
				"owner"
			],
			"config": {
				"packages": {},
				"keys": {}
			},
			"tenant": {
				"id": "10d2cb5fc04ce51e06000001",
				"code": "DBTN"
			},
			"groupsConfig": [
				{
					"_id": '58cff718423cbb6425df4e40',
					"locked": true,
					"code": "owner",
					"name": "Owner Group",
					"description": "this is the owner group that owns the dashboard",
					"tenant": {
						"id": "10d2cb5fc04ce51e06000001",
						"code": "DBTN"
					}
				}
			],
			"loginMode": "urac",
			"id": "58cff717423cbb6425df4e3f"
		};
		
		soajsProvision.generateSaveAccessRefreshToken(user, req, function (err, response) {
			assert.ifError(err);
			assert.ok(response);
			assert.ok(response.access_token);
			assert.ok(response.refresh_token);
			
			done();
		});
	});
});

describe("Soajs Provision", function () {
	it("getTenantByCode redirect", function (done) {
		soajsProvision.getTenantByCode("1", function (error, response) {
			done();
		});
	});
	
	it("getEnvironmentExtKeyWithDashboardAccess redirect", function (done) {
		soajsProvision.getEnvironmentExtKeyWithDashboardAccess("1", function (error, response) {
			done();
		});
	});
	/*
		it("getEnvironmentsFromACL redirect", function (done) {
			soajsProvision.getEnvironmentsFromACL("1", function (error, response) {
				done();
			});
		});
	*/
	it.skip("getExternalKeyData - error", function (done) {
		soajsProvision.getExternalKeyData(function (error, response) {
			done();
		});
	});
});
