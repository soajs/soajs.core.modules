"use strict";
let assert = require('assert');
let helper = require("../helper.js");
let soajsMongo = helper.requireModule('./index.js').mongo;

describe("testing connection", function () {
	let mongo;

	it("invalid credentials all requests should fail", function (done) {
		let dbConfig = {
			"name": 'soajs_test_db',
			"prefix": "soajs_test_",
			"servers": [
				{
					"host": "127.0.0.1",
					"port": "27017"
				}
			],
			"credentials": {
				'username': 'admin',
				'password': 'admin'
			},
			"URLParam": {
				"useUnifiedTopology": true
			}
		};

		mongo = new soajsMongo(dbConfig);
		mongo.ObjectId("30d2cb5fc04ce51e06000003");
		mongo.find('myCollection', {}, function (error, response) {
			assert.ok(error);
			assert.ok(!response);
			assert.ok(error.message);

			mongo.findOne('myCollection', {}, function (error, response) {
				assert.ok(error);
				assert.ok(!response);
				assert.ok(error.message);
				mongo.insert('myCollection', {}, function (error, response) {
					assert.ok(error);
					assert.ok(!response);
					assert.ok(error.message);
					// mongo.save('myCollection', {}, function (error, response) {
					// 	assert.ok(error);
					// 	assert.ok(!response);
					// 	assert.ok(error.message);
					mongo.update('myCollection', { 'a': 'b' }, { $set: { 'a': 'c' } }, function (error, response) {
						assert.ok(error);
						assert.ok(!response);
						assert.ok(error.message);
						mongo.count('myCollection', { 'a': 'b' }, function (error, response) {
							assert.ok(error);
							assert.ok(!response);
							assert.ok(error.message);
							mongo.createIndex('myCollection', { 'a': 1 }, null, function (error, response) {
								assert.ok(error);
								assert.ok(!response);
								assert.ok(error.message);
								mongo.getCollection('myCollection', function (error, response) {
									assert.ok(error);
									assert.ok(!response);
									assert.ok(error.message);
									mongo.remove('myCollection', {}, function (error, response) {
										assert.ok(error);
										assert.ok(!response);
										assert.ok(error.message);
										mongo.findOneAndUpdate('myCollection', { 'a': 'b' }, { a: 1 }, { 'a': 'c' }, function (error, response) {
											assert.ok(error);
											assert.ok(!response);
											assert.ok(error.message);
											mongo.findOneAndDelete('myCollection', { 'a': 'b' }, { a: 1 }, function (error, response) {
												assert.ok(error);
												assert.ok(!response);
												assert.ok(error.message);
												mongo.dropCollection('myCollection', function (error, response) {
													assert.ok(error);
													assert.ok(!response);
													assert.ok(error.message);
													mongo.dropDatabase(function (error, response) {
														assert.ok(error);
														assert.ok(!response);
														assert.ok(error.message);
														done();
													});
												});
											});
										});
									});
								});
							});
						});
					});
					// });
				});
			});
		});
	});

	it("testing with no db name", function (done) {
		let dbConfig = {
			"name": '',
			"prefix": "soajs_test_",
			"servers": [
				{
					"host": "127.0.0.1",
					"port": "27017"
				}
			],
			"credentials": null,
			"URLParam": {
				"useUnifiedTopology": true
			}
		};

		mongo = new soajsMongo(dbConfig);
		mongo.find('myCollection', {}, function (error) {
			assert.ok(error);
			assert.ok(error.message);
			done();
		});
	});

	it("testing get Mongo Skin DB", function (done) {
		let dbConfig = {
			"name": 'core_provision',
			"prefix": "soajs_test_",
			"servers": [
				{
					"host": "127.0.0.1",
					"port": "27017"
				}
			],
			"credentials": null,
			"URLParam": {
				"useUnifiedTopology": true
			}
		};

		mongo = new soajsMongo(dbConfig);
		mongo.getMongoDB(function (error, db) {
			console.log(error);
			assert.ifError(error);
			assert.ok(db);
			done();
		});
	});
});

