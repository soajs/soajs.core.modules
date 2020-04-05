"use strict";

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */


let bcrypt = null;

if (process.env.SOAJS_BCRYPT) {
	bcrypt = require('bcrypt');
} else {
	bcrypt = require('bcryptjs');
}

let cyphers = {
	"C01": {
		"cypher": function (sid) {
			let sidC = null;
			if (sid && 32 === sid.length) {
				sidC = sid.substr(0, 3) + sid[11] + sid.substr(4, 3) + sid[15] + sid.substr(8, 3) + sid[3] + sid.substr(12, 3) + sid[7] + sid.substr(16);
			}
			return sidC;
		},
		"decypher": function (sid) {
			let sidC = null;
			if (sid && 32 === sid.length) {
				sidC = sid.substr(0, 3) + sid[11] + sid.substr(4, 3) + sid[15] + sid.substr(8, 3) + sid[3] + sid.substr(12, 3) + sid[7] + sid.substr(16);
			}
			return sidC;
		}
	},
	"C02": {
		"cypher": function (sid) {
			let sidC = null;
			if (sid && 32 === sid.length) {
				sidC = sid.substr(0, 4) + sid[12] + sid.substr(5, 4) + sid[15] + sid.substr(10, 2) + sid[4] + sid.substr(13, 2) + sid[9] + sid.substr(16);
			}
			return sidC;
		},
		"decypher": function (sid) {
			let sidC = null;
			if (sid && 32 === sid.length) {
				sidC = sid.substr(0, 4) + sid[12] + sid.substr(5, 4) + sid[15] + sid.substr(10, 2) + sid[4] + sid.substr(13, 2) + sid[9] + sid.substr(16);
			}
			return sidC;
		}
	},
	"C03": {
		"cypher": function (sid) {
			let sidC = null;
			if (sid && 32 === sid.length) {
				sidC = sid.substr(0, 5) + sid[13] + sid.substr(6, 5) + sid[15] + sid.substr(12, 1) + sid[5] + sid.substr(14, 1) + sid[11] + sid.substr(16);
			}
			return sidC;
		},
		"decypher": function (sid) {
			let sidC = null;
			if (sid && 32 === sid.length) {
				sidC = sid.substr(0, 5) + sid[13] + sid.substr(6, 5) + sid[15] + sid.substr(12, 1) + sid[5] + sid.substr(14, 1) + sid[11] + sid.substr(16);
			}
			return sidC;
		}
	}
};

let authorization = {
	"setCookie": function (auth, secret, cookieName) {
		let authdecypherd = authorization.get(auth);
		
		if (authdecypherd) {
			let securityId = authorization.umask(authdecypherd);
			
			if (securityId) {
				const crypto = require('crypto');
				let sign = function (val, secret) {
					if ('string' !== typeof val) {
						throw new TypeError('cookie required');
					}
					if ('string' !== typeof secret) {
						throw new TypeError('secret required');
					}
					return val + '.' + crypto.createHmac('sha256', secret).update(val).digest('base64').replace(/=+$/, '');
				};
				let signed = 's:' + sign(securityId, secret);
				
				return (cookieName + '=' + signed);
			}
		}
		return null;
	},
	"set": function (src, sid) {
		let securityIdMask = authorization.mask(sid);
		if (src) {
			src.set('soajsauth', "Basic " + (new Buffer("soajs:" + securityIdMask).toString('base64')));
		} else {
			return ({'soajsauth': "Basic " + (new Buffer("soajs:" + securityIdMask).toString('base64'))});
		}
	},
	"get": function (auth) {
		let base64 = decodeURIComponent(auth);
		base64 = base64.split('Basic ')[1];
		if (base64) {
			let ascii = new Buffer(base64, 'base64').toString('ascii');
			if (ascii.indexOf('soajs:') === 0) {
				return ascii.split('soajs:')[1];
			}
		}
		return null;
	},
	"mask": function (styleId) {
		let cyphersList = Object.keys(cyphers);
		let styleCode = (arguments.length === 2) ? arguments[1] : cyphersList[Math.floor((Math.random() * cyphersList.length))];
		styleId = styleCode + cyphers[styleCode].cypher(styleId);
		return styleId;
	},
	"umask": function (styleId) {
		let styleCode = styleId.substr(0, 3);
		if (cyphers[styleCode]) {
			styleId = cyphers[styleCode].decypher(styleId.slice(3));
		} else {
			styleId = styleId.slice(3);
		}
		return styleId;
	},
	"generate": function (id, secret) {
		return "Basic " + new Buffer(id.toString() + ":" + secret.toString()).toString('base64');
	}
};

let hasher = {
	"init": function (config) {
		this.config = config;
	},
	
	"hash": function () {
		
		if (this.config.hashIterations > 32) {
			console.error("Error @ hash: hash iterations set to [" + this.config.hashIterations + "] which is greater than 32 => hash iteration reset to 12");
			this.config.hashIterations = 12;
		}
		
		let plainText = arguments[0];
		if (arguments.length === 3 && arguments[1] === true && typeof (arguments[2]) === 'function') {
			let cb = arguments[2];
			//bcrypt.genSalt(this.config.hashIterations, this.config.seedLength, function(err, salt) {
			bcrypt.genSalt(this.config.hashIterations, function (err, salt) {
				if (err) {
					return cb(err);
				}
				bcrypt.hash(plainText, salt, cb);
			});
		} else {
			let salt = bcrypt.genSaltSync(this.config.hashIterations);//, this.config.seedLength);
			return bcrypt.hashSync(plainText, salt);
		}
	},
	
	"compare": function (plainText, hashText, cb) {
		return bcrypt.compare(plainText, hashText, cb);
	}
};

module.exports = {
	"authorization": authorization,
	"hasher": hasher
};