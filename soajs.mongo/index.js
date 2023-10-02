"use strict";

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */


const core = require("../soajs.core");
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const AggregationCursor = mongodb.AggregationCursor;

const objectHash = require("object-hash");

AggregationCursor.prototype._toArray = AggregationCursor.prototype.toArray;

AggregationCursor.prototype.toArray = function (cb) {
	let self = this;
	if (typeof cb === "function") {
		(async () => {
			try {
				let arr = await self._toArray();
				return cb(null, arr);
			} catch (e) {
				return cb(e, null);
			}
		})();
	}
	return self._toArray();
};

let connectQueue = [];
const processQueue = (error) => {
	connectQueue.forEach(prom => {
		if (error) {
			prom.reject(error);
		} else {
			prom.resolve();
		}
	});
	connectQueue = [];
};

let cacheDB = {};
let cacheCluster = {};
let cachePending = false;
let cacheDBLib = {
	"init": function (registryLocation) {
		if (registryLocation && registryLocation.env) {
			if (!cacheDB) {
				cacheDB = {};
			}
			if (!cacheDB[registryLocation.env]) {
				cacheDB[registryLocation.env] = {};
			}
			if (!cacheCluster) {
				cacheCluster = {};
			}
			if (!cacheCluster[registryLocation.env]) {
				cacheCluster[registryLocation.env] = {};
			}

			if (registryLocation.cluster) {
				if (!cacheCluster[registryLocation.env][registryLocation.cluster]) {
					cacheCluster[registryLocation.env][registryLocation.cluster] = {};
				}
			} else if (registryLocation.l1 && registryLocation.l2) {
				if (!cacheDB[registryLocation.env][registryLocation.l1]) {
					cacheDB[registryLocation.env][registryLocation.l1] = {};
				}
				if (!cacheDB[registryLocation.env][registryLocation.l1][registryLocation.l2]) {
					cacheDB[registryLocation.env][registryLocation.l1][registryLocation.l2] = {};
				}
			}
		}
	},
	"flush": function (registryLocation) {
		if (registryLocation && registryLocation.cluster) {
			cacheCluster[registryLocation.env][registryLocation.cluster].client = null;
		} else if (registryLocation && registryLocation.env && registryLocation.l1 && registryLocation.l2) {
			cacheDB[registryLocation.env][registryLocation.l1][registryLocation.l2].db = null;
		}
	},
	"getCache": function (registryLocation) {
		if (registryLocation && registryLocation.cluster) {
			if (cacheCluster[registryLocation.env][registryLocation.cluster]) {
				return cacheCluster[registryLocation.env][registryLocation.cluster];
			}
		} else if (registryLocation && registryLocation.env && registryLocation.l1 && registryLocation.l2) {
			if (cacheDB[registryLocation.env][registryLocation.l1][registryLocation.l2]) {
				return cacheDB[registryLocation.env][registryLocation.l1][registryLocation.l2];
			}
		}
		return null;
	},
	"setTimeLoaded": function (registryLocation, timeLoaded) {
		if (registryLocation && registryLocation.cluster) {
			cacheCluster[registryLocation.env][registryLocation.cluster].timeLoaded = timeLoaded;
		} else if (registryLocation && registryLocation.env && registryLocation.l1 && registryLocation.l2) {
			cacheDB[registryLocation.env][registryLocation.l1][registryLocation.l2].timeLoaded = timeLoaded;
		}
	},

	"setDB": function (registryLocation, obj) {
		if (registryLocation && registryLocation.cluster) {
			cacheCluster[registryLocation.env][registryLocation.cluster].client = obj.client;
			if (registryLocation.timeLoaded) {
				cacheCluster[registryLocation.env][registryLocation.cluster].timeLoaded = registryLocation.timeLoaded;
			}
		} else if (registryLocation && registryLocation.env && registryLocation.l1 && registryLocation.l2) {
			cacheDB[registryLocation.env][registryLocation.l1][registryLocation.l2].db = obj.db;
			if (registryLocation.timeLoaded) {
				cacheDB[registryLocation.env][registryLocation.l1][registryLocation.l2].timeLoaded = registryLocation.timeLoaded;
			}
		}
	},
	"setHash": function (registryLocation, config) {
		if (registryLocation && registryLocation.cluster) {
			cacheCluster[registryLocation.env][registryLocation.cluster].configCloneHash = {
				"servers": config.servers,
				"credentials": config.credentials || null,
			};
			cacheCluster[registryLocation.env][registryLocation.cluster].configCloneHash = objectHash(cacheCluster[registryLocation.env][registryLocation.cluster].configCloneHash);
		} else if (registryLocation && registryLocation.env && registryLocation.l1 && registryLocation.l2) {
			cacheDB[registryLocation.env][registryLocation.l1][registryLocation.l2].configCloneHash = {
				"servers": config.servers,
				"credentials": config.credentials || null,
			};
			cacheDB[registryLocation.env][registryLocation.l1][registryLocation.l2].configCloneHash = objectHash(cacheDB[registryLocation.env][registryLocation.l1][registryLocation.l2].configCloneHash);
		}
	},

	"setCache": function (obj) {
		cacheDBLib.setDB(obj.config.registryLocation, obj);
		cacheDBLib.setHash(obj.config.registryLocation, obj.config);
	}
};

