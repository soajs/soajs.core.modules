"use strict";
var localConfig = require("./config");
var core = require("../soajs.core");
var elasticsearch = require("elasticsearch");
var deleteByQuery = require('elasticsearch-deletebyquery');
var objectHash = require("object-hash");
var merge = require('merge');

var cacheDB = {};

function EsDriver(configuration) {
    var self = this;
    self.config = configuration;

	if(self.config){
        if(!self.config.extraParam){
            self.config.extraParam = {};
        }

        if(!self.config.extraParam.apiVersion){
            self.config.extraParam.apiVersion = localConfig.apiVersion;
        }
    }

    self.db = null;

	//initialize empty connection caching object
	if (self.config && self.config.registryLocation && self.config.registryLocation.env && self.config.registryLocation.l1 && self.config.registryLocation.l2) {
		if (!cacheDB)
			cacheDB = {};
		if (!cacheDB[self.config.registryLocation.env])
			cacheDB[self.config.registryLocation.env] = {};
		if (!cacheDB[self.config.registryLocation.env][self.config.registryLocation.l1])
			cacheDB[self.config.registryLocation.env][self.config.registryLocation.l1] = {};
		if (!cacheDB[self.config.registryLocation.env][self.config.registryLocation.l1][self.config.registryLocation.l2])
			cacheDB[self.config.registryLocation.env][self.config.registryLocation.l1][self.config.registryLocation.l2] = {};
	}
}

EsDriver.prototype.ping = function(callback){
	var self = this;
	EsDriver.connect.call(self, callback);
};

EsDriver.prototype.checkIndex = function (indexName, callback) {
	var self = this;
	EsDriver.connect.call(self, function(error) {
		if (error) {
			return callback(error);
		}

		self.db.indices.exists({'index': indexName}, callback);
	});
};

EsDriver.prototype.createIndex = function () {
	var args = Array.prototype.slice.call(arguments),
		indexName = args[0],
		callback = args[args.length - 1],
		mapping = {},
		settings = {},
		self = this;

	if(args.length >= 3){
		mapping = args[1] || {};
	}

	if(args.length >= 4){
		settings = args[2] || {};
	}

	var body = { "mappings": mapping, "settings": settings };

	if(self.config && self.config.extraParam){
		body.settings.number_of_shards = self.config.extraParam.number_of_shards || self.config.servers.length;
	}
	if(settings && settings.number_of_shards){
		body.settings.number_of_shards = settings.number_of_shards;
	}

	if(self.config && self.config.extraParam) {
		body.settings.number_of_replicas = self.config.extraParam.number_of_replicas || localConfig.number_of_replicas;
	}
	if(settings && settings.number_of_replicas){
		body.settings.number_of_replicas = settings.number_of_replicas;
	}

	EsDriver.connect.call(self, function(error) {
		if (error) {
			return callback(error);
		}

		self.db.indices.create({
			'index': indexName,
			'body': body
		}, callback);
	});
};

EsDriver.prototype.deleteIndex = function (indexName, callback) {
	var self = this;
	self.checkIndex(indexName, function(error, exists){
		if(error){
			return callback(error);
		}
		if (!exists) {
			return callback(null, true);
		}
		else {
			self.db.indices.delete({'index': indexName}, callback);
		}
	});
};

EsDriver.prototype.bulk = function(data, callback){
	var self = this;
	EsDriver.connect.call(self, function(error){
		if(error){
			return callback(error);
		}

		self.db.bulk({body: data}, function (error, response) {
			if (error) {
				return callback(error);
			} else if (response && response.errors) {
				return callback(response);
			} else {
				return callback(null, response);
			}
		});
	});
};

EsDriver.prototype.close = function(){
    var self = this;
	if(self.db){
        self.db.close();
        self.db = null;
	}
};

