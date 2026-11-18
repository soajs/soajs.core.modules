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
const token = require('./token');

/**
 * Client Object (internal use only)
 *
 * @param {String} id     client_id
 * @param {String} secret client_secret
 */
function Client(id, secret) {
	this.clientId = id;
	this.clientSecret = secret;
}

/**
 * Parse the Authorization header field of req, as basic-auth 0.0.1 does: the scheme "basic" in
 * any case, then base64 of "name:pass", where name has no ":" and pass is not empty.
 *
 * @param  {Object} req
 * @return {Object} with .name and .pass, or undefined
 */
function basicAuth(req) {
	let header = req.headers.authorization;
	if (!header) {
		return;
	}

	// malformed
	let parts = header.split(' ');
	if ('basic' !== parts[0].toLowerCase()) {
		return;
	}
	if (!parts[1]) {
		return;
	}

	// credentials
	let creds = Buffer.from(parts[1], 'base64').toString().match(/^([^:]+):(.+)$/);
	if (!creds) {
		return;
	}

	return {name: creds[1], pass: creds[2]};
}

/**
 * Extract client creds from Basic auth
 *
 * @return {Object} Client
 */
function credsFromBasic(req) {
	let user = basicAuth(req);

	if (!user) {
		return false;
	}

	return new Client(user.name, user.pass);
}

/**
 * Extract client creds from body
 *
 * @return {Object} Client
 */
function credsFromBody(req) {
	return new Client(req.body.client_id, req.body.client_secret);
}

/**
 * Basic request validation and extraction of grant_type and client creds
 *
 * @param  {Function} done
 * @this   Grant
 */
function extractCredentials(done) {
	/* jshint validthis: true */
	// Only POST via application/x-www-form-urlencoded is acceptable
	if (this.req.method !== 'POST' ||
		!this.req.is('application/x-www-form-urlencoded')) {
		return done(error('invalid_request',
			'Method must be POST with application/x-www-form-urlencoded encoding'));
	}

	// Grant type
	this.grantType = this.req.body && this.req.body.grant_type;
	if (!this.grantType || !this.grantType.match(this.config.regex.grantType)) {
		return done(error('invalid_request',
			'Invalid or missing grant_type parameter'));
	}

	// Extract credentials
	// http://tools.ietf.org/html/rfc6749#section-3.2.1
	this.client = credsFromBasic(this.req) || credsFromBody(this.req);
	if (!this.client.clientId ||
		!this.client.clientId.match(this.config.regex.clientId)) {
		return done(error('invalid_client',
			'Invalid or missing client_id parameter'));
	} else if (!this.client.clientSecret) {
		return done(error('invalid_client', 'Missing client_secret parameter'));
	}

	done();
}

/**
 * Check extracted client against model
 *
 * @param  {Function} done
 * @this   Grant
 */
function checkClient(done) {
	/* jshint validthis: true */
	let self = this;
	this.model.getClient(this.client.clientId, this.client.clientSecret,
		function (err, client) {
			if (err) {
				return done(error('server_error', false, err));
			}

			if (!client) {
				return done(error('invalid_client', 'Client credentials are invalid'));
			}

			// Expose validated client
			self.req.oauth = {client: client};

			done();
		});
}

/**
 * Check the grant type is allowed for this client
 *
 * @param  {Function} done
 * @this   Grant
 */
function checkGrantTypeAllowed(done) {
	/* jshint validthis: true */
	this.model.grantTypeAllowed(this.client.clientId, this.grantType,
		function (err, allowed) {
			if (err) {
				return done(error('server_error', false, err));
			}

			if (!allowed) {
				return done(error('invalid_client',
					'The grant type is unauthorised for this client_id'));
			}

			done();
		});
}

/**
 * Grant for password grant type. The user lookup is the request's (req.oauth2GetUser) when set,
 * else the model's getUser.
 *
 * @param  {Function} done
 */
function usePasswordGrant(done) {
	/* jshint validthis: true */
	// User credentials
	let uname = this.req.body.username,
		pword = this.req.body.password;
	if (!uname || !pword) {
		return done(error('invalid_client',
			'Missing parameters. "username" and "password" are required'));
	}

	let self = this;
	let getUser = typeof this.req.oauth2GetUser === 'function' ? this.req.oauth2GetUser : this.model.getUser;
	return getUser.call(this.model, uname, pword, function (err, user) {
		if (err) {
			return done(error('server_error', false, err));
		}
		if (!user) {
			return done(error('invalid_grant', 'User credentials are invalid'));
		}

		self.user = user;
		done();
	});
}

/**
 * Grant for refresh_token grant type. The used refresh token is revoked before new tokens are
 * issued: when the model's revokeRefreshToken did not remove it, another request used it first,
 * and this one answers "Invalid refresh token".
 *
 * @param  {Function} done
 */
