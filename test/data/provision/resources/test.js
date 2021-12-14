let resources = [
	{
		name: "Dev_Cluster",   // resource name
		created: "DEV",        // environment created in
		author: "miguel",      // user
		locked: true,          // if set to true, only author or owner can update
		plugged: true,         // if set to true, append to registry
		data: {
			"servers": [
				{
					"host": "127.0.0.1",
					"port": 27017
				}
			],
			"credentials": null,
			"URLParam": {
				"connectTimeoutMS": 0,
				"socketTimeoutMS": 0,
				"maxPoolSize": 5,
				"wtimeoutMS": 0,
				"slaveOk": true
			},
			"extraParam": {
				"db": {
					"native_parser": true
				},
				"server": {
					"auto_reconnect": true
				}
			},
			"anything": {
				"can": "go in here"
			}
		},              // resource configuration
		type: "cluster",       // cluster, cdn, ...
		category: "cloud",     // cloud, saas, custom
		driver: "mongo"        // mongo, oracle, sql ...
	}, {
		name: "dash_cluster",
		created: "DASHBOARD",
		author: "dahoura",
		locked: true,
		plugged: true,
		data: {},
		type: "db",
		category: "SaaS",
		driver: "oracle",
		shared: true,              // if env=dashboard&true => resource shared in all env
		sharedEnvs: {              // if avaiable and not empty => resource is only shared on these environments
			"DEV": true,
			"PROD": true
		}
	}, {
		name: "mikeCustomREGEntry",
		created: "DEV",
		author: "miguel",
		locked: false,
		plugged: false,
		data: {},
		type: "custom",
		shared: true,
		sharedEnvs: {
			"ENV": true,
			"PROD": true
		}
	}, {
		name: "cdnCustomReg",
		created: "DEV",
		author: "zouzou",
		plugged: true,
		locked: false,
		data: {
			"path": {
				"url": "http://ssms.qa.yp.ca/api/import/url",
				"file": "http://ssms.qa.yp.ca/api/import/file"
			},
			"username": "ypshopapi",
			"password": "ypshopapipw"
		},
		type: "cdn",
		category: "custom"
	}
];
