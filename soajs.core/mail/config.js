"use strict";

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

module.exports = {
	transport: { //default mail mtp configuration
		default: {
			"type": "sendmail",
			"options": {
				"sendmail": true
			}
		}
	},
	schema: {
		transport: {
			"type": "object",
			"properties": {
				"type": {"type": "string"},
				"options": {"type": "object"}
			},
			required: ["type", "options"]
		},
		mailOptions: {
			"type": "object",
			"properties": {
				from: {'type': 'string'},
				to: {'type': 'string'},
				subject: {'type': 'string'},
				html: {'type': 'string'},
				text: {'type': 'string'}
			},
			required: ["from", "to", "subject", "text"]
		}
	}
};
