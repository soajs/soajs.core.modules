'use strict';


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
                            for (let ver in packACL[env][service]) {
                                if (scopeACL[env][service][ver] && (Object.hasOwnProperty.call(packACL[env][service], ver))) {
                                    ACL[env][service][ver] = {};

                                    if (scopeACL[env][service][ver].hasOwnProperty('access'))
                                        ACL[env][service][ver].access = scopeACL[env][service][ver].access;
                                    if (scopeACL[env][service][ver].hasOwnProperty('apisPermission'))
                                        ACL[env][service][ver].apisPermission = scopeACL[env][service][ver].apisPermission;

                                    for (let method in packACL[env][service][ver]) {
                                        if (scopeACL[env][service][ver][method] && (Object.hasOwnProperty.call(packACL[env][service][ver], method))) {
                                            ACL[env][service][ver][method] = {};
                                            for (let i=0; i < packACL[env][service][ver][method].length; i++){
                                                let apigroup = packACL[env][service][ver][method][i];
                                                console.log(apigroup)
                                                if (scopeACL[env][service][ver][method].hasOwnProperty(apigroup)) {
                                                    if (scopeACL[env][service][ver][method][apigroup].hasOwnProperty('apis'))
                                                        ACL[env][service][ver][method].apis = scopeACL[env][service][ver][method][apigroup].apis;
                                                    if (scopeACL[env][service][ver][method][apigroup].hasOwnProperty('apisRegExp'))
                                                        ACL[env][service][ver][method].apisRegExp = scopeACL[env][service][ver][method][apigroup].apisRegExp;
                                                    if (scopeACL[env][service][ver][method][apigroup].hasOwnProperty('apisPermission'))
                                                        ACL[env][service][ver][method].apisPermission = scopeACL[env][service][ver][method][apigroup].apisPermission;
                                                }
                                            }
                                        }
                                    }
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