/* CLASS MongoDriver
 *
 * {
 *  name : ""
 *  prefix : ""
 *  servers : [{host : "", port : ""} ...]
 *  credentials : {username : "", password : ""}
 *  URLParam : { }
 *  extraParam : {db : {}, server : {}, replSet : {}, mongos: {}}
 * }
 *
 * REF: http://mongodb.github.io/node-mongodb-native/driver-articles/mongoclient.html#mongoclient-connect
 *      https://mongodb.github.io/node-mongodb-native/3.3/api/index.html
 *      https://mongodb.github.io/node-mongodb-native/3.3/api/Collection.html#distinct
 */
function MongoDriver(dbConfig) {
	let self = this;
	self.config = dbConfig;
	self.db = null;
	self.client = null;
	self.pending = false;
	self.ObjectId = (id) => { return new mongodb.ObjectId(id); };
	self.mongodb = mongodb;
	if (self.config) {
		cacheDBLib.init(self.config.registryLocation);
	}
}

/**
 * v 3.x verified
 *
 * Params: collectionName, docs (object | Array.<object>), [versioning,] [options,] callback
 * Deprecated: Use insertOne, insertMany or bulkWrite
 */
MongoDriver.prototype.insert = async function (collectionName, docs, versioning, options, cb) {
	let self = this;

	displayLog("***** insert is deprecated please use insertOne, insertMany or bulkWrite");
	if (Array.isArray(docs)) {
		return self.insertMany(collectionName, docs, options, versioning, cb);
	} else {
		return self.insertOne(collectionName, docs, options, versioning, cb);
	}
};
/**
 * v 3.x verified
 *
 * Params: collectionName, doc, options, [versioning,] cb
 */
MongoDriver.prototype.insertOne = async function (collectionName, doc, options, versioning, cb) {
	let self = this;

	if (!cb && typeof versioning === "function") {
		cb = versioning;
		versioning = false;
	}
	if (!cb && typeof options === "function") {
		cb = options;
		options = {};
	}

	if (!collectionName) {
		if (typeof cb === "function") {
			return cb(core.error.generate(191));
		}
		throw (core.error.generate(191));
	}

	if (typeof options !== "object") {
		options = {};
	}

	try {
		await connect(self);
		if (versioning) {
			doc.v = 1;
			doc.ts = new Date().getTime();
			let response = await self.db.collection(collectionName).insertOne(doc, options);
			if (response.acknowledged) {
				response = { "_id": response.insertedId };
				response = Object.assign(response, doc);
			}
			if (typeof cb === "function") {
				return cb(null, response);
			}
			return response;
		} else {
			let response = await self.db.collection(collectionName).insertOne(doc, options);
			if (response.acknowledged) {
				response = { "_id": response.insertedId };
				response = Object.assign(response, doc);
			}
			if (typeof cb === "function") {
				return cb(null, response);
			}
			return response;
		}
	} catch (error) {
		if (typeof cb === "function") {
			return cb(error);
		}
		throw (error);
	}
};
/**
 * v 3.x verified
 *
 * Params: collectionName, docs, options, [versioning,] cb
 */
MongoDriver.prototype.insertMany = async function (collectionName, docs, options, versioning, cb) {
	let self = this;

	if (!Array.isArray(docs)) {
		if (typeof cb === "function") {
			return cb(core.error.generate(197));
		}
		throw (core.error.generate(197));
	}
	if (!cb && typeof versioning === "function") {
		cb = versioning;
		versioning = false;
	}
	if (!cb && typeof options === "function") {
		cb = options;
		options = {};
	}

	if (!collectionName) {
		if (typeof cb === "function") {
			return cb(core.error.generate(191));
		}
		throw (core.error.generate(191));
	}

	if (typeof options !== "object") {
		options = {};
	}

	try {
		await connect(self);
		if (versioning) {
			docs.forEach(function (oneDoc) {
				oneDoc.v = 1;
				oneDoc.ts = new Date().getTime();
			});
			let response = await self.db.collection(collectionName).insertMany(docs, options);
			if (typeof cb === "function") {
				return cb(null, response);
			}
			return response;
		} else {
			let response = await self.db.collection(collectionName).insertMany(docs, options);
			if (typeof cb === "function") {
				return cb(null, response);
			}
			return response;
		}
	} catch (error) {
		if (typeof cb === "function") {
			return cb(error);
		}
		throw (error);
	}
};

/**
 * v 3.x verified
 *
 * Params: collectionName, doc, [versioning,] [options,] callback
 * Deprecated: use insertOne, insertMany, updateOne or updateMany
 */
MongoDriver.prototype.save = async function (collectionName, docs, versioning, options, cb) {
	let self = this;

	if (!cb && typeof versioning === "function") {
		cb = versioning;
		versioning = false;
	}
	if (!cb && typeof options === "function") {
		cb = options;
		options = {};
	}

	if (!collectionName) {
		if (typeof cb === "function") {
			return cb(core.error.generate(191));
		}
		throw (core.error.generate(191));
	}

	if (typeof options !== "object") {
		options = {};
	}

	displayLog("***** save is deprecated please use insertOne, insertMany, updateOne or updateMany");

	try {
		await connect(self);
		if (versioning && docs && docs._id) {
			let versionedDocument = await self.addVersionToRecords(collectionName, docs, null);
			docs.v = versionedDocument.v + 1;
			docs.ts = new Date().getTime();
			let response = await self.db.collection(collectionName).updateOne({ "_id": docs._id }, { $set: docs }, options);
			if (typeof cb === "function") {
				return cb(null, response);
			}
			return response;
		} else {
			let response = await self.db.collection(collectionName).updateOne({ "_id": docs._id }, { $set: docs }, options);
			if (typeof cb === "function") {
				return cb(null, response);
			}
			return response;
		}
	} catch (error) {
		if (typeof cb === "function") {
			return cb(error);
		}
		throw (error);
	}
};

