"use strict";
let assert = require('assert');
let fs = require("fs");
let helper = require("../helper.js");

let coreValidator = helper.requireModule('./soajs.core/index');
let validator = coreValidator.validator;

describe("testing validator", function() {

	it("testing schema patterns", function(done) {
		assert.ok(validator.SchemaPatterns.email);
		done();
	});

});
