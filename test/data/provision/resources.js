var provDb = db.getSiblingDB('core_provision');

var files = listFiles('./resources');
for (var i = 0; i < files.length; i++) {
    load(files[i].name);
}

provDb.resources.drop();

var records = [];
var index = 0;

records.push(resources[index++]);
records.push(resources[index++]);
records.push(resources[index++]);
records.push(resources[index++]);
provDb.resources.insert(records);

/* Indexes for products */
provDb.resources.ensureIndex({ code: 1 }, { unique: true });