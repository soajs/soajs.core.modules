let provDb = db.getSiblingDB('core_provision');
//provDb.dropDatabase();

/* Tenants */
let files = listFiles('./products');
for (let i = 0; i < files.length; i++) {
    load(files[i].name);
}

provDb.products.drop();

let records = [];
records.push(testProduct);
provDb.products.insert(records);


/* Indexes for products */
provDb.products.createIndex({ code: 1 }, { unique: true });
provDb.products.createIndex({ 'packages.code': 1 });
