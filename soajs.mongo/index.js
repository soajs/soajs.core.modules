'use strict';
const core = require("../soajs.core");
const mongodb = require('mongodb');
const merge = require('merge');
const objectHash = require("object-hash");

let cacheDB = {};


let cacheDBLib = {
	"init": function (registryLocation) {
		if (registryLocation && registryLocation.env && registryLocation.l1 && registryLocation.l2) {
			if (!cacheDB) {
				cacheDB = {};
			}
			if (!cacheDB[registryLocation.env]) {
				cacheDB[registryLocation.env] = {};
			}
			if (!cacheDB[registryLocation.env][registryLocation.l1]) {
				cacheDB[registryLocation.env][registryLocation.l1] = {};
			}
			if (!cacheDB[registryLocation.env][registryLocation.l1][registryLocation.l2]) {
				cacheDB[registryLocation.env][registryLocation.l1][registryLocation.l2] = {};
			}
		}
	},
	"flush": function (registryLocation) {
		if (registryLocation && registryLocation.env && registryLocation.l1 && registryLocation.l2) {
			cacheDB[registryLocation.env][registryLocation.l1][registryLocation.l2].db = null;
		}
	},
	"getCache": function (registryLocation) {
		if (registryLocation && registryLocation.env && registryLocation.l1 && registryLocation.l2) {
			if (cacheDB[registryLocation.env][registryLocation.l1][registryLocation.l2]) {
				return cacheDB[registryLocation.env][registryLocation.l1][registryLocation.l2];
			}
		}
		return null;
	},
	"setTimeConnected": function (registryLocation, timeConnected) {
		if (registryLocation && registryLocation.env && registryLocation.l1 && registryLocation.l2) {
			cacheDB[registryLocation.env][registryLocation.l1][registryLocation.l2].timeConnected = timeConnected;
		}
	},
	"setDB": function (registryLocation, db) {
		if (registryLocation && registryLocation.env && registryLocation.l1 && registryLocation.l2) {
			cacheDB[registryLocation.env][registryLocation.l1][registryLocation.l2].db = db;
		}
	},
	"setHash": function (registryLocation, config) {
		if (registryLocation && registryLocation.env && registryLocation.l1 && registryLocation.l2) {
			cacheDB[registryLocation.env][registryLocation.l1][registryLocation.l2].configCloneHash = merge(true, config);
			delete  cacheDB[registryLocation.env][registryLocation.l1][registryLocation.l2].configCloneHash.timeConnected;
			cacheDB[registryLocation.env][registryLocation.l1][registryLocation.l2].configCloneHash = objectHash(cacheDB[registryLocation.env][registryLocation.l1][registryLocation.l2].configCloneHash);
		}
	},
	"setCache": function (obj) {
		cacheDBLib.setDB(obj.config.registryLocation, obj.db);
		cacheDBLib.setHash(obj.config.registryLocation, obj.config);
		cacheDBLib.setTimeConnected(obj.config.registryLocation, obj.config.timeConnected);
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
	self.ObjectId = mongodb.ObjectID;
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
MongoDriver.prototype.insert = function (collectionName, docs, versioning, options, cb) {
	let self = this;
	
	if (!cb && typeof versioning === "function") {
		cb = versioning;
		versioning = false;
	}
	if (!cb && typeof options === "function") {
		cb = options;
		options = null;
	}
	
	if (!collectionName || !docs) {
		return cb(core.error.generate(191));
	}
	
	displayLog("***** insert is deprecated please use insertOne, insertMany or bulkWrite");
	if (Array.isArray(docs)) {
		self.insertMany(collectionName, docs, options, versioning, cb);
	} else {
		self.insertOne(collectionName, docs, options, versioning, cb);
	}
};
/**
 * v 3.x verified
 *
 * Params: collectionName, doc, options, [versioning,] cb
 */
MongoDriver.prototype.insertOne = function (collectionName, doc, options, versioning, cb) {
	let self = this;
	
	if (!cb && typeof versioning === "function") {
		cb = versioning;
		versioning = false;
	}
	
	if (!collectionName) {
		return cb(core.error.generate(191));
	}
	
	connect(self, function (err) {
		if (err) {
			return cb(err);
		}
		if (versioning) {
			doc.v = 1;
			doc.ts = new Date().getTime();
			self.db.collection(collectionName).insertOne(doc, options, function (error, response) {
				if (error) {
					return cb(error);
				}
				return cb(null, response.ops);
			});
		} else {
			self.db.collection(collectionName).insertOne(doc, options, function (error, response) {
				if (error) {
					return cb(error);
				}
				return cb(null, response.ops);
			});
		}
	});
};
/**
 * v 3.x verified
 *
 * Params: collectionName, docs, options, [versioning,] cb
 */
MongoDriver.prototype.insertMany = function (collectionName, docs, options, versioning, cb) {
	let self = this;
	
	if (!Array.isArray(docs)) {
		return cb(core.error.generate(197));
	}
	if (!cb && typeof versioning === "function") {
		cb = versioning;
		versioning = false;
	}
	
	if (!collectionName) {
		return cb(core.error.generate(191));
	}
	
	connect(self, function (err) {
		if (err) {
			return cb(err);
		}
		if (versioning) {
			docs.forEach(function (oneDoc) {
				oneDoc.v = 1;
				oneDoc.ts = new Date().getTime();
			});
			self.db.collection(collectionName).insertMany(docs, options, function (error, response) {
				if (error) {
					return cb(error);
				}
				return cb(null, response.ops);
			});
		} else {
			self.db.collection(collectionName).insertMany(docs, options, function (error, response) {
				if (error) {
					return cb(error);
				}
				return cb(null, response.ops);
			});
		}
	});
};

/**
 * v 3.x verified
 *
 * Params: collectionName, doc, [versioning,] [options,] callback
 * Deprecated: use insertOne, insertMany, updateOne or updateMany
 */
MongoDriver.prototype.save = function (collectionName, docs, versioning, options, cb) {
	let self = this;
	
	if (!cb && typeof versioning === "function") {
		cb = versioning;
		versioning = false;
	}
	if (!cb && typeof options === "function") {
		cb = options;
		options = null;
	}
	
	if (!collectionName || !docs) {
		return cb(core.error.generate(191));
	}
	
	displayLog("***** save is deprecated please use insertOne, insertMany, updateOne or updateMany");
	connect(self, function (err) {
		if (err) {
			return cb(err);
		}
		if (versioning && docs && docs._id) {
			MongoDriver.addVersionToRecords.call(self, collectionName, docs, function (error, versionedDocument) {
				if (error) {
					return cb(error);
				}
				
				docs.v = versionedDocument[0].v + 1;
				docs.ts = new Date().getTime();
				self.db.collection(collectionName).save(docs, cb);
			});
		} else {
			self.db.collection(collectionName).save(docs, cb);
		}
	});
};

/**
 * v 3.x verified
 *
 * Params: collectionName, criteria, record, [options,] [versioning,] cb
 * Deprecated: use updateOne, updateMany or bulkWrite
 */
MongoDriver.prototype.update = function () {
	let self = this;
	
	let collectionName = arguments[0];
	let criteria = arguments[1];
	let record = arguments[2];
	let options = arguments[3];
	let versioning = arguments.length === 6 ? arguments[4] : arguments[3];
	let cb = arguments[arguments.length - 1];
	
	if (typeof options !== "object") {
		options = null;
	}
	if (typeof versioning !== 'boolean') {
		versioning = false;
	}
	
	if (!collectionName) {
		return cb(core.error.generate(191));
	}
	
	displayLog("***** update is deprecated use updateOne, updateMany or bulkWrite");
	
	function handleResponse(response, cb) {
		let result = null;
		if (response && response.result){
			result = response.result;
		} else if (response) {
			result = response;
		}
		if (result && result.nModified) {
			return cb(null, result.nModified);
		} else {
			if (result && result.ok && result.upserted && Array.isArray(result.upserted)) {
				return cb(null, result.upserted.length);
			}
			return cb(null, 0);
		}
	}
	
	if (options && options.multi) {
		if (versioning) {
			displayLog("update with versioning does not work for multi document. do not set multi to true");
		}
		self.updateMany(collectionName, criteria, record, options, (error, response) => {
			if (error) {
				return cb(error);
			}
			return handleResponse(response, cb);
		});
	} else {
		connect(self, function (err) {
			if (err) {
				return cb(err);
			}
			if (versioning) {
				self.findOne(collectionName, criteria, function (error, originalRecord) {
					if (error) {
						return cb(error);
					}
					if (!originalRecord && options.upsert) {
						record.$set.v = 1;
						record.$set.ts = new Date().getTime();
						self.db.collection(collectionName).update(criteria, record, options, function (error, response) {
							if (error) {
								return cb(error);
							}
							return handleResponse(response, cb);
						});
					} else {
						MongoDriver.addVersionToRecords.call(self, collectionName, originalRecord, function (error) {
							if (error) {
								return cb(error);
							}
							if (!record.$inc) {
								record.$inc = {};
							}
							record.$inc.v = 1;
							
							if (!record.$set) {
								record.$set = {};
							}
							record.$set.ts = new Date().getTime();
							
							self.db.collection(collectionName).update(criteria, record, options, function (error, response) {
								if (error) {
									return cb(error);
								}
								return handleResponse(response, cb);
							});
						});
					}
				});
			} else {
				self.db.collection(collectionName).update(criteria, record, options, function (error, response) {
					if (error) {
						return cb(error);
					}
					return handleResponse(response, cb);
				});
			}
		});
	}
};
/**
 * v 3.x verified
 *
 * Params: collectionName, filter, updateOptions, options, [versioning,] cb
 */
MongoDriver.prototype.updateOne = function (collectionName, filter, updateOptions, options, versioning, cb) {
	let self = this;
	
	if (!cb && typeof versioning === "function") {
		cb = versioning;
		versioning = false;
	}
	
	if (!collectionName) {
		return cb(core.error.generate(191));
	}
	
	connect(self, function (err) {
		if (err) {
			return cb(err);
		}
		if (versioning) {
			self.findOne(collectionName, filter, function (error, originalRecord) {
				if (error) {
					return cb(error);
				}
				if (!originalRecord && options.upsert) {
					updateOptions.$set.v = 1;
					updateOptions.$set.ts = new Date().getTime();
					self.db.collection(collectionName).updateOne(filter, updateOptions, options, function (error, response) {
						if (error) {
							return cb(error);
						}
						return cb(null, response.result);
					});
				} else {
					MongoDriver.addVersionToRecords.call(self, collectionName, originalRecord, function (error) {
						if (error) {
							return cb(error);
						}
						if (!updateOptions.$inc) {
							updateOptions.$inc = {};
						}
						updateOptions.$inc.v = 1;
						
						if (!updateOptions.$set) {
							updateOptions.$set = {};
						}
						updateOptions.$set.ts = new Date().getTime();
						
						self.db.collection(collectionName).updateOne(filter, updateOptions, options, function (error, response) {
							if (error) {
								return cb(error);
							}
							return cb(null, response.result);
						});
					});
				}
			});
		} else {
			self.db.collection(collectionName).updateOne(filter, updateOptions, options, function (error, response) {
				if (error) {
					return cb(error);
				}
				return cb(null, response.result);
			});
		}
	});
};
/**
 * v 3.x verified
 *
 * Params: collectionName, filter, updateOptions, options, cb
 */
MongoDriver.prototype.updateMany = function (collectionName, filter, updateOptions, options, cb) {
	let self = this;
	
	if (!cb && typeof options === "function") {
		cb = options;
		options = null;
	}
	
	if (!collectionName) {
		return cb(core.error.generate(191));
	}
	connect(self, function (err) {
		if (err) {
			return cb(err);
		}
		self.db.collection(collectionName).updateMany(filter, updateOptions, options, function (error, response) {
			if (error) {
				return cb(error);
			}
			return cb(null, response.result);
		});
	});
};

/**
 * Inserts a new version of the record in collectionName_versioning
 */
MongoDriver.addVersionToRecords = function (collection, oneRecord, cb) {
	let self = this;
	
	if (!oneRecord) {
		return cb(core.error.generate(192));
	}
	
	self.findOne(collection, {'_id': oneRecord._id}, function (error, originalRecord) {
		if (error) {
			return cb(error);
		}
		if (!originalRecord) {
			return cb(core.error.generate(193));
		}
		
		originalRecord.v = originalRecord.v || 0;
		originalRecord.ts = new Date().getTime();
		originalRecord.refId = originalRecord._id;
		delete originalRecord._id;
		
		self.insert(collection + '_versioning', originalRecord, cb);
	});
};

/**
 * Removes all the version of a record
 */
MongoDriver.prototype.clearVersions = function (collection, recordId, cb) {
	let self = this;
	
	if (!collection) {
		return cb(core.error.generate(191));
	}
	
	self.deleteMany(collection + '_versioning', {'refId': recordId}, null, cb);
};

/**
 * Returns all the version of a record, sorted by v value descending
 */
MongoDriver.prototype.getVersions = function (collection, oneRecordId, cb) {
	let self = this;
	
	if (!collection) {
		return cb(core.error.generate(191));
	}
	
	self.find(collection + '_versioning', {'refId': oneRecordId}, cb);
};

/**
 * v 3.x verified
 *
 * Params: collectionName, fieldOrSpec, options, callback
 */
MongoDriver.prototype.createIndex = function (collectionName, keys, options, cb) {
	let self = this;
	
	if (!collectionName) {
		return cb(core.error.generate(191));
	}
	
	connect(self, function (err) {
		if (err) {
			if (cb && typeof cb === "function") {
				return cb(err);
			}
		} else {
			self.db.createIndex(collectionName, keys, options, cb);
		}
	});
};
MongoDriver.prototype.ensureIndex = function (collectionName, keys, options, cb) {
	let self = this;
	
	displayLog("***** ensureIndex is deprecated use createIndexes instead");
	self.createIndex(collectionName, keys, options, cb);
};

/**
 * v 3.x verified
 *
 * Params: collectionName, [options,] cb
 */
MongoDriver.prototype.getCollection = function (collectionName, options, cb) {
	let self = this;
	
	if (!cb && typeof options === "function") {
		cb = options;
		options = null;
	}
	
	if (!collectionName) {
		return cb(core.error.generate(191));
	}
	
	connect(self, function (err) {
		if (err) {
			if (cb && typeof cb === "function") {
				return cb(err);
			}
		} else {
			self.db.collection(collectionName, options, cb);
		}
	});
};

/**
 * v 3.x verified
 *
 * Params: collectionName, query, options, cb
 * returns the cursor as array
 */
MongoDriver.prototype.find = MongoDriver.prototype.findFields = function () {
	let args = Array.prototype.slice.call(arguments);
	let collectionName = args.shift();
	let cb = args[args.length - 1];
	let self = this;
	args.pop();
	
	if (!collectionName) {
		return cb(core.error.generate(191));
	}
	
	connect(self, function (err) {
		if (err) {
			return cb(err);
		}
		self.db.collection(collectionName).find.apply(self.db.collection(collectionName), args).toArray(cb);
	});
};
/**
 * v 3.x verified
 *
 * Params: collectionName, query, options, cb
 * exactly like find but it returns the cursor as stream
 */
MongoDriver.prototype.findStream = MongoDriver.prototype.findFieldsStream = function () {
	let args = Array.prototype.slice.call(arguments);
	let collectionName = args.shift();
	let cb = args[args.length - 1];
	let self = this;
	args.pop();
	
	if (!collectionName) {
		return cb(core.error.generate(191));
	}
	connect(self, function (err) {
		if (err) {
			return cb(err);
		}
		let batchSize = 0;
		if (self.config && self.config.streaming) {
			if (self.config.streaming[collectionName] && self.config.streaming[collectionName].batchSize) {
				batchSize = self.config.streaming[collectionName].batchSize;
			} else if (self.config.streaming.batchSize) {
				batchSize = self.config.streaming.batchSize;
			}
		}
		if (batchSize) {
			return cb(null, self.db.collection(collectionName).find.apply(self.db.collection(collectionName), args).batchSize(batchSize).stream());
		} else {
			return cb(null, self.db.collection(collectionName).find.apply(self.db.collection(collectionName), args).stream());
		}
	});
};

/**
 * v 3.x verified
 *
 * Params: collectionName, query, sort, doc, options, cb
 */
MongoDriver.prototype.findAndModify = function () {
	let args = Array.prototype.slice.call(arguments);
	let collectionName = args.shift();
	let cb = args[args.length - 1];
	let self = this;
	
	if (!collectionName) {
		return cb(core.error.generate(191));
	}
	displayLog("***** findAndModify is deprecated use findOneAndUpdate, findOneAndReplace or findOneAndDelete instead");
	connect(self, function (err) {
		if (err) {
			return cb(err);
		}
		self.db.collection(collectionName).findAndModify.apply(self.db.collection(collectionName), args);
	});
};

/**
 * v 3.x verified
 *
 * Params: collectionName, query, sort, options, cb
 */
MongoDriver.prototype.findAndRemove = function () {
	let args = Array.prototype.slice.call(arguments);
	let collectionName = args.shift();
	let cb = args[args.length - 1];
	let self = this;
	
	if (!collectionName) {
		return cb(core.error.generate(191));
	}
	displayLog("***** findAndRemove is deprecated use findOneAndDelete instead");
	connect(self, function (err) {
		if (err) {
			return cb(err);
		}
		self.db.collection(collectionName).findAndRemove.apply(self.db.collection(collectionName), args);
	});
};

/**
 * v 3.x verified
 *
 * Params: collectionName, filter, update, options, callback
 */
MongoDriver.prototype.findOneAndUpdate = function () {
	let args = Array.prototype.slice.call(arguments);
	let collectionName = args.shift();
	let cb = args[args.length - 1];
	let self = this;
	
	if (!collectionName) {
		return cb(core.error.generate(191));
	}
	
	connect(self, function (err) {
		if (err) {
			return cb(err);
		}
		self.db.collection(collectionName).findOneAndUpdate.apply(self.db.collection(collectionName), args);
	});
};

/**
 * v 3.x verified
 *
 * Params: collectionName, filter, options, callback
 */
MongoDriver.prototype.findOneAndDelete = function () {
	let args = Array.prototype.slice.call(arguments);
	let collectionName = args.shift();
	let cb = args[args.length - 1];
	let self = this;
	
	if (!collectionName) {
		return cb(core.error.generate(191));
	}
	
	connect(self, function (err) {
		if (err) {
			return cb(err);
		}
		self.db.collection(collectionName).findOneAndDelete.apply(self.db.collection(collectionName), args);
	});
};

/**
 * v 3.x verified
 *
 * Params: collectionName, query, options, <extra>, cb
 * extra is being ignore since the new mongo driver does nto support this
 */
MongoDriver.prototype.findOne = MongoDriver.prototype.findOneFields = function () {
	let self = this;
	
	let args = Array.prototype.slice.call(arguments);
	let cb = args[args.length - 1];
	if (args.length > 4 && typeof cb === "function") {
		args[3] = cb;
		args.pop();
	}
	let collectionName = args.shift();
	
	if (!collectionName) {
		return cb(core.error.generate(191));
	}
	
	connect(self, function (err) {
		if (err) {
			return cb(err);
		}
		self.db.collection(collectionName).findOne.apply(self.db.collection(collectionName), args);
	});
};

/**
 * v 3.x verified
 *
 */
MongoDriver.prototype.dropCollection = function (collectionName, options, cb) {
	let self = this;
	
	if (!cb && typeof options === "function") {
		cb = options;
		options = null;
	}
	
	if (!collectionName) {
		return cb(core.error.generate(191));
	}
	
	connect(self, function (err) {
		if (err) {
			return cb(err);
		}
		self.db.dropCollection(collectionName, options, cb);
	});
};

/**
 * v 3.x verified
 *
 */
MongoDriver.prototype.dropDatabase = function (options, cb) {
	let self = this;
	
	if (!cb && typeof options === "function") {
		cb = options;
		options = null;
	}
	
	connect(self, function (err) {
		if (err) {
			return cb(err);
		}
		self.db.dropDatabase(options, cb);
	});
};

/**
 * v 3.x verified
 *
 * Params: collectionName, criteria, [options,] cb
 * Deprecated: use countDocuments or estimatedDocumentCount
 */
MongoDriver.prototype.count = function (collectionName, criteria, options, cb) {
	let self = this;
	
	if (!cb && typeof options === "function") {
		cb = options;
		options = null;
	}
	
	if (!collectionName) {
		return cb(core.error.generate(191));
	}
	
	displayLog("***** count is deprecated please use countDocuments or estimatedDocumentCount");
	
	self.countDocuments(collectionName, criteria, options, cb);
};
MongoDriver.prototype.countDocuments = function (collectionName, criteria, options, cb) {
	let self = this;
	
	if (!collectionName) {
		return cb(core.error.generate(191));
	}
	
	connect(self, function (err) {
		if (err) {
			return cb(err);
		}
		self.db.collection(collectionName).countDocuments(criteria, options, cb);
	});
};

/**
 * v 3.x verified
 *
 * Params: collectionName, key, query, options, cb
 */
MongoDriver.prototype.distinct = function () {
	let args = Array.prototype.slice.call(arguments);
	let collectionName = args.shift();
	let cb = args[args.length - 1];
	let self = this;
	
	if (!collectionName) {
		return cb(core.error.generate(191));
	}
	connect(self, function (err) {
		if (err) {
			return cb(err);
		}
		self.db.collection(collectionName).distinct.apply(self.db.collection(collectionName), args);
	});
};

/**
 * v 3.x verified
 *
 * Params: collectionName, key, query, options, cb
 */
MongoDriver.prototype.distinctStream = function (collectionName, fieldName, criteria, options, cb) {
	let self = this;
	
	if (!collectionName) {
		return cb(core.error.generate(191));
	}
	connect(self, function (err) {
		if (err) {
			return cb(err);
		}
		let args = [
			{
				$group: {
					"_id": "$" + fieldName
				}
			}
		];
		
		if (criteria) {
			args.unshift(criteria);
		}
		
		if (options) {
			for (let i in options) {
				if (Object.hasOwnProperty.call(options, i)) {
					let oneOption = {};
					oneOption[i] = options[i];
					args.push(oneOption);
				}
			}
		}
		
		let batchSize = 0;
		if (self.config && self.config.streaming) {
			if (self.config.streaming[collectionName] && self.config.streaming[collectionName].batchSize) {
				batchSize = self.config.streaming[collectionName].batchSize;
			} else if (self.config.streaming.batchSize) {
				batchSize = self.config.streaming.batchSize;
			}
		}
		args.push((error, cursor) => {
			if (error) {
				return cb(error);
			}
			if (batchSize) {
				return cb(null, cursor.batchSize(batchSize).stream());
			} else {
				return cb(null, cursor.stream());
			}
		});
		self.db.collection(collectionName).aggregate.apply(self.db.collection(collectionName), args);
	});
};

/**
 * v 3.x verified
 *
 * Params: collectionName, pipeline, options, cb
 */
MongoDriver.prototype.aggregate = function () {
	let args = Array.prototype.slice.call(arguments);
	let collectionName = args.shift();
	let cb = args[args.length - 1];
	let self = this;
	
	if (!collectionName) {
		return cb(core.error.generate(191));
	}
	
	connect(self, function (err) {
		if (err) {
			return cb(err);
		}
		self.db.collection(collectionName).aggregate.apply(self.db.collection(collectionName), args);
	});
};
/**
 * v 3.x verified
 *
 * Params: collectionName, pipeline, options, cb
 * exactly like aggregate but it returns the cursor as stream
 */
MongoDriver.prototype.aggregateStream = function () {
	let args = Array.prototype.slice.call(arguments);
	let collectionName = args.shift();
	let cb = args[args.length - 1];
	let self = this;
	args.pop();
	
	if (!collectionName) {
		return cb(core.error.generate(191));
	}
	
	connect(self, function (err) {
		if (err) {
			return cb(err);
		}
		let batchSize = 0;
		if (self.config && self.config.streaming) {
			if (self.config.streaming[collectionName] && self.config.streaming[collectionName].batchSize) {
				batchSize = self.config.streaming[collectionName].batchSize;
			} else if (self.config.streaming.batchSize) {
				batchSize = self.config.streaming.batchSize;
			}
		}
		args.push((error, cursor) => {
			if (error) {
				return cb(error);
			}
			if (batchSize) {
				return cb(null, cursor.batchSize(batchSize).stream());
			} else {
				return cb(null, cursor.stream());
			}
		});
		self.db.collection(collectionName).aggregate.apply(self.db.collection(collectionName), args);
	});
};

/**
 * v 3.x verified
 *
 * Params: collectionName, criteria, [options,] cb
 * Deprecated: use deleteOne, deleteMany or bulkWrite
 */
MongoDriver.prototype.remove = function (collectionName, criteria, options, cb) {
	let self = this;
	
	if (!criteria) {
		criteria = {};
	}
	if (!cb && typeof options === "function") {
		cb = options;
		options = null;
	}
	
	if (!collectionName) {
		return cb(core.error.generate(191));
	}
	
	displayLog("***** remove is deprecated please use deleteOne, deleteMany or bulkWrite");
	
	if (options && options.single) {
		self.deleteOne(collectionName, criteria, options, cb);
	} else {
		self.deleteMany(collectionName, criteria, options, cb);
	}
};
MongoDriver.prototype.deleteOne = function (collectionName, criteria, options, cb) {
	let self = this;
	if (!criteria) {
		criteria = {};
	}
	if (!collectionName) {
		return cb(core.error.generate(191));
	}
	
	connect(self, function (err) {
		if (err) {
			return cb(err);
		}
		self.db.collection(collectionName).deleteOne(criteria, options, cb);
	});
};
MongoDriver.prototype.deleteMany = function (collectionName, criteria, options, cb) {
	let self = this;
	if (!criteria) {
		criteria = {};
	}
	if (!collectionName) {
		return cb(core.error.generate(191));
	}
	
	connect(self, function (err) {
		if (err) {
			return cb(err);
		}
		self.db.collection(collectionName).deleteMany(criteria, options, cb);
	});
};


/**
 * Closes Mongo connection
 */
MongoDriver.prototype.closeDb = function () {
	let self = this;
	if (self.client) {
		self.client.close();
		self.flushDb();
	}
};
MongoDriver.prototype.flushDb = function () {
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
MongoDriver.prototype.getMongoDB = function (cb) {
	let self = this;
	connect(self, function (err) {
		if (err) {
			return cb(err);
		}
		return cb(null, self.db);
	});
};

/**
 * Ensure a connection to mongo without any race condition problem
 *
 */
function connect(obj, cb) {
	let timeConnected = 0;
	let configCloneHash = null;
	if (!obj.config) {
		return cb(core.error.generate(195));
	}
	
	if (obj.config && obj.config.registryLocation && obj.config.registryLocation.env && obj.config.registryLocation.l1 && obj.config.registryLocation.l2) {
		obj.config = core.registry.get(obj.config.registryLocation.env)[obj.config.registryLocation.l1][obj.config.registryLocation.l2];
		
		let cache = cacheDBLib.getCache(obj.config.registryLocation);
		
		if (!obj.db && cache.db) {
			obj.db = cache.db;
		}
		if (cache.timeConnected) {
			timeConnected = cache.timeConnected;
		}
		if (cache.configCloneHash) {
			configCloneHash = cache.configCloneHash;
		}
	}
	
	if (obj.config.credentials) {
		if (Object.hasOwnProperty.call(obj.config.credentials, 'username') && obj.config.credentials.username === '') {
			delete obj.config.credentials;
		}
	}
	
	let url = constructMongoLink(obj.config);
	if (!url) {
		return cb(core.error.generate(190));
	}
	
	if ((obj.db && obj.config.timeConnected && (timeConnected === obj.config.timeConnected)) || (obj.db && !obj.config.registryLocation)) {
		return cb();
	}
	
	if (obj.db && (!obj.config.timeConnected || (timeConnected !== obj.config.timeConnected))) {
		let currentConfObj = merge(true, obj.config);
		delete currentConfObj.timeConnected;
		currentConfObj = objectHash(currentConfObj);
		if (currentConfObj === configCloneHash) {
			obj.config.timeConnected = new Date().getTime();
			cacheDBLib.setTimeConnected(obj.config.registryLocation, obj.config.timeConnected);
			return cb();
		}
	}
	
	if (obj.pending) {
		return setImmediate(function () {
			connect(obj, cb);
		});
	}
	obj.pending = true;
	
	mongodb.connect(url, obj.config.URLParam, function (err, client) {
		obj.config.timeConnected = new Date().getTime();
		if (err) {
			obj.pending = false;
			return cb(err);
		} else {
			if (!obj.config.name || obj.config.name === '') {
				obj.pending = false;
				return cb(new Error("You must specify a db name."));
			}
			client.on('timeout', function () {
				displayLog("Connection To Mongo has timed out!", obj.config.name);
				obj.flushDb();
			});
			
			client.on('close', function () {
				displayLog("Connection To Mongo has been closed!", obj.config.name);
				obj.flushDb();
			});
			
			if (obj.client) {
				obj.client.close();
			}
			obj.client = client;
			
			let prefix = obj.config.prefix;
			let dbName = obj.config.name;
			if (prefix && prefix !== "") {
				dbName = prefix + dbName;
			}
			obj.db = obj.client.db(dbName);
			
			cacheDBLib.setCache(obj);
			obj.pending = false;
			return cb();
		}
	});
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
						if (typeof(params[i]) === 'object') {
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