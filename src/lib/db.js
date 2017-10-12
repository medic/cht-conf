const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));

module.exports = url => new PouchDB(url, { ajax: { timeout: 60000 } });
