"use strict";

var assert = require('assert');
var helper = require("../helper.js");
var core = helper.requireModule('./soajs.core/index');

describe("testing get Host Ip", function() {
	
	it("success - should return a host ip", function(done) {
		core.getHostIp(function(response){
		    console.log(response)
			assert.ok(response);
			assert.equal(response.result, true);
			assert.ok(response.ip);
			assert.ok(response.extra);
			assert.equal(typeof(response.extra), 'object');
			assert.ok(Object.keys(response.extra).length > 0);
			done();
		});
	});
});