/**
 * v 3.x verified
 *
 * Params: collectionName, criteria, record, [options,] [versioning,] cb
 * Deprecated: use updateOne, updateMany or bulkWrite
 */
MongoDriver.prototype.update = async function () {
	let self = this;

	let collectionName = arguments[0];
	let criteria = arguments[1];
	let record = arguments[2];
	let options = arguments[3];
	let versioning = arguments.length === 6 ? arguments[4] : arguments[3];
	let cb = arguments[arguments.length - 1];

	if (!collectionName) {
		if (typeof cb === "function") {
			return cb(core.error.generate(191));
		}
		throw (core.error.generate(191));
	}

	if (typeof versioning !== 'boolean') {
		versioning = false;
	}
	if (typeof options !== "object") {
		options = {};
	}

	displayLog("***** update is deprecated use updateOne, updateMany or bulkWrite");

	function handleResponse(response, cb) {
		if (response && response.modifiedCount) {
			if (typeof cb === "function") {
				return cb(null, response.modifiedCount);
			}
			return response.modifiedCount;
		} else {
			if (response && response.upsertedCount) {
				if (typeof cb === "function") {
					return cb(null, response.upsertedCount);
				}
				return response.upsertedCount;
			}
			if (typeof cb === "function") {
				return cb(null, 0);
			}
			return 0;
		}
	}

	try {
		await connect(self);
		if (options && options.multi) {
			if (versioning) {
				displayLog("Not supported: update with versioning does not work for multi document. do not set multi to true");
			}
			let response = await self.updateMany(collectionName, criteria, record, options);
			return handleResponse(response, cb);
		} else {
			if (versioning) {
				let originalRecord = await self.findOne(collectionName, criteria);
				if (!originalRecord && options.upsert) {
					record.$set.v = 1;
					record.$set.ts = new Date().getTime();

					let response = await self.db.collection(collectionName).updateOne(criteria, record, options);
					return handleResponse(response, cb);
				} else {
					await self.addVersionToRecords(collectionName, originalRecord);
					if (!record.$inc) {
						record.$inc = {};
					}
					record.$inc.v = 1;
					if (!record.$set) {
						record.$set = {};
					}
					record.$set.ts = new Date().getTime();
					let response = await self.db.collection(collectionName).updateOne(criteria, record, options);
					return handleResponse(response, cb);
				}
			} else {
				let response = await self.db.collection(collectionName).updateOne(criteria, record, options);
				return handleResponse(response, cb);
			}
		}
	} catch (error) {
		if (typeof cb === "function") {
			return cb(error);
		}
		throw (error);
	}
};
/**
 * v 3.x verified
 *
 * Params: collectionName, filter, updateOptions, options, [versioning,] cb
 */
MongoDriver.prototype.updateOne = async function (collectionName, filter, updateOptions, options, versioning, cb) {
	let self = this;

	if (!cb && typeof versioning === "function") {
		cb = versioning;
		versioning = false;
	}
	if (!cb && typeof options === "function") {
		cb = options;
		options = {};
	}

	if (!collectionName) {
		if (typeof cb === "function") {
			return cb(core.error.generate(191));
		}
		throw (core.error.generate(191));
	}

	if (typeof options !== "object") {
		options = {};
	}

	try {
		await connect(self);
		if (versioning) {
			let originalRecord = await self.findOne(collectionName, filter);
			if (!originalRecord && options.upsert) {
				updateOptions.$set.v = 1;
				updateOptions.$set.ts = new Date().getTime();
				let response = await self.db.collection(collectionName).updateOne(filter, updateOptions, options);
				let res = {
					"ok": response.acknowledged,
					"n": response.matchedCount || response.upsertedCount,
					"nModified": response.modifiedCount,
					"upsertedId": response.upsertedId,
					"upsertedCount": response.upsertedCount
				};
				if (typeof cb === "function") {
					return cb(null, res);
				}
				return res;
			} else {
				await self.addVersionToRecords(collectionName, originalRecord);
				if (!updateOptions.$inc) {
					updateOptions.$inc = {};
				}
				updateOptions.$inc.v = 1;
				if (!updateOptions.$set) {
					updateOptions.$set = {};
				}
				updateOptions.$set.ts = new Date().getTime();
				let response = await self.db.collection(collectionName).updateOne(filter, updateOptions, options);
				let res = {
					"ok": response.acknowledged,
					"n": response.matchedCount || response.upsertedCount,
					"nModified": response.modifiedCount,
					"upsertedId": response.upsertedId,
					"upsertedCount": response.upsertedCount
				};
				if (typeof cb === "function") {
					return cb(null, res);
				}
				return res;
			}
		} else {
			let response = await self.db.collection(collectionName).updateOne(filter, updateOptions, options);
			let res = {
				"ok": response.acknowledged,
				"n": response.matchedCount || response.upsertedCount,
				"nModified": response.modifiedCount,
				"upsertedId": response.upsertedId,
				"upsertedCount": response.upsertedCount
			};
			if (typeof cb === "function") {
				return cb(null, res);
			}
			return res;
		}
	} catch (error) {
		if (typeof cb === "function") {
			return cb(error);
		}
		throw (error);
	}
};
/**
 * v 3.x verified
 *
 * Params: collectionName, filter, updateOptions, options, cb
 */
