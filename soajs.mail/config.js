"use strict";

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

let att = {
	'type': 'object',
	required: true,
	properties: {
		filename: {"type": "string", required: false},
		contentType: {"type": "string", required: false},
		path: {"type": "string", required: true}
	}
};

let att2 = JSON.parse(JSON.stringify(att));
delete att2.properties.path;
att2.properties.content = {"type": "string", required: true};

let att3 = JSON.parse(JSON.stringify(att2));
att3.properties.content = {"type": "buffer", required: true};

let att4 = JSON.parse(JSON.stringify(att2));
att4.properties.content = {"type": "stream", required: true};

module.exports = {
	schema: {
		type: 'object',
		required: true,
		properties: {
			from: {type: 'string', required: true},
			to: {type: 'string', required: true},
			subject: {type: 'string', required: true},
			content: {type: 'string', required: false},
			path: {type: 'string', required: false},
			data: {type: 'object', required: false},
			headers: {
				type: 'object',
				required: false,
				additionalProperties: {
					'type': 'string'
				}
			},
			attachments: {
				type: 'array',
				required: false,
				items: {
					'oneof': [att, att2, att3, att4]
				}
			}
		}
	}
};