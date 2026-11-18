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
const runner = require('./runner');

/**
 * Get bearer token
 *
 * Extract token from request according to RFC6750
 *
 * @param  {Function} done
 * @this   Authorise
 */
function getBearerToken(done) {
	/* jshint validthis: true */
	let headerToken = this.req.get('Authorization'),
		getToken = this.req.query.access_token,
		postToken = this.req.body ? this.req.body.access_token : undefined;

	// Check exactly one method was used
	let methodsUsed = (headerToken !== undefined) + (getToken !== undefined) +
		(postToken !== undefined);

	if (methodsUsed > 1) {
		return done(error('invalid_request',
			'Only one method may be used to authenticate at a time (Auth header,  ' +
			'GET or POST).'));
	} else if (methodsUsed === 0) {
		return done(error('invalid_request', 'The access token was not found'));
	}

	// Header: http://tools.ietf.org/html/rfc6750#section-2.1
	if (headerToken) {
		let matches = headerToken.match(/Bearer\s(\S+)/);

		if (!matches) {
			return done(error('invalid_request', 'Malformed auth header'));
		}

		headerToken = matches[1];
	}

	// POST: http://tools.ietf.org/html/rfc6750#section-2.2
	if (postToken) {
		if (this.req.method === 'GET') {
			return done(error('invalid_request',
				'Method cannot be GET When putting the token in the body.'));
		}

		if (!this.req.is('application/x-www-form-urlencoded')) {
			return done(error('invalid_request', 'When putting the token in the ' +
				'body, content type must be application/x-www-form-urlencoded.'));
		}
	}

	this.bearerToken = headerToken || postToken || getToken;
	done();
}

/**
 * Check token
 *
 * Check it against model, ensure it's not expired
 * @param  {Function} done
 * @this   Authorise
 */
function checkToken(done) {
	/* jshint validthis: true */
	let self = this;
	this.model.getAccessToken(this.bearerToken, function (err, token) {
		if (err) {
			return done(error('server_error', false, err));
		}

		if (!token) {
			return done(error('invalid_token',
				'The access token provided is invalid.'));
		}

		// expires must be a valid Date: null, a string or a missing value has expired
		if (error.expired(token.expires)) {
			return done(error('invalid_token',
				'The access token provided has expired.'));
		}

		// Expose params
		self.req.oauth = {bearerToken: token};
		self.req.user = token.user ? token.user : {id: token.userId};

		done();
	});
}

/**
 * This is the function order used by the runner
 *
 * @type {Array}
 */
const fns = [
	getBearerToken,
	checkToken
];

/**
 * Authorise
 *
 * @param {Object}   config Instance of OAuth object
 * @param {Object}   req
 * @param {Function} next
 */
function Authorise(config, req, next) {
	this.config = config;
	this.model = config.model;
	this.req = req;

	runner(fns, this, next);
}

module.exports = Authorise;