MongoDriver.prototype.updateMany = async function (collectionName, filter, updateOptions, options, cb) {
	let self = this;

	if (!cb && typeof options === "function") {
		cb = options;
		options = {};
	}

	if (!collectionName) {
		if (typeof cb === "function") {
			return cb(core.error.generate(191));
		}
		throw (core.error.generate(191));
	}

	if (typeof options !== "object") {
		options = {};
	}

	try {
		await connect(self);
		let response = await self.db.collection(collectionName).updateMany(filter, updateOptions, options);
		if (response) {
			response.nModified = response.modifiedCount;
		}
		if (typeof cb === "function") {
			return cb(null, response);
		}
		return response;
	} catch (error) {
		if (typeof cb === "function") {
			return cb(error);
		}
		throw (error);
	}
};

/**
 * Inserts a new version of the record in collectionName_versioning
 */
MongoDriver.prototype.addVersionToRecords = async function (collection, oneRecord, cb) {
	let self = this;
	if (!oneRecord) {
		if (typeof cb === "function") {
			return cb(core.error.generate(192));
		}
		throw (core.error.generate(192));
	}

	try {
		let originalRecord = await self.findOne(collection, { '_id': oneRecord._id });

		if (!originalRecord) {
			if (typeof cb === "function") {
				return cb(core.error.generate(193));
			}
			throw (core.error.generate(193));
		}

		originalRecord.v = originalRecord.v || 0;
		originalRecord.ts = new Date().getTime();
		originalRecord.refId = originalRecord._id;
		delete originalRecord._id;
		return self.insertOne(collection + '_versioning', originalRecord, {}, false, cb);
	} catch (error) {
		if (typeof cb === "function") {
			return cb(error);
		}
		throw (error);
	}
};

/**
 * Removes all the version of a record
 */
MongoDriver.prototype.clearVersions = async function (collection, recordId, cb) {
	let self = this;

	if (!collection) {
		if (typeof cb === "function") {
			return cb(core.error.generate(191));
		}
		throw (core.error.generate(191));
	}

	return self.deleteMany(collection + '_versioning', { 'refId': recordId }, null, cb);
};

/**
 * Returns all the version of a record, sorted by v value descending
 */
MongoDriver.prototype.getVersions = async function (collection, oneRecordId, cb) {
	let self = this;

	if (!collection) {
		if (typeof cb === "function") {
			return cb(core.error.generate(191));
		}
		throw (core.error.generate(191));
	}

	return self.find(collection + '_versioning', { 'refId': oneRecordId }, cb);
};

/**
 * v 3.x verified
 *
 * Params: collectionName, fieldOrSpec, options, callback
 */
MongoDriver.prototype.createIndex = async function (collectionName, keys, options, cb) {
	let self = this;

	if (!cb && typeof options === "function") {
		cb = options;
		options = {};
	}

	if (!collectionName) {
		if (typeof cb === "function") {
			return cb(core.error.generate(191));
		}
		throw (core.error.generate(191));
	}

	if (typeof options !== "object") {
		options = {};
	}

	try {
		await connect(self);
		let response = await self.db.createIndex(collectionName, keys, options);
		if (typeof cb === "function") {
			return cb(null, response);
		}
		return response;
	} catch (error) {
		if (typeof cb === "function") {
			return cb(error);
		}
		throw (error);
	}
};
MongoDriver.prototype.ensureIndex = async function (collectionName, keys, options, cb) {
	let self = this;

	displayLog("***** ensureIndex is deprecated use createIndexes instead");
	return self.createIndex(collectionName, keys, options, cb);
};

/**
 * v 3.x verified
 *
 * Params: collectionName, [options,] cb
 */
MongoDriver.prototype.getCollection = async function (collectionName, options, cb) {
	let self = this;

	if (!cb && typeof options === "function") {
		cb = options;
		options = {};
	}

	if (!collectionName) {
		if (typeof cb === "function") {
			return cb(core.error.generate(191));
		}
		throw (core.error.generate(191));
	}

	if (typeof options !== "object") {
		options = {};
	}

	try {
		await connect(self);
		const response = self.db.collection(collectionName, options);
		if (typeof cb === "function") {
			return cb(null, response);
		}
		return response;
	} catch (error) {
		if (typeof cb === "function") {
			return cb(error);
		}
		throw (error);
	}
};

/**
 * v 3.x verified
 *
 * Params: collectionName, query, options, cb
 * returns the cursor as array
 */
MongoDriver.prototype.find = MongoDriver.prototype.findFields = async function () {
	let self = this;

	let args = Array.prototype.slice.call(arguments);
	let collectionName = args.shift();
	let cb = args[args.length - 1];

	let filter = args[0] || {};
	let options = args[1] || {};

	if (typeof options !== "object") {
		options = {};
	}
	if (typeof filter !== "object") {
		filter = {};
	}

	if (!collectionName) {
		if (typeof cb === "function") {
			return cb(core.error.generate(191));
		}
		throw (core.error.generate(191));
	}

	try {
		await connect(self);
		const cursor = self.db.collection(collectionName).find(filter, options);
		let response = await cursor.toArray();
		if (typeof cb === "function") {
			return cb(null, response);
		}
		return response;
	} catch (error) {
		if (typeof cb === "function") {
			return cb(error);
		}
		throw (error);
	}
};
/**
 * v 3.x verified
 *
 * Params: collectionName, query, options, cb
 * exactly like find but it returns the cursor as stream
 */
