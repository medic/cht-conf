const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const ArchivingFakeDB = require('./archiving-fake-db');
const { isArchiveUrl } = require('./api-url');

module.exports = url => {
  if (isArchiveUrl(url)) {
    return new ArchivingFakeDB(url);
  }
  
  return new PouchDB(url, { ajax: { timeout: 60000 } });
};

