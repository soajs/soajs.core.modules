let provDb = db.getSiblingDB('core_provision');

load('./customRegistry/test.js');

provDb.custom_registry.drop();

let records = [];
let index = 0;

if (typeof customRegistry !== 'undefined' && customRegistry.length > 0) {
    records.push(customRegistry[index++]);
}

// Use insertMany() which is the modern method for bulk inserts
if (records.length > 0) {
    provDb.custom_registry.insertMany(records);
}

/* Indexes for products */
provDb.custom_registry.createIndex({ code: 1 }, { unique: true });