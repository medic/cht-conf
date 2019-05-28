const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));
PouchDB.plugin(require('pouchdb-find'));

module.exports = url => {
  const db = new PouchDB(url, { ajax: { timeout: 60000 } });

  db.getForms = (options) =>
      db.query('medic-client/forms', options)
        .catch(err => {
          if(err.status === 404) {
            if(err.reason === 'missing') throw new Error('Failed to find medic-client ddoc on server');
            if(err.reason === 'missing_named_view') throw new Error('Failed to find view "forms" in medic-client ddoc');
          }
          throw err;
        });

  return db;
};
