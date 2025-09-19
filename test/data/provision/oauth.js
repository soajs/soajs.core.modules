let provDb = db.getSiblingDB('core_provision');

load('./oauth/oauthuser.js'); 

provDb.oauth_urac.drop();

let records = [];
if (typeof oauthuser !== 'undefined') {
    records.push(oauthuser);
}

// use insertMany() for inserting an array of records
if (records.length > 0) {
    provDb.oauth_urac.insertMany(records);
}