describe("TESTING soajs.mongo", function () {
	let mongo = null;
	before(function (done) {
		let dbConfig = {
			"name": 'soajs_test_db',
			"prefix": "soajs_test_",
			"servers": [
				{
					"host": "127.0.0.1",
					"port": "27017"
				}
			],
			"credentials": null,
			"URLParam": {
				"useUnifiedTopology": true
			}
		};
		mongo = new soajsMongo(dbConfig);

		mongo.dropDatabase(function (error) {
			assert.ifError(error);
			done();
		});
	});

	after(function (done) {
		mongo.dropDatabase(function (error) {
			assert.ifError(error);
			done();
		});
	});

	describe("testing ensure index", function () {

		it("fail - no collectionName", function (done) {
			mongo.createIndex(null, null, null, function (error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function (done) {
			mongo.createIndex("myCollection", { 'username': 1 }, null, function (error, response) {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});
	});

	describe("testing create index", function () {

		it("fail - no collectionName", function (done) {
			mongo.createIndex(null, null, null, function (error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function (done) {
			mongo.createIndex("myCollection", { 'password': 1 }, null, function (error, response) {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});
	});

	describe("testing get collection", function () {

		it("fail - no collectionName", function (done) {
			mongo.getCollection(null, function (error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function (done) {
			mongo.getCollection("myCollection", function (error, response) {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});
	});

	describe("testing insertOne", function () {

		it("fail - no collectionName", function (done) {
			mongo.insertOne(null, null, null, function (error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it("fail - no document", function (done) {
			mongo.insertOne("myCollection", null, null, function (error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function (done) {
			mongo.insertOne("myCollection", { 'a': 'b' }, null, function (error, response) {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});
	});

	// describe("testing save", function () {
	//
	// 	it("fail - no collectionName", function (done) {
	// 		mongo.save(null, null, function (error) {
	// 			assert.ok(error);
	// 			assert.ok(error.message);
	// 			//assert.equal(error.message, 'Wrong input param form mongo function');
	// 			done();
	// 		});
	// 	});
	//
	// 	it("fail - no document", function (done) {
	// 		mongo.save("myCollection", null, function (error) {
	// 			assert.ok(error);
	// 			assert.ok(error.message);
	// 			//assert.equal(error.message, 'Wrong input param form mongo function');
	// 			done();
	// 		});
	// 	});
	//
	// 	it('success - all working', function (done) {
	// 		mongo.findOne('myCollection', {}, function (error, record) {
	// 			assert.ifError(error);
	// 			assert.ok(record);
	// 			mongo.save("myCollection", record, function (error, response) {
	// 				assert.ifError(error);
	// 				assert.ok(response);
	// 				done();
	// 			});
	// 		});
	// 	});
	// });

	describe("testing update", function () {
		it("fail - no collectionName", function (done) {
			mongo.update(null, function (error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function (done) {
			mongo.update("myCollection", { 'a': 'b' }, { $set: { 'a': 'c' } }, function (error, response) {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});
	});

	describe("testing find", function () {
		it("fail - no collectionName", function (done) {
			mongo.find(null, function (error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function (done) {
			(async () => {
				try {
					let response = await mongo.find("myCollection");
					assert.ok(response);
				} catch (error) {
					assert.ifError(error);
				} finally {
					done();
				}
			})();
		});

		it('success - all working', function (done) {
			mongo.find("myCollection", {}, function (error, response) {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});

		it('success - all working', function (done) {
			mongo.find("myCollection", {}, {}, function (error, response) {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});
	});

	describe("testing findStream", function () {
		it("fail - no collectionName", function (done) {
			mongo.findStream(null, function (error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function (done) {
			mongo.findStream("myCollection", function (error, Stream) {
				assert.ifError(error);
				assert.ok(Stream);

				Stream.on('data', function (data) {
					console.log(data);
				});

				Stream.on('end', function () {
					done();
				});
			});
		});

		it('success - all working', function (done) {
			mongo.findStream("myCollection", {}, function (error, Stream) {
				assert.ifError(error);
				assert.ok(Stream);

				Stream.on('data', function (data) {
					console.log(data);
				});

				Stream.on('end', function () {
					done();
				});
			});
		});

		it('success - all working', function (done) {
			mongo.findStream("myCollection", {}, {}, function (error, Stream) {
				assert.ifError(error);
				assert.ok(Stream);

				Stream.on('data', function (data) {
					console.log(data);
				});

				Stream.on('end', function () {
					done();
				});
			});
		});
	});

	// describe("testing find and modify", function () {
	// 	it("fail - no collectionName", function (done) {
	// 		mongo.findAndModify(null, function (error) {
	// 			assert.ok(error);
	// 			assert.ok(error.message);
	// 			//assert.equal(error.message, 'Wrong input param form mongo function');
	// 			done();
	// 		});
	// 	});
	//
	// 	it('success - all working', function (done) {
	// 		mongo.findAndModify("myCollection", {'a': 'b'}, {'a': 1}, {$set: {'a': 'c'}}, function (error, response) {
	// 			assert.ifError(error);
	// 			assert.ok(response);
	// 			done();
	// 		});
	// 	});
	//
	// });

	describe("testing find one and update", function () {
		it("fail - no collectionName", function (done) {
			mongo.findOneAndUpdate(null, function (error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function (done) {
			mongo.findOneAndUpdate("myCollection", { 'a': 'c' }, { $set: { 'a': 'c', 'b': 'tony' } }, function (error, response) {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});

	});

	// describe("testing find and remove", function () {
	// 	it("fail - no collectionName", function (done) {
	// 		mongo.findAndRemove(null, function (error) {
	// 			assert.ok(error);
	// 			assert.ok(error.message);
	// 			//assert.equal(error.message, 'Wrong input param form mongo function');
	// 			done();
	// 		});
	// 	});
	//
	// 	it('success - all working', function (done) {
	// 		mongo.findAndRemove("myCollection", {'a': 'b'}, {'a': 1}, function (error, response) {
	// 			assert.ifError(error);
	// 			done();
	// 		});
	// 	});
	// });

	describe("testing find one and delete", function () {
		it("fail - no collectionName", function (done) {
			mongo.findOneAndDelete(null, function (error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function (done) {
			mongo.insert("myCollection", { "f": "e" }, function (error) {
				assert.ifError(error);

				mongo.findOneAndDelete("myCollection", { 'f': 'e' }, function (error, response) {
					assert.ifError(error);
					done();
				});
			});
		});
	});

	describe("testing find one", function () {
		it("fail - no collectionName", function (done) {
			mongo.findOne(null, function (error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function (done) {
			mongo.findOne("myCollection", { 'a': 'c' }, function (error, response) {
				assert.ifError(error);
				done();
			});
		});
	});

	describe("testing count", function () {
		it("fail - no collectionName", function (done) {
			mongo.count(null, null, function (error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function (done) {
			mongo.count("myCollection", { 'a': 'c' }, function (error, response) {
				assert.ifError(error);
				assert.equal(response, 1);
				done();
			});
		});

		it('success - all working', function (done) {
			mongo.count("myCollection", { 'a': 'b' }, function (error, response) {
				assert.ifError(error);
				assert.equal(response, 0);
				done();
			});
		});
	});

	describe("testing distinct", function () {
		it("fail - no collectionName", function (done) {
			mongo.distinct(null, null, function (error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function (done) {
			mongo.distinct("myCollection", 'a', function (error, response) {
				assert.ifError(error);
				assert.equal(response.length, 1);
				done();
			});
		});

	});

	describe("testing distinctStream", function () {
		it("fail - no collectionName", function (done) {
			mongo.distinctStream(null, null, null, null, function (error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function (done) {
			mongo.distinctStream("myCollection", 'a', null, null, function (error, streamer) {
				assert.ifError(error);
				assert.ok(streamer);

				streamer.on('data', function (data) {
					assert.ok(data);
				});

				streamer.on('end', function () {
					done();
				});
			});
		});

		it('success - all working with options', function (done) {
			mongo.distinctStream("myCollection", 'a', null, {
				"$skip": 0,
				"$limit": 10000,
				"$sort": { "a": 1 }
			}, function (error, streamer) {
				assert.ifError(error);
				assert.ok(streamer);

				streamer.on('data', function (data) {
					assert.ok(data);
				});

				streamer.on('end', function () {
					done();
				});
			});
		});
	});

	describe("testing aggregate", function () {
		it("fail - no collectionName", function (done) {
			mongo.aggregate(null, null, null, function (error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function (done) {
			mongo.aggregate("myCollection", [{ $match: { a: "c" } }], null, function (error, cursor) {
				assert.ifError(error);
				cursor.toArray((error, docs) => {
					assert.equal(docs.length, 1);
					done();
				});
			});
		});

		it('success - all working with ptomise', function (done) {
			(async () => {
				try {
					let cursor = await mongo.aggregate("myCollection", [{ $match: { a: "c" } }], null);
					let docs = await cursor.toArray();
					assert.equal(docs.length, 1);
				} catch (error) {
					assert.ifError(error);
				} finally {
					done();
				}
			})();
		});
	});

	describe("testing aggregateStream", function () {
		it("fail - no collectionName", function (done) {
			mongo.aggregateStream(null, null, null, function (error) {
				assert.ok(error);
				assert.ok(error.message);
				done();
			});
		});

		it('success - all working', function (done) {
			mongo.aggregateStream("myCollection", [{ $match: { a: "c" } }], null, function (error, streamer) {
				assert.ifError(error);
				assert.ok(streamer);

				streamer.on('data', function (data) {
					assert.ok(data);
				});

				streamer.on('end', function () {
					done();
				});
			});
		});
	});

	describe("testing remove", function () {
		it("fail - no collectionName", function (done) {
			mongo.remove(null, null, function (error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function (done) {
			mongo.remove("myCollection", { 'a': 'c' }, function (error, response) {
				assert.ifError(error);
				done();
			});
		});
	});

	describe("testing drop collection", function () {
		it("fail - no collectionName", function (done) {
			mongo.dropCollection(null, function (error) {
				assert.ok(error);
				assert.ok(error.message);
				//assert.equal(error.message, 'Wrong input param form mongo function');
				done();
			});
		});

		it('success - all working', function (done) {
			mongo.dropCollection("myCollection", function (error, response) {
				assert.ifError(error);
				done();
			});
		});
	});

});

describe("TESTING soajs.mongo versioning", function () {
	let mongo = null;
	before(function (done) {
		let dbConfig = {
			"name": 'soajs_test_db',
			"prefix": "soajs_test_",
			"servers": [
				{
					"host": "127.0.0.1",
					"port": "27017"
				}
			],
			"credentials": null,
			"URLParam": {
				"useUnifiedTopology": true
			}
		};
		mongo = new soajsMongo(dbConfig);

		mongo.dropDatabase(function (error) {
			assert.ifError(error);
			done();
		});
	});

	after(function (done) {
		mongo.dropDatabase(function (error) {
			assert.ifError(error);
			done();
		});
	});

	it("insert one record", function (done) {
		mongo.insert("myCollection", { 'a': 'b' }, true, function (error, response) {
			assert.ifError(error);
			assert.ok(response);
			mongo.findOne('myCollection', { 'a': "b" }, function (error, record) {
				assert.ifError(error);
				assert.ok(record);
				assert.equal(record.v, 1);
				assert.ok(record.ts);
				done();
			});
		});
	});

	it("save one record", function (done) {
		mongo.findOne("myCollection", { 'a': 'b' }, function (error, oneRecord) {
			assert.ifError(error);
			assert.ok(oneRecord);

			mongo.save("myCollection", oneRecord, true, function (error, response) {
				assert.ifError(error);
				assert.ok(response);

				mongo.findOne('myCollection', { 'a': "b" }, function (error, record) {
					assert.ifError(error);
					assert.ok(record);
					assert.equal(record.v, 2);
					assert.ok(record.ts);
					done();
				});
			});
		});
	});

	it("update one record", function (done) {
		mongo.update("myCollection", { 'a': 'b' }, { $set: { 'a': 'c' } }, true, function (error, response) {
			assert.ifError(error);
			assert.ok(response);
			mongo.findOne('myCollection', { 'a': "c" }, function (error, record) {
				assert.ifError(error);
				assert.ok(record);
				assert.equal(record.v, 3);
				assert.ok(record.ts);
				done();
			});
		});
	});

	it("get one record version", function (done) {
		mongo.findOne('myCollection', { 'a': 'c' }, function (error, oneRecord) {
			assert.ifError(error);
			assert.ok(oneRecord);

			mongo.getVersions("myCollection", oneRecord._id, function (error, response) {
				assert.ifError(error);
				assert.ok(response);
				assert.equal(response.length, 2);
				done();
			});
		});
	});

	it("clear record versions", function (done) {
		mongo.findOne('myCollection', { 'a': 'c' }, function (error, oneRecord) {
			assert.ifError(error);
			assert.ok(oneRecord);

			mongo.clearVersions("myCollection", oneRecord._id, function (error, response) {
				assert.ifError(error);
				assert.ok(response);
				done();
			});
		});
	});

	it("insert multi records", function (done) {
		let multiRecords = [
			{ 'var1': 'val1' },
			{ 'var3': 'val2' },
			{ 'var2': 'val3' }
		];

		mongo.remove('myCollection', {}, function (error) {
			assert.ifError(error);
			mongo.insert("myCollection", multiRecords, true, function (error, response) {
				assert.ifError(error);
				assert.ok(response);

				mongo.find('myCollection', {}, function (error, records) {
					assert.ifError(error);
					assert.ok(records);
					records.forEach(function (oneRecord) {
						assert.equal(oneRecord.v, 1);
						assert.ok(oneRecord.ts);
					});
					done();
				});
			});
		});
	});
});
