/**
 * ArchivingDB allows cht-conf to run when API is not available. Instead of making all actions aware of
 * the --archive mode, this database returns mocked response that an empty database would return.
 *
 * Data that would upload to API is saved to disk as an archive. The API uses one such archive when
 * it starts to deploy a default configuration.
 *
 * So this class implements the interfaces from the PouchDB class which are used by cht-conf actions,
 * and when cht-conf is executed with the `--archive` flag, this implementation is used instead
 * of PouchDB.
 *
 * Archive mode is used by the default grant task in the CHT, see the `exec:build-config`
 * task at the https://github.com/medic/cht-core/blob/master/Gruntfile.js file.
 */

const archiveDocToFile = require('./archive-doc-to-file');

class ArchivingDB {
  constructor(destination) {
    this.destination = destination;
  }

  allDocs() {
    throw Error('not supported in --archive mode');
  }

  bulkDocs(docs) {
    docs.forEach(doc => archiveDocToFile(this.destination, doc._id, doc));
    return Promise.resolve(docs.map(doc => ({ id: doc._id })));
  }

  get couchUrl() {
    return this.destination;
  }

  get() {
    const error = Error('Document does not exist');
    error.status = 404;
    return Promise.reject(error);
  }

  put(doc) {
    archiveDocToFile(this.destination, doc._id, doc);
  }

  query() {
    throw Error('not supported in --archive mode');
  }

  remove() {
    throw Error('not supported in --archive mode');
  }
}

module.exports = ArchivingDB;
