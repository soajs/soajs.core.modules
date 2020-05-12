'use strict';
var test = {
	"code": "TEST",
	"locked": true,
	"description": "this is the DEV environment",
	"ips": [
		"127.0.0.1"
	],
	"dbs": {
		"config": {
			"prefix": "SOAJS_"
		},
		"databases": {
			"urac": {
				"prefix": "MIKE_", // specific for this db (overriden)
				"cluster": "dev_cluster",
				"tenantSpecific": true
			},
			"session": {
				"prefix": "SOAJS_", // same as default, set by insert/update api bl
				"tenantSpecific": false,
				"cluster": "dev_cluster",
				"name": "dev_core_session",
				"store": {},
				"collection": "sessions",
				"stringify": false,
				"expireAfter": 1209600000
			},
			"es": {
				"prefix": "", // specific for this db (overriden), no prefix
				"cluster": "es1",
				"tenantSpecific": false
			}
		}
	},
	"services": {
		"controller": {
			"maxPoolSize": 100,
			"authorization": true,
			"requestTimeout": 30,
			"requestTimeoutRenewal": 0
		},
		"config": {
			"awareness": {
				"healthCheckInterval": 1000 * 0.5, // 5 seconds
				"autoRelaodRegistry": 1000 * 60 * 5, // 5 minutes
				"maxLogCount":5,
				"autoRegisterService": true
			},
			"agent": {
				"topologyDir": "/opt/soajs/"
			},
			"key": {
				"algorithm": 'aes256',
				"password": 'soajs key lal massa'
			},
			"logger": { //ATTENTION: this is not all the properties for logger
                "src": true,
                "level": "debug",
                "formatter": {
                    outputMode: 'long'
                }
			},
			"cors": {
				"enabled": true,
				"origin": '*',
				"credentials": 'true',
				"methods": 'GET,HEAD,PUT,PATCH,POST,DELETE',
				"headers": 'key,soajsauth,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type',
				"maxage": 1728000
			},
			"oauth": {
				"grants": ['password', 'refresh_token'],
				"accessTokenLifetime": 7200,
				"refreshTokenLifetime": 1209600,
				"debug": false
			},
			"ports": {"controller": 4000, "maintenanceInc": 1000, "randomInc": 100},
			"cookie": {"secret": "this is a secret sentence"},
			"session": {
				"name": "soajsID",
				"secret": "this is antoine hage app server",
				"cookie": {"path": '/', "httpOnly": true, "secure": false, "domain": "soajs.com", "maxAge": null},
				"resave": false,
				"saveUninitialized": false
			}
		}
	}
};