MongoDriver.prototype.findStream = MongoDriver.prototype.findFieldsStream = async function () {
	let self = this;

	let args = Array.prototype.slice.call(arguments);
	let collectionName = args.shift();
	let cb = args[args.length - 1];

	let filter = args[0] || {};
	let options = args[1] || {};

	if (typeof options !== "object") {
		options = {};
	}
	if (typeof filter !== "object") {
		filter = {};
	}

	if (!collectionName) {
		if (typeof cb === "function") {
			return cb(core.error.generate(191));
		}
		throw (core.error.generate(191));
	}

	try {
		await connect(self);
		let batchSize = 0;
		if (self.config && self.config.streaming) {
			if (self.config.streaming[collectionName] && self.config.streaming[collectionName].batchSize) {
				batchSize = self.config.streaming[collectionName].batchSize;
			} else if (self.config.streaming.batchSize) {
				batchSize = self.config.streaming.batchSize;
			}
		}
		if (batchSize) {
			let response = self.db.collection(collectionName).find(filter, options).batchSize(batchSize).stream();
			if (typeof cb === "function") {
				return cb(null, response);
			}
			return response;
		} else {
			let response = self.db.collection(collectionName).find(filter, options).stream();
			if (typeof cb === "function") {
				return cb(null, response);
			}
			return response;
		}
	} catch (error) {
		if (typeof cb === "function") {
			return cb(error);
		}
		throw (error);
	}
};

/**
 * v 3.x verified
 *
 * Params: collectionName, filter, update, options, callback
 */
MongoDriver.prototype.findOneAndUpdate = async function () {
	let self = this;

	let args = Array.prototype.slice.call(arguments);
	let collectionName = args.shift();
	let cb = args[args.length - 1];

	let filter = args[0] || {};
	let updateFilter = args[1] || {};
	let options = args[2] || {};

	if (typeof options !== "object") {
		options = {};
	}
	if (typeof updateFilter !== "object") {
		updateFilter = {};
	}
	if (typeof filter !== "object") {
		filter = {};
	}

	if (!collectionName) {
		if (typeof cb === "function") {
			return cb(core.error.generate(191));
		}
		throw (core.error.generate(191));
	}

	try {
		await connect(self);
		let response = await self.db.collection(collectionName).findOneAndUpdate(filter, updateFilter, options);
		if (typeof cb === "function") {
			return cb(null, response);
		}
		return response;
	} catch (error) {
		if (typeof cb === "function") {
			return cb(error);
		}
		throw (error);
	}
};

/**
 * v 3.x verified
 *
 * Params: collectionName, filter, options, callback
 */
MongoDriver.prototype.findOneAndDelete = async function () {
	let self = this;

	let args = Array.prototype.slice.call(arguments);
	let collectionName = args.shift();
	let cb = args[args.length - 1];

	let filter = args[0] || {};
	let options = args[1] || {};

	if (typeof options !== "object") {
		options = {};
	}
	if (typeof filter !== "object") {
		filter = {};
	}

	if (!collectionName) {
		if (typeof cb === "function") {
			return cb(core.error.generate(191));
		}
		throw (core.error.generate(191));
	}

	try {
		await connect(self);
		let response = await self.db.collection(collectionName).findOneAndDelete(filter, options);
		if (typeof cb === "function") {
			return cb(null, response);
		}
		return response;
	} catch (error) {
		if (typeof cb === "function") {
			return cb(error);
		}
		throw (error);
	}
};

/**
 * v 3.x verified
 *
 * Params: collectionName, query, options, cb
 * extra is being ignore since the new mongo driver does nto support this
 */
MongoDriver.prototype.findOne = MongoDriver.prototype.findOneFields = async function () {
	let self = this;

	let args = Array.prototype.slice.call(arguments);
	let collectionName = args.shift();
	let cb = args[args.length - 1];

	let filter = args[0] || {};
	let options = args[1] || {};

	if (typeof options !== "object") {
		options = {};
	}
	if (typeof filter !== "object") {
		filter = {};
	}

	if (!collectionName) {
		if (typeof cb === "function") {
			return cb(core.error.generate(191));
		}
		throw (core.error.generate(191));
	}

	try {
		await connect(self);
		let response = await self.db.collection(collectionName).findOne(filter, options);
		if (typeof cb === "function") {
			return cb(null, response);
		}
		return response;
	} catch (error) {
		if (typeof cb === "function") {
			return cb(error);
		}
		throw (error);
	}
};

/**
 * v 3.x verified
 *
 */
MongoDriver.prototype.dropCollection = async function (collectionName, options, cb) {
	let self = this;

	if (!cb && typeof options === "function") {
		cb = options;
		options = {};
	}

	if (!collectionName) {
		if (typeof cb === "function") {
			return cb(core.error.generate(191));
		}
		throw (core.error.generate(191));
	}

	if (typeof options !== "object") {
		options = {};
	}

	try {
		await connect(self);
		let response = await self.db.dropCollection(collectionName, options);
		if (typeof cb === "function") {
			return cb(null, response);
		}
		return response;
	} catch (error) {
		if (typeof cb === "function") {
			return cb(error);
		}
		throw (error);
	}
};

/**
 * v 3.x verified
 *
 */
