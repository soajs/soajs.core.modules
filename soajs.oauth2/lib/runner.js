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

/**
 * Run through the sequence of functions
 *
 * @param  {Function} next
 * @public
 */
function runner(fns, context, next) {
	let last = fns.length - 1;

	(function run(pos) {
		fns[pos].call(context, function (err) {
			if (err || pos === last) {
				return next(err);
			}
			run(++pos);
		});
	})(0);
}

module.exports = runner;
