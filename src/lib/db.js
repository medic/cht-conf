const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

module.exports = url => new PouchDB(url, { ajax: { timeout: 60000 } });
