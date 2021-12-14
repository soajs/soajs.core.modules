let provDb = db.getSiblingDB('core_provision');

let files = listFiles('./customRegistry');
for (let i = 0; i < files.length; i++) {
    load(files[i].name);
}

provDb.custom_registry.drop();

let records = [];
let index = 0;

records.push(customRegistry[index++]);

provDb.custom_registry.insert(records);

/* Indexes for products */
provDb.custom_registry.createIndex({ code: 1 }, { unique: true });
