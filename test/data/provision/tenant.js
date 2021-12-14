let provDb = db.getSiblingDB('core_provision');
//provDb.dropDatabase();

/* Tenants */
let files = listFiles('./tenants');
for (let i = 0; i < files.length; i++) {
    load(files[i].name);
}

provDb.tenants.drop();

let records = [];
records.push(test);
provDb.tenants.insert(records);


/* Indexes for tenants */
provDb.tenants.createIndex({ code: 1 }, { unique: true });
provDb.tenants.createIndex({ 'applications.appId': 1 } );
provDb.tenants.createIndex({ 'applications.keys.key': 1 } );
