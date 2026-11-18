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

const error = require('./lib/error');
const Authorise = require('./lib/authorise');
const Grant = require('./lib/grant');

/**
 * OAuth 2 for SOAJS: authorise() for the gateway, grant() for the oauth service (password and
 * refresh_token), with the same options as node-oauth2-server 2.4.1.
 *
 * @param {Object} config {model, grants, debug, accessTokenLifetime, refreshTokenLifetime,
 *                        continueAfterResponse, clientIdRegex}
 */
function OAuth2Server(config) {

	if (!(this instanceof OAuth2Server)) {
		return new OAuth2Server(config);
	}

	config = config || {};

	if (!config.model) {
		throw new Error('No model supplied to OAuth2Server');
	}
	this.model = config.model;

	this.grants = config.grants || [];
	this.debug = config.debug || function () {
	};
	if (typeof this.debug !== 'function') {
		this.debug = console.log;
	}
	this.continueAfterResponse = config.continueAfterResponse;

	this.accessTokenLifetime = config.accessTokenLifetime !== undefined ?
		config.accessTokenLifetime : 3600;
	this.refreshTokenLifetime = config.refreshTokenLifetime !== undefined ?
		config.refreshTokenLifetime : 1209600;

	this.regex = {
		clientId: config.clientIdRegex || /^[a-z0-9-_]{3,40}$/i,
		grantType: new RegExp('^(' + this.grants.join('|') + ')$', 'i')
	};
}

/**
 * Authorisation Middleware
 *
 * Returns middleware that will authorise the request using oauth,
 * if successful it will allow the request to proceed to the next handler
 *
 * @return {Function} middleware
 */
OAuth2Server.prototype.authorise = function () {
	let self = this;

	return function (req, res, next) {
		return new Authorise(self, req, next);
	};
};

/**
 * Grant Middleware
 *
 * Returns middleware that will grant tokens to valid requests (password and refresh_token).
 * The password grant uses req.oauth2GetUser(username, password, cb) when the request sets it,
 * else the model's getUser.
 *
 * @return {Function} middleware
 */
OAuth2Server.prototype.grant = function () {
	let self = this;

	return function (req, res, next) {
		new Grant(self, req, res, next);
	};
};

module.exports = OAuth2Server;
module.exports.OAuth2Error = error;
// whether a token's expires has passed or cannot be read (for the gateway's other token checks)
module.exports.expired = error.expired;
