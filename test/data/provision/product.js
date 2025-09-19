let provDb = db.getSiblingDB('core_provision');

load('./products/testProduct.js'); 

provDb.products.drop();

let records = [];
if (typeof testProduct !== 'undefined') {
    records.push(testProduct);
}

// Use insertMany() for inserting an array of records
if (records.length > 0) {
    provDb.products.insertMany(records);
}

/* Indexes for products */
provDb.products.createIndex({ code: 1 }, { unique: true });
provDb.products.createIndex({ 'packages.code': 1 });