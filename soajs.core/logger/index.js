"use strict";

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */


const bunyan = require('bunyan');
const bformat = require('bunyan-format');
const { createStream } = require('bunyan-gke-stackdriver');
const { LoggingBunyan } = require('@google-cloud/logging-bunyan');

let _log = null;
const lib = require("soajs.core.libs");

const _streams = [
	{
		"stream": process.stderr,
		"level": "fatal"
	},
	{
		"stream": process.stderr,
		"level": "error"
	},
	{
		"stream": process.stdout,
		"level": "warn"
	},
	{
		"stream": process.stdout,
		"level": "debug"
	},
	{
		"stream": process.stdout,
		"level": "info"
	}
];

/* Logger Component
 *
 * {
 *  "name": "",
 *  "stream": process.stdout - path_to_file,
 *  "src": true,
 *  "level": ["debug","trace","info","error", "warn", "fatal"],
 *  "streams":[
 *    {
 *      "level": ["debug","trace","info","error", "warn", "fatal"],
 *      "stream": process.stdout - path_to_file
 *    }
 *    ...
 *  ]
 * }
 *
 * REF: https://www.npmjs.com/package/bunyan
 */
module.exports = {
	"getLogger": function (name, config) {
		if (!_log || config.force) {
			let configClone = lib.utils.cloneObj(config);
			configClone.name = name;

			if (config.formatter && Object.keys(config.formatter).length > 0) {
				let formatOut = bformat(config.formatter);
				configClone.stream = formatOut;
				delete configClone.formatter;
			} else if (config.gke) {
				configClone.streams = [createStream()];
			} else if (config.gke_explorer) {
				const loggingBunyan = new LoggingBunyan();
				configClone.streams = [loggingBunyan.stream()];
			} else {
				configClone.streams = _streams;
			}

			_log = new bunyan.createLogger(configClone);
		}
		return _log;
	},

	"getLog": function () {
		if (_log) {
			return _log;
		}
		return null;
	}
};