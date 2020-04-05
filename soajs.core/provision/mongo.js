"use strict";

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

const Mongo = require('../../soajs.mongo');

let mongo = null;
let oauthMongo = null;
let oauthSeperate = false;

let tenantCollectionName = "tenants";
let productsCollectionName = "products";
let tokenCollectionName = "oauth_token";
let daemonGrpConfCollectionName = "daemon_grpconf";
let oauthUracCollectionName = "oauth_urac";

let regEnvironment = (process.env.SOAJS_ENV || "dev");
regEnvironment = regEnvironment.toLowerCase();

const sensitiveEnvCodes = ["dashboard", "portal"];
const localLib = require('./lib.js');

module.exports = {
	"init": function (dbConfig) {
		if (dbConfig && dbConfig.provision && dbConfig.oauth) {
			mongo = new Mongo(dbConfig.provision);
			oauthMongo = new Mongo(dbConfig.oauth);
			oauthSeperate = true;
		} else {
			mongo = new Mongo(dbConfig);
			oauthMongo = mongo;
		}
		
		mongo.createIndex(tenantCollectionName, {code: 1}, {unique: true}, () => {
		});
		mongo.createIndex(tenantCollectionName, {'applications.keys.key': 1}, {}, () => {
		});
		mongo.createIndex(productsCollectionName, {code: 1}, {unique: true}, () => {
		});
		mongo.createIndex(productsCollectionName, {'packages.code': 1}, {}, () => {
		});
		mongo.createIndex(oauthUracCollectionName, {userId: 1}, {unique: true}, () => {
		});
		oauthMongo.createIndex(tokenCollectionName, {token: 1, type: 1}, {}, () => {
		});
		oauthMongo.createIndex(tokenCollectionName, {expires: 1}, {expireAfterSeconds: 0}, () => {
		});
		mongo.createIndex(daemonGrpConfCollectionName, {daemonConfigGroup: 1, daemon: 1}, {}, () => {
		});
	},
	
	"getAccessToken": function (bearerToken, cb) {
		oauthMongo.findOne(tokenCollectionName, {"token": bearerToken, "type": "accessToken"}, function (err, rec) {
			if (rec && rec.env === regEnvironment) {
				return cb(err, rec);
			} else {
				if (rec && sensitiveEnvCodes.includes(rec.env.toLowerCase())) {
					return cb(err, rec);
				} else {
					if (oauthSeperate) {
						mongo.findOne(tokenCollectionName, {
							"token": bearerToken,
							"type": "accessToken"
						}, function (err, rec) {
							if (rec && rec.env === regEnvironment) {
								return cb(err, rec);
							} else {
								if (rec && sensitiveEnvCodes.includes(rec.env.toLowerCase())) {
									return cb(err, rec);
								} else {
									return cb(err, null);
								}
							}
						});
					} else {
						return cb(err, null);
					}
				}
			}
		});
	},
	"getRefreshToken": function (bearerToken, cb) {
		oauthMongo.findOne(tokenCollectionName, {"token": bearerToken, "type": "refreshToken"}, function (err, rec) {
			if (rec && rec.env === regEnvironment) {
				return cb(err, rec);
			} else {
				if (rec && sensitiveEnvCodes.includes(rec.env.toLowerCase())) {
					return cb(err, rec);
				} else {
					return cb(err, null);
				}
			}
		});
	},
	"saveAccessToken": function (accessToken, clientId, expires, user, cb) {
		let tokenRecord = {
			type: "accessToken",
			token: accessToken,
			clientId: clientId,
			user: user,
			env: regEnvironment,
			expires: expires
		};
		oauthMongo.insert(tokenCollectionName, tokenRecord, function (err) {
			return cb(err);
		});
	},
	"saveRefreshToken": function (refreshToken, clientId, expires, user, cb) {
		let tokenRecord = {
			type: "refreshToken",
			token: refreshToken,
			clientId: clientId,
			user: user,
			env: regEnvironment,
			expires: expires
		};
		oauthMongo.insert(tokenCollectionName, tokenRecord, function (err) {
			return cb(err);
		});
	},
	
	"getDaemonGrpConf": function (grp, name, cb) {
		if (grp && name) {
			let criteria = {
				"daemonConfigGroup": grp,
				"daemon": name
			};
			mongo.find(daemonGrpConfCollectionName, criteria, null, function (err, grpCong) {
				if (err) {
					return cb(err);
				}
				cb(null, grpCong[0]);
			});
		} else {
			return cb();
		}
	},
	"getPackagesFromDb": function (code, cb) {
		let criteria = {};
		if (code) {
			criteria['packages.code'] = code;
		}
		mongo.find(productsCollectionName, criteria, null, function (err, products) {
			if (err) {
				return cb(err);
			}
			let struct = null;
			if (products) {
				let prodLen = products.length;
				for (let i = 0; i < prodLen; i++) {
					if (products[i].packages) {
						let pckLen = products[i].packages.length;
						for (let j = 0; j < pckLen; j++) {
							if (!code || (code && products[i].packages[j].code === code)) {
								if (!struct) {
									struct = {};
								}
								
								let ACL_ALL_ENV = null;
								let ACL = null;
								if (products[i].packages[j].acl) {
									for (let env in products[i].packages[j].acl) {
										if (Object.hasOwnProperty.call(products[i].packages[j].acl, env)) {
											if (!ACL_ALL_ENV) {
												ACL_ALL_ENV = {};
											}
											if (products[i].scope &&
												!((products[i].packages[j].aclTypeByEnv && products[i].packages[j].aclTypeByEnv[env] && products[i].packages[j].aclTypeByEnv[env] === "granular") ||
													(products[i].packages[j].aclType && products[i].packages[j].aclType === "granular"))
											) {
												ACL_ALL_ENV[env] = localLib.getACLFromScopebyEnv(products[i].scope.acl, products[i].packages[j].acl[env], env);
											} else {
												ACL_ALL_ENV[env] = products[i].packages[j].acl[env];
											}
										}
									}
								}
								if (ACL_ALL_ENV && ACL_ALL_ENV[regEnvironment]) {
									ACL = ACL_ALL_ENV[regEnvironment];
								} else {
									ACL = ACL_ALL_ENV;
								}
								/*
								if (products[i].scope && !(products[i].packages[j].aclType && products[i].packages[j].aclType === "granular")) {
									ACL_ALL_ENV = localLib.getACLFromScope(products[i].scope.acl, products[i].packages[j].acl);
									ACL = ACL_ALL_ENV;
								} else {
									ACL_ALL_ENV = products[i].packages[j].acl;
									ACL = ACL_ALL_ENV;
								}
								if (ACL_ALL_ENV && typeof ACL_ALL_ENV === "object") {
									if (ACL_ALL_ENV[regEnvironment] && (!Object.hasOwnProperty.call(ACL_ALL_ENV[regEnvironment], 'access') && !Object.hasOwnProperty.call(ACL_ALL_ENV[regEnvironment], 'apis') && !Object.hasOwnProperty.call(ACL_ALL_ENV[regEnvironment], 'apisRegExp') && !Object.hasOwnProperty.call(ACL_ALL_ENV[regEnvironment], 'apisPermission'))) {
										ACL = ACL_ALL_ENV[regEnvironment];
									}
								} else {
									ACL_ALL_ENV = null;
									ACL = null;
								}
								*/
								struct[products[i].packages[j].code] = {
									"acl": ACL,
									"acl_all_env": ACL_ALL_ENV,
									"_TTL": products[i].packages[j]._TTL,
									"_TIME": new Date().getTime()
								};
							}
						}
					}
				}
			}
			return cb(null, struct);
		});
	},
	"getKeyFromDb": function (key, tId, oauth, cb) {
		let criteria = {};
		if (key) {
			criteria['applications.keys.key'] = key;
		}
		if (tId) {
			criteria._id = mongo.ObjectId(tId);
		}
		mongo.find(tenantCollectionName, criteria, null, function (err, tenants) {
			if (err) {
				return cb(err);
			}
			let keyStruct = null;
			let oauthStruct = null;
			let tenantStruct = null;
			if (tenants) {
				let tenLen = tenants.length;
				for (let i = 0; i < tenLen; i++) {
					
					if (tenants[i].oauth) {
						if (!oauthStruct) {
							oauthStruct = {};
						}
						oauthStruct[tenants[i]._id.toString()] = tenants[i].oauth;
					}
					
					if (!tenantStruct) {
						tenantStruct = {};
					}
					tenantStruct[tenants[i]._id.toString()] = {"code": tenants[i].code};
					
					if (tenants[i].applications) {
						let appLen = tenants[i].applications.length;
						for (let j = 0; j < appLen; j++) {
							if (tenants[i].applications[j].keys) {
								let keyLen = tenants[i].applications[j].keys.length;
								for (let k = 0; k < keyLen; k++) {
									if (!key || (key && tenants[i].applications[j].keys[k].key === key)) {
										if (!keyStruct) {
											keyStruct = {};
										}
										let keyConfig = tenants[i].applications[j].keys[k].config;
										if (keyConfig && typeof keyConfig === "object" && keyConfig[regEnvironment]) {
											keyConfig = keyConfig[regEnvironment];
										} else {
											keyConfig = {};
										}
										let ACL_ALL_ENV = tenants[i].applications[j].acl;
										let ACL = ACL_ALL_ENV;
										if (ACL_ALL_ENV && typeof ACL_ALL_ENV === "object") {
											if (ACL_ALL_ENV[regEnvironment] &&
												(
													!Object.hasOwnProperty.call(ACL_ALL_ENV[regEnvironment], 'access') &&
													!Object.hasOwnProperty.call(ACL_ALL_ENV[regEnvironment], 'apis') &&
													!Object.hasOwnProperty.call(ACL_ALL_ENV[regEnvironment], 'apisRegExp') &&
													!Object.hasOwnProperty.call(ACL_ALL_ENV[regEnvironment], 'apisPermission')
												)) {
												ACL = ACL_ALL_ENV[regEnvironment];
											}
										} else {
											ACL_ALL_ENV = null;
											ACL = null;
										}
										
										keyStruct[tenants[i].applications[j].keys[k].key] = {
											"key": tenants[i].applications[j].keys[k].key,
											"tenant": {
												"id": tenants[i]._id.toString(),
												"code": tenants[i].code,
												"locked": !!tenants[i].locked,
												"type": tenants[i].type,
												"profile": tenants[i].profile || {}
											},
											"application": {
												"product": tenants[i].applications[j].product,
												"package": tenants[i].applications[j].package,
												"appId": tenants[i].applications[j].appId.toString(),
												"acl": ACL,
												"acl_all_env": ACL_ALL_ENV
											},
											"extKeys": tenants[i].applications[j].keys[k].extKeys,
											"config": keyConfig,
											"_TTL": tenants[i].applications[j]._TTL,
											"_TIME": new Date().getTime()
										};
										if (tenants[i].type === "client" && tenants[i].tenant && tenants[i].tenant.id && tenants[i].tenant.code) {
											keyStruct[tenants[i].applications[j].keys[k].key].tenant.main = tenants[i].tenant;
										}
									}
								}
							}
						}
					}
				}
			}
			if (oauth) {
				return cb(null, {"keyData": keyStruct, "oauthData": oauthStruct, "tenantData": tenantStruct});
			} else {
				return cb(null, keyStruct);
			}
		});
	},
	
	"getTenantFromCode": function (code, cb) {
		mongo.findOne(tenantCollectionName, {"code": code.toUpperCase()}, cb);
	},
	
	
};
