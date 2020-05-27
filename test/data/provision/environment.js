var provDb = db.getSiblingDB('core_provision');
provDb.dropDatabase();

var files = listFiles('./environments');
for (var i = 0; i < files.length; i++) {
    load(files[i].name);
}

provDb.environment.drop();

var records = [];
records.push(dev);
records.push(test);
provDb.environment.insert(records);

/* Indexes for products */
provDb.environment.ensureIndex({ code: 1 }, { unique: true });