EsDriver.connect = function(callback){
	var self = this;
	var hosts = [];
	var keepAlive = false;
	var timeConnected = 0;
	var configCloneHash = null, env = null, l1 = null, l2 = null;
	
	if (!self.config) {
		return callback(core.error.generate(localConfig.errors.code));
	}

	//check if a previously cached connection exists
	if (self.config && self.config.registryLocation && self.config.registryLocation.env && self.config.registryLocation.l1 && self.config.registryLocation.l2) {
		env = self.config.registryLocation.env;
		l1 = self.config.registryLocation.l1;
		l2 = self.config.registryLocation.l2;
	}

	//if previously cached connection, load it and update time and hash
	if(env && l1 && l2){
        self.config = core.registry.get(env)[l1][l2];
		if (!self.db && cacheDB[env][l1][l2].db)
            self.db = cacheDB[env][l1][l2].db;
		if (cacheDB[env][l1][l2].timeConnected)
			timeConnected = cacheDB[env][l1][l2].timeConnected;
		if (cacheDB[env][l1][l2].configCloneHash)
			configCloneHash = cacheDB[env][l1][l2].configCloneHash;
	}

	//if connection is already cached and timeConnected is up to date, no need to proceed; return
	if ((self.db && self.config.timeConnected && (timeConnected === self.config.timeConnected)) || (self.db && !self.config.registryLocation)) {
		return callback();
	}

	//if connection cached is outdated, update the time connected, no need to proceed; return
	if (self.db && (!self.config.timeConnected || (timeConnected !== self.config.timeConnected))) {
		var currentConfObj = merge(true, self.config);
		delete currentConfObj.timeConnected;
		currentConfObj = objectHash(currentConfObj);
		if (currentConfObj === configCloneHash) {
            self.config.timeConnected = new Date().getTime();
			cacheDB[env][l1][l2].timeConnected = self.config.timeConnected;
			return callback();
		}
	}

	//build connection configuration, create new connection & test connection
	var esConfig = constructESConfig(self.config);
    self.db = new elasticsearch.Client(esConfig);
    self.db.ping(function(error, response){
		if(error){
			return callback(error);
		}
		if(!response){
			return callback(core.error.generate(localConfig.errors.code));
		}

		//if keepAlive is true, cache the connection and the instance
		if (keepAlive && self.config && self.config.registryLocation && self.config.registryLocation.env && self.config.registryLocation.l1 && self.config.registryLocation.l2) {
			env = self.config.registryLocation.env;
			l1 = self.config.registryLocation.l1;
			l2 = self.config.registryLocation.l2;
			cacheDB[env][l1][l2].db = self.db;
			cacheDB[env][l1][l2].configCloneHash = merge(true, self.config);
			delete  cacheDB[env][l1][l2].configCloneHash.timeConnected;
			cacheDB[env][l1][l2].configCloneHash = objectHash(cacheDB[env][l1][l2].configCloneHash);
			cacheDB[env][l1][l2].timeConnected = self.config.timeConnected;
		}

		return callback(null, true);
	});

	function constructESConfig(config){
		var protocol = config.URLParam.protocol || "http";
		var username = (config.credentials) ? config.credentials.username : "";
		var password = (config.credentials) ? config.credentials.password : "";

		config.servers.forEach(function (oneSrvr) {
			var host = oneSrvr.host;
			var port = oneSrvr.port;

			var url;
			if (username && username !== '') {
				url = protocol + "://" + username + ":" + password + "@" + host + ":" + port + "/";
			}
			else {
				url = protocol + "://" + host + ":" + port + "/";
			}

			hosts.push(url);
		});

		var esConfig = {
			hosts: hosts,
			plugins: []
		};
		
		if(config.extraParam && config.extraParam.apiVersion && parseFloat(config.extraParam.apiVersion) < 5.0){
			esConfig.plugins.push(deleteByQuery);
		}
		
		for (var i in config.extraParam) {
			if (Object.hasOwnProperty.call(config.extraParam, i)) {
				esConfig[i] = config.extraParam[i];

				if (i === 'keepAlive' && config.extraParam[i] === true) {
					keepAlive = true;
				}
			}
		}
		return esConfig;
	}
};

module.exports = EsDriver;