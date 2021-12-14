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

function sizes(cipher) {
	for (let nkey = 1, niv = 0; ;) {
		try {
			crypto.createCipheriv(cipher, '.'.repeat(nkey), '.'.repeat(niv));
			return [nkey, niv];
		} catch (e) {
			if (/invalid iv length/i.test(e.message)) {
				niv += 1;
			} else if (/invalid key length/i.test(e.message)) {
				nkey += 1;
			} else if (/Invalid initialization vector/i.test(e.message)) {
				niv += 1;
			} else {
				throw e;
			}
		}
	}
}

function compute(cipher, passphrase) {
	let [nkey, niv] = sizes(cipher);
	for (let key = '', iv = '', p = ''; ;) {
		const h = crypto.createHash('md5');
		h.update(p, 'hex');
		h.update(passphrase);
		p = h.digest('hex');
		let n, i = 0;
		n = Math.min(p.length - i, 2 * nkey);
		nkey -= n / 2;
		key += p.slice(i, i + n);
		i += n;
		n = Math.min(p.length - i, 2 * niv);
		niv -= n / 2;
		iv += p.slice(i, i + n);
		i += n;
		if (nkey + niv === 0) {
			key = Buffer.from(key, 'hex');
			iv = Buffer.from(iv, 'hex');
			return {key, iv};
		}
	}
}

let verify = function (extKey, config, cb) {
	try {
		let key_iv = compute(config.algorithm, config.password);
		let decipher = crypto.createDecipheriv(config.algorithm, key_iv.key, key_iv.iv);
		let decrypted = decipher.update(extKey, 'hex', 'utf8');
		if (!decrypted) {
			return cb(error.generate(100));
		}
		decrypted += decipher.final('utf8');
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
		return cb(err);
	}
};

let key = {
	"getInfo": function (extKey, config, cb) {
		if (!config) {
			config = {};
		}
		config.algorithm = config.algorithm || algorithm;
		config.password = config.password || password;
		
		verify(extKey, config, function (err, keyObj) {
			if (err) {
				return cb(err);
			}
			return cb(null, keyObj);
		});
	},
	"generateInternalKey": function (cb) {
		generateUniqueId(16, function (err, uId) {
			if (err) {
				return cb(err);
			}
			return cb(null, uId);
		});
	},
	"generateExternalKey": function (key, tenant, application, config, cb) {
		if (!config) {
			config = {};
		}
		config.algorithm = config.algorithm || algorithm;
		config.password = config.password || password;
		
		generateUniqueId(12, function (err, uId) {
			if (err) {
				return cb(err);
			}
			let text = tenant.id + uId + key + application.package.length + "_" + application.package;
			try {
				let key_iv = compute(config.algorithm, config.password);
				let cipher = crypto.createCipheriv(config.algorithm, key_iv.key, key_iv.iv);
				let extKey = cipher.update(text, 'utf8', 'hex');
				if (!extKey) {
					return cb(error.generate(103));
				}
				extKey += cipher.final('hex');
				//if (extKey && extKey.length === 192) {
					return cb(null, extKey);
				//}
				//cb(error.generate(103), null);
			} catch (err) {
				return cb(err);
			}
		});
	}
};

function generateUniqueId(len, cb) {
	let id = "";
	try {
		id = crypto.randomBytes(len).toString('hex');
		return cb(null, id);
	} catch (err) {
		return cb(err);
	}
}

module.exports = key;