MongoDriver.prototype.dropDatabase = async function (options, cb) {
	let self = this;

	if (!cb && typeof options === "function") {
		cb = options;
		options = {};
	}
	if (typeof options !== "object") {
		options = {};
	}

	try {
		await connect(self);
		let response = await self.db.dropDatabase(options);
		if (typeof cb === "function") {
			return cb(null, response);
		}
		return response;
	} catch (error) {
		if (typeof cb === "function") {
			return cb(error);
		}
		throw (error);
	}
};

/**
 * v 3.x verified
 *
 * Params: collectionName, criteria, [options,] cb
 * Deprecated: use countDocuments or estimatedDocumentCount
 */
MongoDriver.prototype.count = async function (collectionName, criteria, options, cb) {
	let self = this;

	displayLog("***** count is deprecated please use countDocuments or estimatedDocumentCount");

	return self.countDocuments(collectionName, criteria, options, cb);
};
MongoDriver.prototype.countDocuments = async function (collectionName, criteria, options, cb) {
	let self = this;

	if (!cb && typeof options === "function") {
		cb = options;
		options = {};
	}

	if (!collectionName) {
		if (typeof cb === "function") {
			return cb(core.error.generate(191));
		}
		throw (core.error.generate(191));
	}

	if (typeof options !== "object") {
		options = {};
	}

	try {
		await connect(self);
		let response = await self.db.collection(collectionName).countDocuments(criteria, options);
		if (typeof cb === "function") {
			return cb(null, response);
		}
		return response;
	} catch (error) {
		if (typeof cb === "function") {
			return cb(error);
		}
		throw (error);
	}
};

/**
 * v 3.x verified
 *
 * Params: collectionName, key, query, options, cb
 */
MongoDriver.prototype.distinct = async function () {
	let self = this;

	let args = Array.prototype.slice.call(arguments);
	let collectionName = args.shift();
	let cb = args[args.length - 1];

	let key = args[0];
	let filter = args[1] || {};
	let options = args[2] || {};

	if (typeof options !== "object") {
		options = {};
	}
	if (typeof filter !== "object") {
		filter = {};
	}

	if (!collectionName) {
		if (typeof cb === "function") {
			return cb(core.error.generate(191));
		}
		throw (core.error.generate(191));
	}

	try {
		await connect(self);
		let response = await self.db.collection(collectionName).distinct(key, filter, options);
		if (typeof cb === "function") {
			return cb(null, response);
		}
		return response;
	} catch (error) {
		if (typeof cb === "function") {
			return cb(error);
		}
		throw (error);
	}
};

/**
 * v 3.x verified
 *
 * Params: collectionName, key, query, options, cb
 */
MongoDriver.prototype.distinctStream = async function (collectionName, fieldName, criteria, options, cb) {
	let self = this;

	if (!cb && typeof options === "function") {
		cb = options;
		options = {};
	}

	if (!collectionName) {
		if (typeof cb === "function") {
			return cb(core.error.generate(191));
		}
		throw (core.error.generate(191));
	}

	if (typeof options !== "object") {
		options = {};
	}

	try {
		await connect(self);
		let pipeline = [
			{
				$group: {
					"_id": "$" + fieldName
				}
			}
		];

		if (criteria) {
			pipeline.unshift({ $match: criteria });
		}

		if (options) {
			for (let i in options) {
				if (Object.hasOwnProperty.call(options, i)) {
					let oneOption = {};
					oneOption[i] = options[i];
					pipeline.push(oneOption);
				}
			}
		}
		const cursor = self.db.collection(collectionName).aggregate(pipeline, {});

		let batchSize = 0;
		if (self.config && self.config.streaming) {
			if (self.config.streaming[collectionName] && self.config.streaming[collectionName].batchSize) {
				batchSize = self.config.streaming[collectionName].batchSize;
			} else if (self.config.streaming.batchSize) {
				batchSize = self.config.streaming.batchSize;
			}
		}
		if (batchSize) {
			let response = cursor.batchSize(batchSize).stream();
			if (typeof cb === "function") {
				return cb(null, response);
			}
			return response;
		} else {
			let response = cursor.stream();
			if (typeof cb === "function") {
				return cb(null, response);
			}
			return response;
		}
	} catch (error) {
		if (typeof cb === "function") {
			return cb(error);
		}
		throw (error);
	}
};

/**
 * v 3.x verified
 *
 * Params: collectionName, pipeline, options, cb
 */
MongoDriver.prototype.aggregate = async function (collectionName, pipeline, options, cb) {
	let self = this;

	if (!cb && typeof options === "function") {
		cb = options;
		options = {};
	}

	if (!collectionName) {
		if (typeof cb === "function") {
			return cb(core.error.generate(191));
		}
		throw (core.error.generate(191));
	}

	if (typeof options !== "object") {
		options = {};
	}

	try {
		await connect(self);
		let response = self.db.collection(collectionName).aggregate(pipeline, options);
		if (typeof cb === "function") {
			return cb(null, response);
		}
		return response;
	} catch (error) {
		if (typeof cb === "function") {
			return cb(error);
		}
		throw (error);
	}
};
/**
 * v 3.x verified
 *
 * Params: collectionName, pipeline, options, cb
 * exactly like aggregate but it returns the cursor as stream
 */
