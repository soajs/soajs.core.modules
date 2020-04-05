"use strict";

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const config = require("./config.js");

module.exports = {
	generate: function (errorCode) {
		let error = new Error();
		error.code = errorCode;
		error.message = config.errors[errorCode];
		if (errorCode && config.status && config.status[errorCode]) {
			error.status = config.status[errorCode];
		}
		
		return error;
	},
	getError: function (errorCode) {
		let errorObj = {"code": errorCode};
		if (errorCode && config.errors[errorCode]) {
			errorObj.msg = config.errors[errorCode];
		}
		if (errorCode && config.status && config.status[errorCode]) {
			errorObj.status = config.status[errorCode];
		}
		
		return errorObj;
	}
};