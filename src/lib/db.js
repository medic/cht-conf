const PouchDB = require('pouchdb');

module.exports = url => new PouchDB(url, { ajax: { timeout: 60000 } });
