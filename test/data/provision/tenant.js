let provDb = db.getSiblingDB('core_provision');

/* Tenants */
// Explicitly load the tenant file(s) as listFiles is not available
load('./tenants/test.js'); 

provDb.tenants.drop();

let records = [];
// Check if the loaded variable 'test' is defined before pushing it
if (typeof test !== 'undefined') {
    records.push(test);
}

// Use insertMany() for inserting an array of records
if (records.length > 0) {
    provDb.tenants.insertMany(records);
}


/* Indexes for tenants */
provDb.tenants.createIndex({ code: 1 }, { unique: true });
provDb.tenants.createIndex({ 'applications.appId': 1 });
provDb.tenants.createIndex({ 'applications.keys.key': 1 });