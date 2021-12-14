"use strict";

let assert = require('assert');
let helper = require("../helper.js");
let coreMeta = helper.requireModule('./soajs.core/meta/index');

describe("core meta tests", function() {

	let metaData = {
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
				"useUnifiedTopology": true
			}
		}
	};

	let systemName = "testService";
	let tenantCode = "TEST";

	it("success - should return meta object", function(done) {
		let metaDataResult = coreMeta.tenantDB(metaData, systemName, tenantCode);
		assert.ok(metaDataResult);
		
		assert.deepEqual(metaDataResult, {
			name: 'TEST_urac',
			prefix: 'testdb_',
			servers: [{host: '127.0.0.1', port: 27017}],
			credentials: '',
			streaming: {},
			"URLParam": {
				"useUnifiedTopology": true
			}
		});
		done();
	});

});
