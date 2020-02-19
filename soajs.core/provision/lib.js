'use strict';

function convert_scope_method_acl(tempScopeCursor, method, j, ACL) {
	if (tempScopeCursor[method][j].hasOwnProperty('apis')) {
		if (ACL[method].apis) {
			for (let api in tempScopeCursor[method][j].apis) {
				if (tempScopeCursor[method][j].apis.hasOwnProperty(api))
					ACL[method].apis[api] = tempScopeCursor[method][j].apis[api];
			}
		}
		else
			ACL[method].apis = tempScopeCursor[method][j].apis;
	}
	if (tempScopeCursor[method][j].hasOwnProperty('apisRegExp')) {
		if (ACL[method].apisRegExp) {
			for (let api in tempScopeCursor[method][j].apisRegExp) {
				if (tempScopeCursor[method][j].apisRegExp.hasOwnProperty(api))
					ACL[method].apisRegExp[api] = tempScopeCursor[method][j].apisRegExp[api];
			}
		}
		else
			ACL[method].apisRegExp = tempScopeCursor[method][j].apisRegExp;
	}
}

function getACL(tempScope, tempPack) {
	let tempScopeCursor = JSON.parse(JSON.stringify(tempScope));
	let tempPackCursor = JSON.parse(JSON.stringify(tempPack));
	let ACL = {};
	if (tempScopeCursor.hasOwnProperty('access')) {
		ACL.access = tempScopeCursor.access;
	}
	let found_methods_in_package = 0;
	let found_methods_in_scope = 0;
	for (let method in tempPackCursor) {
		if (method !== "version") {
			if (tempScopeCursor[method] && (Object.hasOwnProperty.call(tempPackCursor, method))) {
				if (!ACL[method])
					ACL[method] = {};
				for (let i = 0; i < tempPackCursor[method].length; i++) {
					found_methods_in_package++;
					let apigroup = tempPackCursor[method][i];
					for (let j = 0; j < tempScopeCursor[method].length; j++) {
						if (tempScopeCursor[method][j].group === apigroup) {
							convert_scope_method_acl(tempScopeCursor, method, j, ACL);
							break;
						}
					}
				}
			}
		}
	}
	if (found_methods_in_package === 0) {
		for (let method in tempScopeCursor) {
			if (method !== "access" && method !== "apisPermission" && method !== "packagesPermission") {
				ACL[method] = {};
				for (let j = 0; j < tempScopeCursor[method].length; j++) {
					found_methods_in_scope++;
					convert_scope_method_acl(tempScopeCursor, method, j, ACL);
				}
			}
		}
	}
	
	if (tempScopeCursor.hasOwnProperty('apisPermission')) {
		ACL.apisPermission = tempScopeCursor.apisPermission;
	} else {
		if (tempScopeCursor.hasOwnProperty('packagesPermission')) {
			if (found_methods_in_package > 0) {
				ACL.apisPermission = "restricted";
			}
		}
	}
	return ACL;
}

module.exports = {
	"getACLFromScope": function (scopeACL, packACL) {
		let ACL = null;
		if (packACL && scopeACL) {
			ACL = {};
			for (let env in packACL) {
				if (scopeACL[env] && (Object.hasOwnProperty.call(packACL, env))) {
					ACL[env] = {};
					for (let service in packACL[env]) {
						if (scopeACL[env][service] && (Object.hasOwnProperty.call(packACL[env], service))) {
							ACL[env][service] = {};
							for (let i = 0; i < packACL[env][service].length; i++) {
								
								if (packACL[env][service][i].version) {
									let version = packACL[env][service][i].version;
									if (scopeACL[env][service][version]) {
										ACL[env][service][version] = getACL(scopeACL[env][service][version], packACL[env][service][i]);
									}
								}
								else {
									ACL[env][service] = getACL(scopeACL[env][service], packACL[env][service][i]);
								}
							}
						}
					}
				}
			}
			return ACL;
		}
		return null
	}
};