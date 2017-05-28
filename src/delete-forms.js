const fs = require('./sync-fs');
const PouchDB = require('pouchdb');

const backupFileFor = require('./backup-file-for');

module.exports = couchUrl => {
  const db = new PouchDB(couchUrl);

  const doc = res => ({ _id:res.id, _rev:res.rev });

  return db.query('medic-client/forms', { include_docs:true })
    .then(res => res.rows)
    .then(forms => Promise.all(forms.map(f => db.remove(f.doc))));
};
