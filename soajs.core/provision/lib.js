'use strict';


function getACL(tempScopeCursor, tempPackCursor) {
    let ACL = {};
    if (tempScopeCursor.hasOwnProperty('access'))
        ACL.access = tempScopeCursor.access;
    if (tempScopeCursor.hasOwnProperty('apisPermission'))
        ACL.apisPermission = tempScopeCursor.apisPermission;

    for (let method in tempPackCursor) {
        if (method !== "version") {
            if (tempScopeCursor[method] && (Object.hasOwnProperty.call(tempPackCursor, method))) {
                ACL[method] = {};
                for (let i = 0; i < tempPackCursor[method].length; i++) {
                    let apigroup = tempPackCursor[method][i];
                    for (let j = 0; j < tempScopeCursor[method].length; j++) {
                        if (tempScopeCursor[method][j].group === apigroup) {
                            if (tempScopeCursor[method][j].hasOwnProperty('apis'))
                                ACL[method].apis = tempScopeCursor[method][j].apis;
                            if (tempScopeCursor[method][j].hasOwnProperty('apisRegExp'))
                                ACL[method].apisRegExp = tempScopeCursor[method][j].apisRegExp;
                            if (tempScopeCursor[method][j].hasOwnProperty('apisPermission'))
                                ACL[method].apisPermission = tempScopeCursor[method][j].apisPermission;
                        }
                    }
                }
            }
        }
    }
    return ACL;
}

module.exports = {
    "getACLFromScope": function (scopeACL, packACL) {
        let ACL = null;
        if (packACL) {
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