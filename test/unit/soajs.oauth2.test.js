"use strict";

/**
 * soajs.oauth2: the tests of node-oauth2-server 2.4.1 for authorise, grant, the password and
 * refresh_token grants and OAuth2Error (test/authorise.js, grant.js, grant.password.js,
 * grant.refresh_token.js, error.js; Copyright 2013-present NightWorld, Apache License 2.0),
 * ported to plain requests, and the tests of what SOAJS changed (see soajs.oauth2/NOTICE).
 */

const assert = require("assert");
const helper = require("../helper.js");
const oauth2server = helper.requireModule("./soajs.oauth2/index.js");
const OAuth2Error = oauth2server.OAuth2Error;

// an express-like request and response, with what the library reads and writes
function request(opts) {
	const headers = {};
	for (const [k, v] of Object.entries(opts.headers || {})) {
		headers[k.toLowerCase()] = v;
	}
	if (opts.form) {
		headers["content-type"] = "application/x-www-form-urlencoded";
	}
	return {
		"method": opts.method || "GET",
		"headers": headers,
		"query": opts.query || {},
		"body": opts.form || opts.body,
		"get": (name) => headers[name.toLowerCase()],
		"is": (type) => (headers["content-type"] || "").split(";")[0].trim() === type
	};
}

function response() {
	return {
		"headers": {},
		"body": undefined,
		"set": function (h) {
			Object.assign(this.headers, h);
		},
		"jsonp": function (b) {
			this.body = b;
		}
	};
}

// runs a middleware; resolves with {err, req, res} when next is called, or when the response is
// sent and next is not called (continueAfterResponse off)
function run(mw, req) {
	return new Promise((resolve) => {
		const res = response();
		const jsonp = res.jsonp;
		res.jsonp = function (b) {
			jsonp.call(this, b);
			setImmediate(() => resolve({"err": undefined, req, res, "sent": true}));
		};
		mw(req, res, (err) => resolve({err, req, res, "next": true}));
	});
}

function expectError(result, code, message) {
	assert.ok(result.err instanceof OAuth2Error, "an OAuth2Error, got " + result.err);
	assert.strictEqual(result.err.code, code);
	assert.strictEqual(result.err.message, message);
}

const basic = (id, secret) => "Basic " + Buffer.from(id + ":" + secret).toString("base64");

function model(extra) {
	return Object.assign({
		"getClient": (id, secret, cb) => cb(false, id === "thom" && secret === "nightworld" ? {"clientId": id} : false),
		"grantTypeAllowed": (id, type, cb) => cb(false, true),
		"getUser": (u, p, cb) => cb(false, u === "thomseddon" && p === "nightworld" ? {"id": 1} : false),
		"saveAccessToken": (t, c, e, u, cb) => cb(),
		"saveRefreshToken": (t, c, e, u, cb) => cb()
	}, extra || {});
}

const client = {"client_id": "thom", "client_secret": "nightworld"};

