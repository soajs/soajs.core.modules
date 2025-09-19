let provDb = db.getSiblingDB('core_provision');
provDb.dropDatabase();

load('./environments/dev.js');
load('./environments/test.js');

provDb.environment.drop();

// Define the records from the loaded files
let records = [];
if (typeof dev !== 'undefined') {
    records.push(dev);
}
if (typeof test !== 'undefined') {
    records.push(test);
}

// Insert the records
if (records.length > 0) {
    provDb.environment.insertMany(records);
}

// Create an index on the 'code' field
provDb.environment.createIndex({ code: 1 }, { unique: true });