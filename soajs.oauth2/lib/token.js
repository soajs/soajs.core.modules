/**
 * Copyright 2013-present NightWorld.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Ported from node-oauth2-server 2.4.1 by SOAJS; see ../NOTICE for the changes.
 */

'use strict';

const error = require('./error');
const provision = require('../../soajs.core/provision/index.js');

/**
 * The token generator of soajs.core provision (as 2.4.1's own: sha1 of 256 random bytes), when the
 * model has none or gives none
 *
 * @param  {Function} callback
 */
function generateRandomToken(callback) {
	provision.generateToken(function (ex, token) {
		if (ex) {
			return callback(error('server_error'));
		}
		callback(false, token);
	});
}

/**
 * Token generator that will delegate to model or
 * the internal random generator
 *
 * @param  {Object}   config   the grant ({model, req})
 * @param  {String}   type     'accessToken' or 'refreshToken'
 * @param  {Function} callback
 */
function Token(config, type, callback) {
	if (config.model.generateToken) {
		config.model.generateToken(type, config.req, function (err, token) {
			if (err) {
				return callback(error('server_error', false, err));
			}
			if (!token) {
				return generateRandomToken(callback);
			}
			callback(false, token);
		});
	} else {
		generateRandomToken(callback);
	}
}

module.exports = Token;
