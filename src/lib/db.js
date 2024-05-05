const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const ArchivingDB = require('./archiving-db');
const environment = require('./environment');

module.exports = () => {
  if (environment.isArchiveMode) {
    return new ArchivingDB(environment.archiveDestination);
  }

  return new PouchDB(environment.apiUrl, {
    ajax: { timeout: 60000 },
    fetch: (url, opts) => {
      const sessionToken = environment.sessionToken;
      if (sessionToken) {
        opts.headers.set('Cookie', sessionToken);
        opts.credentials = 'include';
      }
      return PouchDB.fetch(url, opts);
    },
  });
};

