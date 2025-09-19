let provDb = db.getSiblingDB('core_provision');

load('./resources/resources.js');

provDb.resources.drop();

let records = [];
let index = 0;

// Push the loaded objects to the array
if (typeof resources !== 'undefined' && resources.length > 0) {
    records.push(resources[index++]);
    records.push(resources[index++]);
    records.push(resources[index++]);
    records.push(resources[index++]);
}

// Use insertMany() which is the modern method for bulk inserts
if (records.length > 0) {
    provDb.resources.insertMany(records);
}

/* Indexes for products */
provDb.resources.createIndex({ code: 1 }, { unique: true });