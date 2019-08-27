'use strict';

module.exports = {
    'errors': {
        '100': 'The provided key does not have the right number of characters.', //500
        '101': 'Problem with the length of the key.', //500
        '102': 'Log & Registry are needed for any service to function.', //500
        '103': 'The length of the generate ext key is bad.', //500

        '13x': "CONTROLLER",
        '130': "Unknown service.", //404
        '131': "Controller mw requires configuration to be the first param.", //500
        '132': "A valid key is needed to access any API.", //403
        '133': "The service you are trying to reach is not reachable at this moment.", //504
        '134': "All requests to the service you are trying to reach are timing out.", //504
        '135': "Error occurred while redirecting your request to the service", //503
        // '136': "Controller catched an error while redirecting to service.",
        '137': "Access Forbidden to requested environment", //401
        '138': "Access Forbidden to requested environment", //401
        '139': "Invalid or no Remote service requested.", //501
        '14x': "SERVICE CORE",
        '141': "Unable to start the service.", //500
        '142': "extKeyRequired is ON for this service, Make sure your request is going through soajs.controller and a key is in the header", //500
        '143': "invalid_request: Malformed auth header", //500

        '144': "The provided key cannot be used with this environment", //401
        '145': "You need to be logged in with pin to access this System.", //401
        '148': "Unable to load the key information", //500
        '149': "Unable to load the product package information", //500

        '150': "Something blew up @ service core!", //500
        '151': "You are trying to reach an unknown rest service!", //400
        '152': "Unable to load the product package information. Check provision configuration for this key.", //500
        '153': "Unable to load provision information for the provided key.", //500
        '154': "Access denied: The service is not available in your current package.", //401
        '155': "Geographic location forbidden", //403
        '156': "Device forbidden", //403
        '157': "You do not belong to a group with access to this System.", //401
        '158': "You need to be logged in to access this System.", //401
        '159': "System api access is restricted. api is not in provision.", //401
        '160': "You do not belong to a group with access to this system API.", //401
        '161': "You need to be logged in to access this API.", //401
        '162': "Unable to initialize the multi tenant session.", //500
        '163': "Error in persisting the session", //500
        '164': "Unknown error @ rest core!", //500
        '165': "Roaming: Unable to login roamed user!", //500
        '166': "Roaming: Something blew up @ service core!", //500
        '167': "Roaming: Unable to load you product package information. Check provision configuration for this key.", //500
        '168': "Roaming: Unable to load provision information for the provided key.", //500
        '169': "Roaming: Unable to find any logged in user to roam!", //500
        '170': "Roaming: Unable to load registry for roam to env", //500

        '17x': "INPUTMASK", //400

        '19x': "MONGO",
        '190': 'Unable to build needed url for mongo to connect.', //500
        '191': 'collection name is required.', //500
        "192": "Invalid record provided to Mongo", //500
        "193": "Unable to find the record to version it", //500
        "194": "Invalid record version provided to Mongo", //500
        "195": "Invalid DB Config. please send a valid DB config to MongoDriver's constructor", //500
        "196": "Invalid ES Config. please send a valid ES config to ESDriver's constructor", //500

        '20x': "PROVISION",
        '200': 'You need to provide an external key.', //403
        '201': 'You need to provide a package code.', //500
        '202': 'Unable to load tenant keys data.', //500
        '203': 'Unable to generate external key from provided key.', //500
        '204': 'Unable to generate internal key.', //500
        '205': 'You need to provide a tenant ID.', //500
        '206': "Unable to load provision information for the provided tenant ID.", //500
        '207': "Unable to load provisioned information for the provided env code", //500
        '208': "Protocol, Domain and Port are needed, make sure they are set at registry", //500
        '209': 'You need to provide an array of package codes.' //500
    },
    'status': {
        '130': '404',
        '132': '403',
        '133': '504',
        '134': '504',
        '135': '503',
        '137': '401',
        '138': '401',
        '139': '501',
        '144': '401',
        '145': '401',
        '151': '400',
        '154': '401',
        '155': '403',
        '156': '403',
        '157': '401',
        '158': '401',
        '159': '401',
        '160': '401',
        '161': '401',
        '200': '403'
    }
};