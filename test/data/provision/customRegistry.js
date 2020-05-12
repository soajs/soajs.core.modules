var provDb = db.getSiblingDB('core_provision');

var files = listFiles('./customRegistry');
for (var i = 0; i < files.length; i++) {
    load(files[i].name);
}

provDb.custom_registry.drop();

var records = [];
var index = 0;

records.push(custom_registry[index++]);

provDb.custom_registry.insert(records);

/* Indexes for products */
provDb.custom_registry.ensureIndex({ code: 1 }, { unique: true });