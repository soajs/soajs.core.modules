let provDb = db.getSiblingDB('core_provision');

/* oAuth URAC */
let files = listFiles('./oauth');
for (let i = 0; i < files.length; i++) {
    load(files[i].name);
}

provDb.oauth_urac.drop();

let records = [];
records.push(oauthuser);
provDb.oauth_urac.insert(records);
