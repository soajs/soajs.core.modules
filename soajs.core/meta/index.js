"use strict";

/**
 * @license
 * Copyright SOAJS All Rights Reserved.
 *
 * Use of this source code is governed by an Apache license that can be
 * found in the LICENSE file at the root of this repository
 */

module.exports = {
	tenantDB: function (metaDB, systemName, tenantCode) {
		let dbConfig = {};
		if (tenantCode && systemName && metaDB && metaDB[systemName] && metaDB[systemName].name) {
			dbConfig = {
				"name": metaDB[systemName].name.replace('#TENANT_NAME#', tenantCode),
				"prefix": metaDB[systemName].prefix,
				"servers": metaDB[systemName].servers,
				"credentials": metaDB[systemName].credentials,
				"streaming": metaDB[systemName].streaming,
				"URLParam": metaDB[systemName].URLParam
			};
			if (metaDB[systemName].protocol) {
				dbConfig.protocol = metaDB[systemName].protocol;
			}
			if (metaDB[systemName].extraParam) {
				dbConfig.extraParam = metaDB[systemName].extraParam;
			}
			if (metaDB[systemName].registryLocation) {
				dbConfig.registryLocation = metaDB[systemName].registryLocation;
			}
		}
		return dbConfig;
	}
};