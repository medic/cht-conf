const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const ArchivingDB = require('./archiving-db');
const environment = require('./environment');
const nools = require('./nools-utils');

module.exports = () => {
  if (environment.isArchiveMode) {
    return new ArchivingDB(environment.archiveDestination);
  }
  const headers = nools.sessionTokenHeader(environment);
  return new PouchDB(environment.apiUrl, { ajax: { timeout: 60000, headers } });
};

