let provDb = db.getSiblingDB('core_provision');

let files = listFiles('./resources');
for (let i = 0; i < files.length; i++) {
    load(files[i].name);
}

provDb.resources.drop();

let records = [];
let index = 0;

records.push(resources[index++]);
records.push(resources[index++]);
records.push(resources[index++]);
records.push(resources[index++]);
provDb.resources.insert(records);

/* Indexes for products */
provDb.resources.createIndex({ code: 1 }, { unique: true });