MongoDriver.prototype.aggregateStream = async function (collectionName, pipeline, options, cb) {
	let self = this;

	if (!cb && typeof options === "function") {
		cb = options;
		options = {};
	}

	if (!collectionName) {
		if (typeof cb === "function") {
			return cb(core.error.generate(191));
		}
		throw (core.error.generate(191));
	}

	if (typeof options !== "object") {
		options = {};
	}

	try {
		await connect(self);
		let batchSize = 0;
		if (self.config && self.config.streaming) {
			if (self.config.streaming[collectionName] && self.config.streaming[collectionName].batchSize) {
				batchSize = self.config.streaming[collectionName].batchSize;
			} else if (self.config.streaming.batchSize) {
				batchSize = self.config.streaming.batchSize;
			}
		}
		const cursor = self.db.collection(collectionName).aggregate(pipeline, options);
		if (batchSize) {
			if (typeof cb === "function") {
				return cb(null, cursor.batchSize(batchSize).stream());
			}
			return cursor.batchSize(batchSize).stream();
		} else {
			if (typeof cb === "function") {
				return cb(null, cursor.stream());
			}
			return cursor.stream();
		}
	} catch (error) {
		if (typeof cb === "function") {
			return cb(error);
		}
		throw (error);
	}
};

/**
 * v 3.x verified
 *
 * Params: collectionName, criteria, [options,] cb
 * Deprecated: use deleteOne, deleteMany or bulkWrite
 */
MongoDriver.prototype.remove = async function (collectionName, criteria, options, cb) {
	let self = this;

	displayLog("***** remove is deprecated please use deleteOne, deleteMany or bulkWrite");

	if (options && options.single) {
		return self.deleteOne(collectionName, criteria, options, cb);
	} else {
		return self.deleteMany(collectionName, criteria, options, cb);
	}
};
MongoDriver.prototype.deleteOne = async function (collectionName, criteria, options, cb) {
	let self = this;

	if (!cb && typeof criteria === "function") {
		cb = criteria;
		criteria = {};
	}
	if (!cb && typeof options === "function") {
		cb = options;
		options = {};
	}

	if (!collectionName) {
		if (typeof cb === "function") {
			return cb(core.error.generate(191));
		}
		throw (core.error.generate(191));
	}

	if (typeof criteria !== "object") {
		criteria = {};
	}
	if (typeof options !== "object") {
		options = {};
	}

	try {
		await connect(self);
		let response = await self.db.collection(collectionName).deleteOne(criteria, options);
		if (response) {
			response.result = {
				"ok": response.acknowledged,
				"n": response.deletedCount,
				"deletedCount": response.deletedCount
			};
		}
		if (typeof cb === "function") {
			return cb(null, response);
		}
		return response;
	} catch (error) {
		if (typeof cb === "function") {
			return cb(error);
		}
		throw (error);
	}
};
MongoDriver.prototype.deleteMany = async function (collectionName, criteria, options, cb) {
	let self = this;

	if (!cb && typeof criteria === "function") {
		cb = criteria;
		criteria = {};
	}
	if (!cb && typeof options === "function") {
		cb = options;
		options = {};
	}

	if (!collectionName) {
		if (typeof cb === "function") {
			return cb(core.error.generate(191));
		}
		throw (core.error.generate(191));
	}

	if (typeof criteria !== "object") {
		criteria = {};
	}
	if (typeof options !== "object") {
		options = {};
	}

	try {
		await connect(self);
		let response = await self.db.collection(collectionName).deleteMany(criteria, options);
		if (response) {
			response.result = {
				"ok": response.acknowledged,
				"n": response.deletedCount,
				"deletedCount": response.deletedCount
			};
		}
		if (typeof cb === "function") {
			return cb(null, response);
		}
		return response;

	} catch (error) {
		if (typeof cb === "function") {
			return cb(error);
		}
		throw (error);
	}
};


/**
 * Closes Mongo connection
 */
MongoDriver.prototype.closeDb = async function () {
	let self = this;
	if (self.client) {
		if (!process.env.SOAJS_MONGO_CON_KEEPALIVE) {
			try {
				displayLog("----- Closing client");
				await self.client.close();
				await self.flushDb();
			} catch (e) {
				displayLog(e.message);
			}
		}
	}
};
MongoDriver.prototype.flushDb = async function () {
	let self = this;
	self.client = null;
	self.db = null;
	if (self.config) {
		cacheDBLib.flush(self.config.registryLocation);
	}
};

// this is to expose mongo db and replace getMongoSkinDB.
// we can move to mongo native client driver
// to get the DB and trigger any method directly
MongoDriver.prototype.getMongoDB = async function (cb) {
	let self = this;
	try {
		await connect(self);
		if (typeof cb === "function") {
			return cb(null, self.db);
		}
		return self.db;
	} catch (error) {
		if (typeof cb === "function") {
			return cb(error);
		}
		throw (error);
	}
};
// we can move to mongo native client driver
// to get the client and trigger any method directly
MongoDriver.prototype.getClient = async function (cb) {
	let self = this;
	try {
		await connect(self);
		if (typeof cb === "function") {
			return cb(null, self.client);
		}
		return self.client;
	} catch (error) {
		if (typeof cb === "function") {
			return cb(error);
		}
		throw (error);
	}
};

/**
 * Expose Mongo connect
 */
MongoDriver.prototype.connect = async function () {
	let self = this;
	try {
		await connect(self);
		return self.db;
	} catch (error) {
		throw (error);
	}
};

/**
 * Ensure a connection to mongo without any race condition problem
 *
 */
