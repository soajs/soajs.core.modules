let provDb = db.getSiblingDB('core_provision');
provDb.dropDatabase();

let files = listFiles('./environments');
for (let i = 0; i < files.length; i++) {
    load(files[i].name);
}

provDb.environment.drop();

let records = [];
records.push(dev);
records.push(test);
provDb.environment.insert(records);

/* Indexes for products */
provDb.environment.createIndex({ code: 1 }, { unique: true });
