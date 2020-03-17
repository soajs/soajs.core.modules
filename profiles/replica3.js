'use strict';

module.exports = {
	"name": "core_provision",
	"cluster": "dash_cluster",
	"prefix": "",
	"servers": [
		{
			"host": "dataProxy-01",
			"port": 27017
		},
		{
			"host": "dataProxy-02",
			"port": 27017
		},
		{
			"host": "dataProxy-03",
			"port": 27017
		}
	],
	"credentials": null,
	"streaming": {},
	"extraParam": {},
	"URLParam": {
		"readPreference": "secondaryPreferred",
		"replicaSet": "rs",
		"w": "majority",
		"bufferMaxEntries": 0,
		"ha": true,
		"poolSize": 2
	}
};