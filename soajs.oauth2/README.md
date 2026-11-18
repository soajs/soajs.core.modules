# soajs.oauth2

OAuth 2 for SOAJS: `authorise()` for the gateway and `grant()` for the oauth service (password and refresh_token). It is ported from node-oauth2-server 2.4.1 under the Apache License 2.0; see [NOTICE](NOTICE) for what changed.

```js
const oauth2 = require("soajs.core.modules").oauth2;   // or require("soajs").oauth2
const oauth = oauth2({
	model,                    // soajs.provision.oauthModel
	grants: ["password", "refresh_token"],
	debug: false,
	accessTokenLifetime: 7200,
	refreshTokenLifetime: 1209600,
	continueAfterResponse: false
});
app.use(oauth.authorise());           // the gateway
app.post("/token", (req, res, next) => {
	req.oauth2GetUser = (username, password, cb) => { /* this request's lookup */ };
	next();
}, oauth.grant());                     // the oauth service
```

Errors go to `next(err)` as `OAuth2Error` with `code` (the HTTP status), `message`, `error` and `error_description`. The SOAJS error handlers send `code` and `message`; clients depend on them byte for byte (see the contract tests in soajs.controller and soajs.oauth).

## Intended changes from 2.4.1

- **Expiry.** A token's `expires` must be a valid Date. An access token whose `expires` is `null`, a string, missing or an invalid Date answers 401 `The access token provided has expired.`; a refresh token in that case answers 400 `Refresh token has expired`. 2.4.1 let `null`, a string and an invalid Date never expire. `expired(expires, now)` is exported for the gateway's other token checks (MCP). With this rule, `accessTokenLifetime` or `refreshTokenLifetime` `null` (tokens saved with `expires: null`) gives tokens that are refused: SOAJS always sets both lifetimes.

- **Concurrent refresh token reuse.** The refresh grant revokes the used refresh token (`model.revokeRefreshToken(token, cb(err, removed))`) before it issues new tokens. When the model did not remove it, another request used it first, and this one answers 400 `Invalid refresh token`. Exactly one concurrent use wins. 2.4.1 issued new tokens to every request that read the token before it was deleted.
- **User lookup per request.** The password grant uses `req.oauth2GetUser(username, password, cb)` when the request sets it, else `model.getUser`. A shared model is never changed between requests.
- Only `authorise()`, `grant()` with the password and refresh_token grants, and `OAuth2Error` are kept. The authorization code, client credentials and extended grants, `errorHandler`, `lockdown` and `bypass` are not.
- The Basic authorization header is parsed here, with the rules of basic-auth 0.0.1.

## By design

- **Client credentials** come from the Basic header when it is valid, else from the body. The oauth service identifies the client by the tenant's key: it sets the header from the tenant before the grant, so a `client_secret` in the body is not used, and a wrong one does not fail the grant.

## Kept for compatibility

These answers are 2.4.1's and clients may rely on them. Do not change them.

- **Messages, codes and statuses** are 2.4.1's, including the two spaces in `Only one method may be used to authenticate at a time (Auth header,  GET or POST).`, and a model error's own message with code 503.
- **Bearer** is matched with `/Bearer\s(\S+)/`: unanchored (`xBearer <token>` passes) and case-sensitive (`bearer <token>` is `Malformed auth header`).
- **A token in the body** is only read by `authorise()` when the request body is parsed. The SOAJS gateway does not parse it, so it answers `The access token was not found` for a token sent in the body only.
- **The grant type** is checked case-insensitively against `grants`, then case-sensitively by the grant: `PASSWORD` answers `Invalid grant_type parameter or parameter missing`. On the oauth service, input validation (172/173) answers before the grant.
- **Client id** must match `/^[a-z0-9-_]{3,40}$/i`, and the client secret must not be empty.
- **A refresh token without a user** answers 503 with `message` `false`.
- **The token response** is `res.jsonp({token_type, access_token, expires_in, refresh_token})` with `Cache-Control: no-store` and `Pragma: no-cache`. `expires_in` is left out when `accessTokenLifetime` is `null`, and `refresh_token` when `refresh_token` is not in `grants`.

On the oauth service, outside this module and kept as well:

- a refresh with another `device-id` answers 413, and that refresh token is then no longer usable;
- bad `grant_type` values are refused by the service's input validation (172/173, HTTP 500) before the grant.