describe("soajs.oauth2", function () {

	describe("Authorise (2.4.1)", function () {
		const authorise = (m, req) => run(oauth2server({"model": m}).authorise(), req);
		const valid = {"getAccessToken": (t, cb) => cb(false, t === "thom" ? {"expires": new Date(Date.now() + 60000), "user": {"id": 1}} : false)};

		it("should detect no access token", async () => {
			expectError(await authorise(valid, request({})), 400, "The access token was not found");
		});
		it("should allow valid token as query param", async () => {
			const r = await authorise(valid, request({"query": {"access_token": "thom"}}));
			assert.strictEqual(r.err, undefined);
		});
		it("should require application/x-www-form-urlencoded when access token is in body", async () => {
			expectError(await authorise(valid, request({"method": "POST", "body": {"access_token": "thom"}, "headers": {"content-type": "application/json"}})), 400,
				"When putting the token in the body, content type must be application/x-www-form-urlencoded.");
		});
		it("should not allow GET when access token in body", async () => {
			expectError(await authorise(valid, request({"method": "GET", "form": {"access_token": "thom"}})), 400,
				"Method cannot be GET When putting the token in the body.");
		});
		it("should allow valid token in body", async () => {
			const r = await authorise(valid, request({"method": "POST", "form": {"access_token": "thom"}}));
			assert.strictEqual(r.err, undefined);
		});
		it("should detect malformed header", async () => {
			expectError(await authorise(valid, request({"headers": {"Authorization": "Invalid"}})), 400, "Malformed auth header");
		});
		it("should allow valid token in header", async () => {
			const r = await authorise(valid, request({"headers": {"Authorization": "Bearer thom"}}));
			assert.strictEqual(r.err, undefined);
		});
		it("should allow exactly one method (get: query + auth)", async () => {
			expectError(await authorise(valid, request({"query": {"access_token": "thom"}, "headers": {"Authorization": "Bearer thom"}})), 400,
				"Only one method may be used to authenticate at a time (Auth header,  GET or POST).");
		});
		it("should allow exactly one method (post: query + body)", async () => {
			expectError(await authorise(valid, request({"method": "POST", "query": {"access_token": "thom"}, "form": {"access_token": "thom"}})), 400,
				"Only one method may be used to authenticate at a time (Auth header,  GET or POST).");
		});
		it("should allow exactly one method (post: query + empty body)", async () => {
			const r = await authorise(valid, request({"method": "POST", "query": {"access_token": "thom"}, "form": {}}));
			assert.strictEqual(r.err, undefined);
		});
		it("should detect expired token", async () => {
			const m = {"getAccessToken": (t, cb) => cb(false, {"expires": new Date(Date.now() - 1000)})};
			expectError(await authorise(m, request({"query": {"access_token": "thom"}})), 401, "The access token provided has expired.");
		});
		// SOAJS (intended change from 2.4.1): a token without a valid Date expires has expired;
		// 2.4.1 let a null expires never expire
		it("should refuse a token whose expires is null (2.4.1 let it through)", async () => {
			const m = {"getAccessToken": (t, cb) => cb(false, {"expires": null})};
			expectError(await authorise(m, request({"query": {"access_token": "thom"}})), 401, "The access token provided has expired.");
		});
		const later = () => new Date(Date.now() + 60000);
		it("should expose the user id when setting userId", async () => {
			const m = {"getAccessToken": (t, cb) => cb(false, {"expires": later(), "userId": 1})};
			const r = await authorise(m, request({"query": {"access_token": "thom"}}));
			assert.deepStrictEqual(r.req.user, {"id": 1});
			assert.strictEqual(r.req.oauth.bearerToken.userId, 1);
		});
		it("should expose the user id when setting user object", async () => {
			const m = {"getAccessToken": (t, cb) => cb(false, {"expires": later(), "user": {"id": 1, "name": "thom"}})};
			const r = await authorise(m, request({"query": {"access_token": "thom"}}));
			assert.deepStrictEqual(r.req.user, {"id": 1, "name": "thom"});
		});

		// kept from 2.4.1 for compatibility (SOAJS contract)
		it("reads Bearer unanchored and case-sensitive", async () => {
			assert.strictEqual((await authorise(valid, request({"headers": {"Authorization": "xBearer thom"}}))).err, undefined);
			expectError(await authorise(valid, request({"headers": {"Authorization": "bearer thom"}})), 400, "Malformed auth header");
		});
		// SOAJS (intended change from 2.4.1): expires must be a valid Date
		it("refuses a token whose expires is missing, a string, a number or an invalid Date", async () => {
			const token = (expires) => ({"getAccessToken": (t, cb) => cb(false, expires === "missing" ? {} : {expires})});
			for (const expires of ["missing", "2099-01-01T00:00:00.000Z", Date.now() + 60000, new Date("nope")]) {
				expectError(await authorise(token(expires), request({"query": {"access_token": "x"}})), 401, "The access token provided has expired.");
			}
			assert.strictEqual((await authorise(token(new Date(Date.now() + 60000)), request({"query": {"access_token": "x"}}))).err, undefined);
		});
		it("answers a model error as server_error with its message", async () => {
			const m = {"getAccessToken": (t, cb) => cb(new Error("db down"))};
			expectError(await authorise(m, request({"query": {"access_token": "x"}})), 503, "db down");
		});
		it("answers an invalid token", async () => {
			expectError(await authorise(valid, request({"query": {"access_token": "nope"}})), 401, "The access token provided is invalid.");
		});
	});

	describe("Grant (2.4.1)", function () {
		const grant = (m, req, config) => run(oauth2server(Object.assign({"model": m, "grants": ["password", "refresh_token"]}, config || {})).grant(), req);
		const post = (form, headers) => request({"method": "POST", form, headers});

		it("should only allow post", async () => {
			expectError(await grant(model(), request({"method": "GET", "query": {"grant_type": "password"}})), 400,
				"Method must be POST with application/x-www-form-urlencoded encoding");
		});
		it("should only allow application/x-www-form-urlencoded", async () => {
			expectError(await grant(model(), request({"method": "POST", "body": {"grant_type": "password"}, "headers": {"content-type": "application/json"}})), 400,
				"Method must be POST with application/x-www-form-urlencoded encoding");
		});
		it("should check grant_type exists", async () => {
			expectError(await grant(model(), post({})), 400, "Invalid or missing grant_type parameter");
		});
		it("should ensure grant_type is allowed", async () => {
			expectError(await grant(model(), post({"grant_type": "password"}), {"grants": ["refresh_token"]}), 400, "Invalid or missing grant_type parameter");
		});
		it("should check client_id exists", async () => {
			expectError(await grant(model(), post({"grant_type": "password"})), 400, "Invalid or missing client_id parameter");
		});
		it("should check client_id matches regex", async () => {
			expectError(await grant(model(), post({"grant_type": "password", "client_id": "thom"}), {"clientIdRegex": /match/}), 400,
				"Invalid or missing client_id parameter");
		});
		it("should check client_secret exists", async () => {
			expectError(await grant(model(), post({"grant_type": "password", "client_id": "thom"})), 400, "Missing client_secret parameter");
		});
		it("should extract credentials from body", async () => {
			let seen;
			const m = model({"getClient": (id, secret, cb) => {
				seen = [id, secret];
				cb(false, false);
			}});
			expectError(await grant(m, post(Object.assign({"grant_type": "password"}, client))), 400, "Client credentials are invalid");
			assert.deepStrictEqual(seen, ["thom", "nightworld"]);
		});
		it("should extract credentials from header (Basic)", async () => {
			let seen;
			const m = model({"getClient": (id, secret, cb) => {
				seen = [id, secret];
				cb(false, false);
			}});
			await grant(m, post({"grant_type": "password"}, {"Authorization": basic("thom", "nightworld")}));
			assert.deepStrictEqual(seen, ["thom", "nightworld"]);
		});
		it("should detect unsupported grant_type", async () => {
			const r = await grant(model(), post(Object.assign({"grant_type": "password", "username": "thomseddon", "password": "nightworld"}, client)), {"grants": ["password", "magic"]});
			assert.strictEqual(r.err, undefined);
			expectError(await grant(model(), post(Object.assign({"grant_type": "magic"}, client)), {"grants": ["password", "magic"]}), 400,
				"Invalid grant_type parameter or parameter missing");
		});
		it("should detect invalid client", async () => {
			expectError(await grant(model(), post({"grant_type": "password", "client_id": "thom", "client_secret": "wrong"})), 400,
				"Client credentials are invalid");
		});
		it("should detect grant type not allowed", async () => {
			const m = model({"grantTypeAllowed": (id, type, cb) => cb(false, false)});
			expectError(await grant(m, post(Object.assign({"grant_type": "password"}, client))), 400, "The grant type is unauthorised for this client_id");
		});
		it("should allow override via model (generateToken)", async () => {
			const m = model({"generateToken": (type, req, cb) => cb(false, type === "accessToken" ? "thommy" : "refreshy")});
			const r = await grant(m, post(Object.assign({"grant_type": "password", "username": "thomseddon", "password": "nightworld"}, client)));
			assert.strictEqual(r.res.body.access_token, "thommy");
			assert.strictEqual(r.res.body.refresh_token, "refreshy");
		});
		it("should include client and user in request", async () => {
			let seen;
			const m = model({"generateToken": (type, req, cb) => {
				seen = {"client": req.oauth.client, "user": req.user};
				cb(false, "t");
			}});
			await grant(m, post(Object.assign({"grant_type": "password", "username": "thomseddon", "password": "nightworld"}, client)));
			assert.deepStrictEqual(seen, {"client": {"clientId": "thom"}, "user": {"id": 1}});
		});
		it("should reissue if model returns object", async () => {
			let saved = 0;
			const m = model({
				"generateToken": (type, req, cb) => cb(false, type === "accessToken" ? {"accessToken": "thommy"} : {"refreshToken": "refreshy"}),
				"saveAccessToken": (t, c, e, u, cb) => cb(saved++),
				"saveRefreshToken": (t, c, e, u, cb) => cb(saved++)
			});
			const r = await grant(m, post(Object.assign({"grant_type": "password", "username": "thomseddon", "password": "nightworld"}, client)));
			assert.strictEqual(r.res.body.access_token, "thommy");
			assert.strictEqual(saved, 0);
		});
		it("should pass valid params to model.saveAccessToken and model.saveRefreshToken", async () => {
			const calls = [];
			const m = model({
				"generateToken": (type, req, cb) => cb(false, type),
				"saveAccessToken": (t, c, e, u, cb) => {
					calls.push(["access", t, c, e, u]);
					cb();
				},
				"saveRefreshToken": (t, c, e, u, cb) => {
					calls.push(["refresh", t, c, e, u]);
					cb();
				}
			});
			const before = Date.now();
			await grant(m, post(Object.assign({"grant_type": "password", "username": "thomseddon", "password": "nightworld"}, client)),
				{"accessTokenLifetime": 3600, "refreshTokenLifetime": 1209600});
			assert.deepStrictEqual(calls.map((c) => [c[0], c[1], c[2], c[4]]), [["access", "accessToken", "thom", {"id": 1}], ["refresh", "refreshToken", "thom", {"id": 1}]]);
			const ms = (d) => d.getTime() - before;
			assert.ok(ms(calls[0][3]) >= 3599000 && ms(calls[0][3]) <= 3601000);
			assert.ok(ms(calls[1][3]) >= 1209599000 && ms(calls[1][3]) <= 1209601000);
		});
		it("should return an oauth compatible response", async () => {
			const m = model({"generateToken": (type, req, cb) => cb(false, "thommy")});
			const r = await grant(m, post(Object.assign({"grant_type": "password", "username": "thomseddon", "password": "nightworld"}, client)),
				{"grants": ["password"], "accessTokenLifetime": 3600});
			assert.deepStrictEqual(r.res.headers, {"Cache-Control": "no-store", "Pragma": "no-cache"});
			assert.strictEqual(JSON.stringify(r.res.body), '{"token_type":"bearer","access_token":"thommy","expires_in":3600}');
		});
		it("should return an oauth compatible response with refresh_token", async () => {
			const m = model({"generateToken": (type, req, cb) => cb(false, type === "accessToken" ? "thommy" : "refreshy")});
			const r = await grant(m, post(Object.assign({"grant_type": "password", "username": "thomseddon", "password": "nightworld"}, client)),
				{"accessTokenLifetime": 3600});
			assert.strictEqual(JSON.stringify(r.res.body), '{"token_type":"bearer","access_token":"thommy","expires_in":3600,"refresh_token":"refreshy"}');
		});
		it("should exclude expires_in if accessTokenLifetime = null", async () => {
			const m = model({"generateToken": (type, req, cb) => cb(false, "thommy")});
			let expires = "unset";
			m.saveAccessToken = (t, c, e, u, cb) => {
				expires = e;
				cb();
			};
			const r = await grant(m, post(Object.assign({"grant_type": "password", "username": "thomseddon", "password": "nightworld"}, client)),
				{"grants": ["password"], "accessTokenLifetime": null});
			assert.strictEqual(JSON.stringify(r.res.body), '{"token_type":"bearer","access_token":"thommy"}');
			assert.strictEqual(expires, null);
		});
		it("should continue after success response if continueAfterResponse = true", async () => {
			const r = await new Promise((resolve) => {
				const res = response();
				oauth2server({"model": model(), "grants": ["password"], "continueAfterResponse": true}).grant()(
					post(Object.assign({"grant_type": "password", "username": "thomseddon", "password": "nightworld"}, client)), res,
					(err) => resolve({err, res}));
			});
			assert.strictEqual(r.err, undefined);
			assert.ok(r.res.body.access_token);
		});
	});

	describe("Granting with password grant type (2.4.1)", function () {
		const grant = (m, form) => run(oauth2server({"model": m, "grants": ["password"]}).grant(), request({"method": "POST", form}));
		it("should detect missing parameters", async () => {
			expectError(await grant(model(), Object.assign({"grant_type": "password"}, client)), 400,
				'Missing parameters. "username" and "password" are required');
		});
		it("should detect invalid user", async () => {
			expectError(await grant(model(), Object.assign({"grant_type": "password", "username": "thomseddon", "password": "wrong"}, client)), 400,
				"User credentials are invalid");
		});
		it("answers a getUser error as server_error with its message", async () => {
			const m = model({"getUser": (u, p, cb) => cb(new Error("Unable to log in. Credential error or mismatch"))});
			expectError(await grant(m, Object.assign({"grant_type": "password", "username": "a", "password": "b"}, client)), 503,
				"Unable to log in. Credential error or mismatch");
		});
		// 2.4.1: the grant regex is case-insensitive, the grant switch is not
		it("detects a grant type in another case", async () => {
			expectError(await grant(model(), Object.assign({"grant_type": "PASSWORD", "username": "thomseddon", "password": "nightworld"}, client)), 400,
				"Invalid grant_type parameter or parameter missing");
		});
	});

	describe("Granting with refresh_token grant type (2.4.1)", function () {
		const grant = (m, form) => run(oauth2server({"model": m, "grants": ["password", "refresh_token"]}).grant(), request({"method": "POST", form}));
		const withRefresh = (token) => model({"getRefreshToken": (t, cb) => cb(false, token)});

		it("should detect missing refresh_token parameter", async () => {
			expectError(await grant(model(), Object.assign({"grant_type": "refresh_token"}, client)), 400, 'No "refresh_token" parameter');
		});
		it("should detect invalid refresh_token", async () => {
			expectError(await grant(withRefresh(false), Object.assign({"grant_type": "refresh_token", "refresh_token": "abc"}, client)), 400, "Invalid refresh token");
		});
		it("should detect wrong client id", async () => {
			expectError(await grant(withRefresh({"clientId": "kate"}), Object.assign({"grant_type": "refresh_token", "refresh_token": "abc"}, client)), 400,
				"Invalid refresh token");
		});
		it("should detect expired refresh token", async () => {
			expectError(await grant(withRefresh({"clientId": "thom", "expires": new Date(Date.now() - 1000)}),
				Object.assign({"grant_type": "refresh_token", "refresh_token": "abc"}, client)), 400, "Refresh token has expired");
		});
		it("should allow valid request", async () => {
			const r = await grant(withRefresh({"clientId": "thom", "expires": new Date(Date.now() + 60000), "userId": 123}),
				Object.assign({"grant_type": "refresh_token", "refresh_token": "abc"}, client));
			assert.strictEqual(r.err, undefined);
			assert.deepStrictEqual(r.req.user, {"id": 123});
		});
		it("should allow valid request with user object", async () => {
			const r = await grant(withRefresh({"clientId": "thom", "expires": new Date(Date.now() + 60000), "user": {"id": 123}}),
				Object.assign({"grant_type": "refresh_token", "refresh_token": "abc"}, client));
			assert.deepStrictEqual(r.req.user, {"id": 123});
		});
		// SOAJS (intended change from 2.4.1): expires must be a valid Date; 2.4.1 let a null,
		// a string or a missing expires never expire
		it("should refuse a refresh token whose expires is null, missing, a string or an invalid Date", async () => {
			for (const expires of [null, undefined, "2099-01-01T00:00:00.000Z", new Date("nope")]) {
				const token = {"clientId": "thom", "userId": 123};
				if (expires !== undefined) {
					token.expires = expires;
				}
				expectError(await grant(withRefresh(token), Object.assign({"grant_type": "refresh_token", "refresh_token": "abc"}, client)), 400,
					"Refresh token has expired");
			}
		});
		// as 2.4.1: the cause is a string, not an Error, so the message is the description, false
		it("answers a refresh token without a user as server_error", async () => {
			const r = await grant(withRefresh({"clientId": "thom", "expires": new Date(Date.now() + 60000)}), Object.assign({"grant_type": "refresh_token", "refresh_token": "abc"}, client));
			assert.ok(r.err instanceof OAuth2Error);
			assert.strictEqual(r.err.code, 503);
			assert.strictEqual(r.err.message, false);
		});
	});

	// SOAJS: the used refresh token is consumed before new tokens are issued
	describe("Consuming the refresh token (SOAJS)", function () {
		const refresh = {"clientId": "thom", "expires": new Date(Date.now() + 60000), "user": {"id": 1}};
		const grant = (m) => run(oauth2server({"model": m, "grants": ["password", "refresh_token"]}).grant(),
			request({"method": "POST", "form": Object.assign({"grant_type": "refresh_token", "refresh_token": "abc"}, client)}));

		it("issues new tokens when the model consumed the refresh token", async () => {
			const order = [];
			const m = model({
				"getRefreshToken": (t, cb) => cb(false, refresh),
				"consumeRefreshToken": (t, cb) => {
					order.push("consume " + t);
					cb(null, {"token": t});
				},
				"saveAccessToken": (t, c, e, u, cb) => {
					order.push("save");
					cb();
				}
			});
			const r = await grant(m);
			assert.strictEqual(r.err, undefined);
			assert.ok(r.res.body.access_token);
			assert.deepStrictEqual(order, ["consume abc", "save"]);
		});
		it("answers Invalid refresh token when another request consumed it first", async () => {
			let saved = false;
			const m = model({
				"getRefreshToken": (t, cb) => cb(false, refresh),
				"consumeRefreshToken": (t, cb) => cb(null, null),
				"saveAccessToken": (t, c, e, u, cb) => {
					saved = true;
					cb();
				}
			});
			expectError(await grant(m), 400, "Invalid refresh token");
			assert.strictEqual(saved, false, "no token is issued");
		});
		it("answers a consume error as server_error", async () => {
			const m = model({"getRefreshToken": (t, cb) => cb(false, refresh), "consumeRefreshToken": (t, cb) => cb(new Error("db down"))});
			expectError(await grant(m), 503, "db down");
		});
		it("lets exactly one of two concurrent uses win", async () => {
			let stored = {"token": "abc"};
			const m = model({
				"getRefreshToken": (t, cb) => setImmediate(() => cb(false, refresh)),
				"consumeRefreshToken": (t, cb) => setImmediate(() => {
					const consumed = stored;
					stored = null;
					cb(null, consumed);
				})
			});
			const results = await Promise.all([grant(m), grant(m)]);
			assert.strictEqual(results.filter((r) => !r.err).length, 1);
			expectError(results.find((r) => r.err), 400, "Invalid refresh token");
		});
		for (const failing of ["saveAccessToken", "saveRefreshToken"]) {
			it("puts the consumed refresh token back when " + failing + " fails", async () => {
				const restored = [];
				const m = model({
					"getRefreshToken": (t, cb) => cb(false, refresh),
					"consumeRefreshToken": (t, cb) => cb(null, {"token": t, "type": "refreshToken"}),
					"restoreRefreshToken": (record, cb) => {
						restored.push(record);
						cb();
					}
				});
				m[failing] = (t, c, e, u, cb) => cb(new Error("db blip"));
				expectError(await grant(m), 503, "db blip");
				assert.deepStrictEqual(restored, [{"token": "abc", "type": "refreshToken"}]);
			});
		}
		it("does not restore anything for the password grant", async () => {
			let restored = 0;
			const m = model({"restoreRefreshToken": (r, cb) => cb(restored++)});
			m.saveAccessToken = (t, c, e, u, cb) => cb(new Error("db blip"));
			const r = await run(oauth2server({"model": m, "grants": ["password"]}).grant(),
				request({"method": "POST", "form": Object.assign({"grant_type": "password", "username": "thomseddon", "password": "nightworld"}, client)}));
			expectError(r, 503, "db blip");
			assert.strictEqual(restored, 0);
		});
		it("does not call revokeRefreshToken (2.4.1's name)", async () => {
			const m = model({
				"getRefreshToken": (t, cb) => cb(false, refresh),
				"revokeRefreshToken": () => assert.fail("not called"),
				"consumeRefreshToken": (t, cb) => cb(null, {"token": t})
			});
			assert.strictEqual((await grant(m)).err, undefined);
		});
	});

	// SOAJS: the user lookup of the password grant is the request's
	describe("User lookup per request (SOAJS)", function () {
		it("uses req.oauth2GetUser, and two interleaved grants keep their own users", async () => {
			const m = model({"getUser": () => assert.fail("the model's getUser is not used")});
			const saved = [];
			m.saveAccessToken = (t, c, e, u, cb) => {
				saved.push(u.id);
				cb();
			};
			const oauth = oauth2server({"model": m, "grants": ["password"]});
			const req = (id, delay) => {
				const r = request({"method": "POST", "form": Object.assign({"grant_type": "password", "username": id, "password": "x"}, client)});
				r.oauth2GetUser = (u, p, cb) => setTimeout(() => cb(false, {"id": u}), delay);
				return r;
			};
			const [a, b] = await Promise.all([run(oauth.grant(), req("first", 30)), run(oauth.grant(), req("second", 1))]);
			assert.deepStrictEqual([a.req.user, b.req.user], [{"id": "first"}, {"id": "second"}]);
			assert.deepStrictEqual(saved.sort(), ["first", "second"]);
		});
		it("falls back to the model's getUser", async () => {
			const r = await run(oauth2server({"model": model(), "grants": ["password"]}).grant(),
				request({"method": "POST", "form": Object.assign({"grant_type": "password", "username": "thomseddon", "password": "nightworld"}, client)}));
			assert.deepStrictEqual(r.req.user, {"id": 1});
		});
	});

	// SOAJS: Basic parsed as basic-auth 0.0.1 did
	describe("Basic credentials (basic-auth 0.0.1 rules)", function () {
		const seen = (authorization, body) => new Promise((resolve) => {
			const m = model({"getClient": (id, secret, cb) => {
				resolve([id, secret]);
				cb(false, false);
			}});
			run(oauth2server({"model": m, "grants": ["password"]}).grant(),
				request({"method": "POST", "form": Object.assign({"grant_type": "password"}, body || {}), "headers": {"Authorization": authorization}}))
				.then((r) => resolve(r.err.message));
		});
		it("reads any case of the scheme and splits at the first colon", async () => {
			assert.deepStrictEqual(await seen("BASIC " + Buffer.from("thom:night:world").toString("base64")), ["thom", "night:world"]);
		});
		it("falls back to the body when the header is not Basic, or has no secret", async () => {
			assert.deepStrictEqual(await seen("Bearer x", client), ["thom", "nightworld"]);
			assert.deepStrictEqual(await seen("Basic " + Buffer.from("thom").toString("base64"), client), ["thom", "nightworld"]);
			assert.deepStrictEqual(await seen("Basic " + Buffer.from("thom:").toString("base64")), "Invalid or missing client_id parameter");
			assert.deepStrictEqual(await seen("Basic"), "Invalid or missing client_id parameter");
		});
	});

	describe("expired (SOAJS)", function () {
		it("is true unless expires is a valid Date after now", () => {
			const now = new Date();
			assert.strictEqual(oauth2server.expired(new Date(now.getTime() + 1000), now), false);
			for (const expires of [new Date(now.getTime() - 1000), null, undefined, "2099-01-01", 4102444800000, new Date("nope"), {}]) {
				assert.strictEqual(oauth2server.expired(expires, now), true, String(expires));
			}
		});
	});

	describe("OAuth2Error (2.4.1)", function () {
		it("should be an instance of `Error`", () => {
			assert.ok(new OAuth2Error("invalid_request", "desc") instanceof Error);
		});
		it("should expose the `message` as the description", () => {
			assert.strictEqual(new OAuth2Error("invalid_request", "description").message, "description");
		});
		it("should expose the `stack`", () => {
			assert.ok(new OAuth2Error("invalid_request").stack);
		});
		it("should expose a custom `name`", () => {
			assert.strictEqual(new OAuth2Error().name, "OAuth2Error");
		});
		it("should set cache `headers`", () => {
			assert.deepStrictEqual(new OAuth2Error("invalid_request").headers, {"Cache-Control": "no-store", "Pragma": "no-cache"});
		});
		it("should include WWW-Authenticate `header` if error is `invalid_client`", () => {
			assert.deepStrictEqual(new OAuth2Error("invalid_client").headers,
				{"Cache-Control": "no-store", "Pragma": "no-cache", "WWW-Authenticate": 'Basic realm="Service"'});
		});
		it("should expose a status `code`", () => {
			assert.strictEqual(new OAuth2Error("invalid_client").code, 400);
			assert.strictEqual(new OAuth2Error("invalid_grant").code, 400);
			assert.strictEqual(new OAuth2Error("invalid_token").code, 401);
			assert.strictEqual(new OAuth2Error("server_error").code, 503);
			assert.strictEqual(new OAuth2Error("other").code, 500);
		});
		it("should expose the `error`", () => {
			assert.strictEqual(new OAuth2Error("invalid_request").error, "invalid_request");
		});
		it("should expose the `error_description`", () => {
			assert.strictEqual(new OAuth2Error("invalid_request", "description").error_description, "description");
		});
		it("should expose the `stack` and `message` of a previous error", () => {
			const e = new Error("Bad");
			const err = new OAuth2Error("invalid_request", "description", e);
			assert.strictEqual(err.stack, e.stack);
			assert.strictEqual(err.message, "Bad");
		});
	});
});