async function connect(obj) {
	let configCloneHash = null;
	let timeLoaded = null;
	if (!obj.config) {
		throw (core.error.generate(195));
	}
	if (obj.config.registryLocation && obj.config.registryLocation.env && ((obj.config.registryLocation.l1 && obj.config.registryLocation.l2) || obj.config.registryLocation.cluster)) {
		let cache = cacheDBLib.getCache(obj.config.registryLocation);
		if (cache && (cache.db || cache.client)) {
			if (!obj.db && cache.client) {
				obj.client = cache.client;
				let prefix = obj.config.prefix;
				let dbName = obj.config.name;
				if (prefix && prefix !== "") {
					dbName = prefix + dbName;
				}
				obj.db = obj.client.db(dbName);
			}
			if (!obj.db && cache.db) {
				obj.db = cache.db;
			}
			if (cache.configCloneHash) {
				configCloneHash = cache.configCloneHash;
			}
			timeLoaded = cache.timeLoaded;
		}
	}
	if (!obj.config.registryLocation) {
		timeLoaded = new Date().getTime();
		obj.config.registryLocation = { "timeLoaded": timeLoaded };
	}

	if (obj.config.credentials) {
		if (Object.hasOwnProperty.call(obj.config.credentials, 'username') && obj.config.credentials.username === '') {
			delete obj.config.credentials;
		}
	}
	if (obj.db) {
		if (obj.config.registryLocation && obj.config.registryLocation.timeLoaded === timeLoaded) {
			return;
		}
		let currentConfObj = {
			"servers": obj.config.servers,
			"credentials": obj.config.credentials || null,
		};
		currentConfObj = objectHash(currentConfObj);
		if (currentConfObj === configCloneHash) {
			cacheDBLib.setTimeLoaded(obj.config.registryLocation, obj.config.registryLocation.timeLoaded);
			return;
		}
	}

	let url = constructMongoLink(obj.config);
	console.log(url)
	if (!url) {
		throw (core.error.generate(190));
	}
	if (cachePending) {
		return new Promise(function (resolve, reject) {
			connectQueue.push({ resolve, reject });
		})
			.then(() => {
				if (obj.db) {
					return;
				} else {
					return connect(obj);
				}
			})
			.catch(error => {
				throw error;
			});
	}

	cachePending = true;

	let client = null;
	if (obj.client) {
		let currentConfObj = {
			"servers": obj.config.servers,
			"credentials": obj.config.credentials || null,
		};
		currentConfObj = objectHash(currentConfObj);
		if (currentConfObj === configCloneHash) {
			cacheDBLib.setTimeLoaded(obj.config.registryLocation, obj.config.registryLocation.timeLoaded);
			client = obj.client;
		}
	}

	if (!client) {
		try {
			if (obj.config.URLParam) {
				delete obj.config.URLParam.useUnifiedTopology;
			}
			client = await MongoClient.connect(url, obj.config.URLParam);
		} catch (error) {
			cachePending = false;
			processQueue(error);
			throw (error);
		}
		if (!obj.config.name || obj.config.name === '') {
			cachePending = false;
			let error = new Error("You must specify a db name.");
			processQueue(error);
			throw (error);
		}
		if (obj.client) {
			try {
				await obj.client.close();
			} catch (e) {
				displayLog(e.message);
			}
		}
		obj.client = client;
	}

	let prefix = obj.config.prefix;
	let dbName = obj.config.name;
	if (prefix && prefix !== "") {
		dbName = prefix + dbName;
	}
	obj.db = obj.client.db(dbName);

	cacheDBLib.setCache(obj);
	cachePending = false;
	processQueue(null);

	return;
}

function displayLog(msg, extra) {
	let logger = core.getLog();
	if (logger) {
		logger.warn(msg, extra || "");
	} else {
		console.log(msg, extra || "");
	}
}

/**
 *constructMongoLink: is a function that takes the below param and return the URL need to by mongodb.connect
 *
 */
function constructMongoLink(params) {
	let servers = params.servers;
	let credentials = params.credentials;

	if (Array.isArray(servers)) {
		let url = params.protocol || "mongodb://";
		if (credentials && Object.hasOwnProperty.call(credentials, 'username') && credentials.hasOwnProperty.call(credentials, 'password')) {
			if (credentials.username !== '' && credentials.password !== '') {
				url = url.concat(credentials.username, ':', credentials.password, '@');
			}
		}

		servers.forEach(function (element, index, array) {
			if (element.host && element.port) {
				url = url.concat(element.host, ':', element.port, (index === array.length - 1 ? '' : ','));
			} else {
				url = url.concat(element.host, (index === array.length - 1 ? '' : ','));
			}
		});

		url = constructMongoOptions(url, params);

		return url;
	}
	return null;

	/**
	 *constructMongoOptions: is a function that construct the mongo options for connection
	 *
	 * @param dbName
	 * @param prefix
	 * @param servers
	 * @param params
	 * @param credentials
	 * @returns {*}
	 */
	function constructMongoOptions(url, config) {
		let options = config.URLParam;
		if (config.extraParam && Object.keys(config.extraParam).length > 0) {
			flatternObject(options, config.extraParam);
		}

		delete options.maxPoolSize;
		delete options.wtimeoutMS;
		delete options.slaveOk;
		delete options.auto_reconnect;

		config.URLParam = options;

		delete config.extraParam;
		return url;

		//flattern extraParams to become one object but priority is for URLParam
		function flatternObject(options, params) {
			for (let i in params) {
				if (Object.hasOwnProperty.call(params, i)) {
					if (!Object.hasOwnProperty.call(options, i)) {
						if (typeof (params[i]) === 'object') {
							flatternObject(options, params[i]);
						} else {
							options[i] = params[i];
						}
					}
				}
			}
		}
	}
}

module.exports = MongoDriver;