function useRefreshTokenGrant(done) {
	/* jshint validthis: true */
	let refresh_token = this.req.body.refresh_token;

	if (!refresh_token) {
		return done(error('invalid_request', 'No "refresh_token" parameter'));
	}

	let self = this;
	this.model.getRefreshToken(refresh_token, function (err, refreshToken) {
		if (err) {
			return done(error('server_error', false, err));
		}

		if (!refreshToken || refreshToken.clientId !== self.client.clientId) {
			return done(error('invalid_grant', 'Invalid refresh token'));
		} else if (error.expired(refreshToken.expires, self.now)) {
			return done(error('invalid_grant', 'Refresh token has expired'));
		}

		if (!refreshToken.user && !refreshToken.userId) {
			return done(error('server_error', false,
				'No user/userId parameter returned from getRefreshToken'));
		}

		self.user = refreshToken.user || {id: refreshToken.userId};

		if (self.model.revokeRefreshToken) {
			return self.model.revokeRefreshToken(refresh_token, function (err, removed) {
				if (err) {
					return done(error('server_error', false, err));
				}
				if (!removed) {
					return done(error('invalid_grant', 'Invalid refresh token'));
				}
				done();
			});
		}

		done();
	});
}

/**
 * Delegate to the relevant grant function based on grant_type
 *
 * @param  {Function} done
 * @this   Grant
 */
function checkGrantType(done) {
	/* jshint validthis: true */
	switch (this.grantType) {
		case 'password':
			return usePasswordGrant.call(this, done);
		case 'refresh_token':
			return useRefreshTokenGrant.call(this, done);
		default:
			done(error('invalid_request',
				'Invalid grant_type parameter or parameter missing'));
	}
}

/**
 * Expose user
 *
 * @param  {Function} done
 * @this   Grant
 */
function exposeUser(done) {
	/* jshint validthis: true */
	this.req.user = this.user;

	done();
}

/**
 * Generate an access token
 *
 * @param  {Function} done
 * @this   Grant
 */
function generateAccessToken(done) {
	/* jshint validthis: true */
	let self = this;
	token(this, 'accessToken', function (err, token) {
		self.accessToken = token;
		done(err);
	});
}

/**
 * Save access token with model
 *
 * @param  {Function} done
 * @this   Grant
 */
function saveAccessToken(done) {
	/* jshint validthis: true */
	let accessToken = this.accessToken;

	// Object indicates a reissue
	if (typeof accessToken === 'object' && accessToken.accessToken) {
		this.accessToken = accessToken.accessToken;
		return done();
	}

	let expires = null;
	if (this.config.accessTokenLifetime !== null) {
		expires = new Date(this.now);
		expires.setSeconds(expires.getSeconds() + this.config.accessTokenLifetime);
	}

	this.model.saveAccessToken(accessToken, this.client.clientId, expires,
		this.user, function (err) {
			if (err) {
				return done(error('server_error', false, err));
			}
			done();
		});
}

/**
 * Generate a refresh token
 *
 * @param  {Function} done
 * @this   Grant
 */
function generateRefreshToken(done) {
	/* jshint validthis: true */
	if (this.config.grants.indexOf('refresh_token') === -1) {
		return done();
	}

	let self = this;
	token(this, 'refreshToken', function (err, token) {
		self.refreshToken = token;
		done(err);
	});
}

/**
 * Save refresh token with model
 *
 * @param  {Function} done
 * @this   Grant
 */
function saveRefreshToken(done) {
	/* jshint validthis: true */
	let refreshToken = this.refreshToken;

	if (!refreshToken) {
		return done();
	}

	// Object indicates a reissue
	if (typeof refreshToken === 'object' && refreshToken.refreshToken) {
		this.refreshToken = refreshToken.refreshToken;
		return done();
	}

	let expires = null;
	if (this.config.refreshTokenLifetime !== null) {
		expires = new Date(this.now);
		expires.setSeconds(expires.getSeconds() + this.config.refreshTokenLifetime);
	}

	this.model.saveRefreshToken(refreshToken, this.client.clientId, expires,
		this.user, function (err) {
			if (err) {
				return done(error('server_error', false, err));
			}
			done();
		});
}

/**
 * Send the tokens
 *
 * @param  {Function} done
 * @this   Grant
 */
function sendResponse(done) {
	/* jshint validthis: true */
	let response = {
		token_type: 'bearer',
		access_token: this.accessToken
	};

	if (this.config.accessTokenLifetime !== null) {
		response.expires_in = this.config.accessTokenLifetime;
	}

	if (this.refreshToken) {
		response.refresh_token = this.refreshToken;
	}

	this.res.set({'Cache-Control': 'no-store', 'Pragma': 'no-cache'});
	this.res.jsonp(response);

	if (this.config.continueAfterResponse) {
		done();
	}
}

/**
 * This is the function order used by the runner
 *
 * @type {Array}
 */
const fns = [
	extractCredentials,
	checkClient,
	checkGrantTypeAllowed,
	checkGrantType,
	exposeUser,
	generateAccessToken,
	saveAccessToken,
	generateRefreshToken,
	saveRefreshToken,
	sendResponse
];

/**
 * Grant
 *
 * @param {Object}   config Instance of OAuth object
 * @param {Object}   req
 * @param {Object}   res
 * @param {Function} next
 */
function Grant(config, req, res, next) {
	this.config = config;
	this.model = config.model;
	this.now = new Date();
	this.req = req;
	this.res = res;

	runner(fns, this, next);
}

module.exports = Grant;
