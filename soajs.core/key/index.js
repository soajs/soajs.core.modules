"use strict";

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const error = require("../error/index");
const crypto = require('crypto');

//NOTE: below are default values
let algorithm = 'aes256';
let password = 'soajs key default';

let verify = function (extKey, cb) {
	let decipher = crypto.createDecipher(algorithm, password);
	try {
		let decrypted = decipher.update(extKey, 'hex', 'utf8') + decipher.final('utf8');
		//85 = (24)tenant._id.length + (24)uId + (32)key.length + (2 at least)[9]*_ + (3)the minimum number of character required for package code
		if (decrypted.length < 85) {
			return cb(error.generate(100));
		}
		let obj = {
			"tenantId": decrypted.substr(0, 24),
			"uId": decrypted.substr(24, 24),
			"key": decrypted.substr(48, 32)
		};
		let packageTxt = decrypted.slice(80);
		let n = packageTxt.indexOf("_");
		if (n === -1) {
			return cb(error.generate(100));
		}
		let packageCodeLen = parseInt(packageTxt.substr(0, n));
		if (isNaN(packageCodeLen)) {
			return cb(error.generate(100));
		}
		//let packageCode = packageTxt.substr(n + 1);
		//NOTE: no need to verify if the package length match since we want to give the flexibility to change the default package
		//if(packageCodeLen !== packageCode.length) {
		//	return cb(error.generate(100));
		//}
		obj.packageCode = packageTxt.substr(n + 1);
		cb(null, obj);
	} catch (err) {
		cb(err);
	}
};

let key = {
	"getInfo": function (extKey, config, cb) {
		if (config && typeof config === "object") {
			algorithm = config.algorithm || algorithm;
			password = config.password || password;
		}
		verify(extKey, function (err, keyObj) {
			if (err) {
				return cb(err);
			}
			cb(null, keyObj);
		});
	},
	"generateInternalKey": function (cb) {
		generateUniqueId(16, function (err, uId) {
			if (err) {
				return cb(err);
			}
			cb(null, uId);
		});
	},
	"generateExternalKey": function (key, tenant, application, config, cb) {
		if (config && typeof config === "object") {
			algorithm = config.algorithm || algorithm;
			password = config.password || password;
		}
		generateUniqueId(12, function (err, uId) {
			if (err) {
				return cb(err);
			}
			let text = tenant.id + uId + key + application.package.length + "_" + application.package;
			let cipher = crypto.createCipher(algorithm, password);
			let extKey = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
			
			if (extKey.length === 192) {
				return cb(null, extKey);
			}
			cb(error.generate(103), null);
		});
	}
};

function generateUniqueId(len, cb) {
	let id = "";
	try {
		id = crypto.randomBytes(len).toString('hex');
		cb(null, id);
	} catch (err) {
		cb(err);
	}
}

module.exports = key;