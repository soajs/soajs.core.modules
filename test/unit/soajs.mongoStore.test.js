"use strict";
var assert = require('assert');
var session = require('express-session');

var helper = require("../helper.js");
var core = helper.requireModule("./soajs.core");
var soajsmongoStore = helper.requireModule('./soajs.mongoStore');

describe("mongoStore tests", function() {
	var MongoStore = soajsmongoStore(session);
	//var registry = core.getRegistry();
	var store = new MongoStore({
        "name": "core_session",
        "prefix": "",
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
		},
        'store': {},
        "collection": "sessions",
        'stringify': false,
        'expireAfter': 1000 * 60 * 60 * 24 * 14 // 2 weeks
    });

	describe("testing get", function() {
		it("fail - no sid provided", function(done) {
			store.get(null, function(error, data) {
				assert.ok(!error);
				assert.ok(!data);
				done();
			});
		});

		it("fail - invalid sid provided", function(done) {
			store.get("abcdef", function(error, data) {
				assert.ok(!error);
				assert.ok(!data);
				done();
			});
		});

		it("fail - empty sid provided", function(done) {
			store.get("", function(error, data) {
				assert.ok(!error);
				assert.ok(!data);
				done();
			});
		});
	});

	describe("testing clear & length", function(){
		it('success test case',function(done){
			store.clear(function(error){
				assert.ifError(error);
				done();
			});
		});

		it('success test case',function(done){
			store.length(function(error, count){
				assert.ifError(error);
				assert.equal(count , 0);
				done();
			});
		});
	});
	
	describe("testing set", function(){
		it("success test case", function(done){
			var session = {
				cookie: {
					
				}
			};
			store.set('abcdef1234',session,function(error, response){
				done();
			});
		});
		
		it("success test case", function(done){
			var tomorrow = new Date();
			tomorrow.setDate(new Date().getDate() + 1);
			
			var session = {
				persistSession: {
					state :{
						DONE: false
					}
				},
				cookie: {
					_expires: tomorrow
				}
			};
			store.set('abcdef1234',session,function(error, response){
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});
		
		it("success test case", function(done){
			var tomorrow = new Date();
			tomorrow.setDate(new Date().getDate() + 1);
			
			var session = {
				persistSession: {
					state :{
						DONE: false,
						KEY: true,
						SERVICE: true,
						CLIENTINFO: true
					},
					holder:{
						tenant: {
							"id": '10d2cb5fc04ce51e06000001',
							"code": "test",
							"key": "d1eaaf5fdc35c11119330a8a0273fee9",
							"extKey": "aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac"
						},
						"product": {
							"product": "TPROD",
							"package": "TPROD_BASIC",
							"appId": "30d2cb5fc04ce51e06000001"
						},
						"request": {
							"service": "urac",
							"api": "/account/getUser"
						}
					}
				},
				sessions: {
					"10d2cb5fc04ce51e06000001": {
						"urac": null,
						"clientInfo": {
							"device": null,
							"geo": {
								"ip": "127.0.0.1"
							},
							"extKey": "aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac"
						},
						"keys": {
							"d1eaaf5fdc35c11119330a8a0273fee9": {
								"services": {}
							}
						}
					}
				},
				cookie: {
					_expires: tomorrow,
				}
			};
			store.set('abcdef1234',session,function(error, response){
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});
		
		it("success test case", function(done){
			var tomorrow = new Date();
			tomorrow.setDate(new Date().getDate() + 1);
			
			var session = {
				persistSession: {
					state :{
						DONE: false,
						TENANT: true,
						KEY: true,
						SERVICE: true,
						CLIENTINFO: true
					},
					holder:{
						tenant: {
							"id": '10d2cb5fc04ce51e06000001',
							"code": "test",
							"key": "d1eaaf5fdc35c11119330a8a0273fee9",
							"extKey": "aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac"
						},
						"product": {
							"product": "TPROD",
							"package": "TPROD_BASIC",
							"appId": "30d2cb5fc04ce51e06000001"
						},
						"request": {
							"service": "urac",
							"api": "/account/getUser"
						}
					}
				},
				sessions: {
					"10d2cb5fc04ce51e06000001": {
						"urac": null,
						"clientInfo": {
							"device": null,
							"geo": {
								"ip": "127.0.0.1"
							},
							"extKey": "aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac"
						},
						"keys": {
							"d1eaaf5fdc35c11119330a8a0273fee9": {
								"services": {}
							}
						}
					}
				},
				cookie: {
					_expires: tomorrow,
				}
			};
			store.set('abcdef1234',session,function(error, response){
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});
		
		it("success test case", function(done){
			
			var session = {
				persistSession: {
					state :{
						DONE: false,
						ALL: false,
						TENANT: false,
						KEY: false,
						SERVICE: true,
						CLIENTINFO: true
					},
					holder:{
						tenant: {
							"id": '10d2cb5fc04ce51e06000001',
							"code": "test",
							"key": "d1eaaf5fdc35c11119330a8a0273fee9",
							"extKey": "aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac"
						},
						"product": {
							"product": "TPROD",
							"package": "TPROD_BASIC",
							"appId": "30d2cb5fc04ce51e06000001"
						},
						"request": {
							"service": "urac",
							"api": "/account/getUser"
						}
					}
				},
				sessions: {
					"10d2cb5fc04ce51e06000001": {
						"urac": null,
						"clientInfo": {
							"device": null,
							"geo": {
								"ip": "127.0.0.1"
							},
							"extKey": "aa39b5490c4a4ed0e56d7ec1232a428f771e8bb83cfcee16de14f735d0f5da587d5968ec4f785e38570902fd24e0b522b46cb171872d1ea038e88328e7d973ff47d9392f72b2d49566209eb88eb60aed8534a965cf30072c39565bd8d72f68ac"
						},
						"keys": {
							"d1eaaf5fdc35c11119330a8a0273fee9": {
								"services": {}
							}
						}
					}
				}
			};
			store.set('abcdef1234',session,function(error, response){
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});
	});
});