const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));
PouchDB.plugin(require('pouchdb-session-authentication'));

const ArchivingDB = require('./archiving-db');
const environment = require('./environment');

module.exports = () => {
  if (environment.isArchiveMode) {
    return new ArchivingDB(environment.archiveDestination);
  }

  return new PouchDB(environment.apiUrl, {
    ajax: { timeout: 60000 },
    session: environment.sessionToken,
  });
};
