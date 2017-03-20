"use strict";

var assert = require('assert');
var helper = require("../helper.js");
var coreMeta = helper.requireModule('./soajs.core/meta/index');

describe("core meta tests", function() {

	var metaData = {
		"testService": {
			"name": "#TENANT_NAME#_urac",
			"prefix": 'testdb_',
			"servers": [
				{
					"host": "127.0.0.1",
					"port": 27017
				}
			],
			"credentials": "",
			"streaming": {},
			"URLParam": {
				"poolSize": 5,
				"autoReconnect": true
			}
		}
	};

	var systemName = "testService";
	var tenantCode = "TEST";

	it("success - should return meta object", function(done) {
		var metaDataResult = coreMeta.tenantDB(metaData, systemName, tenantCode);
		assert.ok(metaDataResult);
		
		assert.deepEqual(metaDataResult, {
			name: 'TEST_urac',
			prefix: 'testdb_',
			servers: [{host: '127.0.0.1', port: 27017}],
			credentials: '',
			streaming: {},
			URLParam: {
				"poolSize": 5,
				"autoReconnect": true
			}
		});
		done();
	});

});
