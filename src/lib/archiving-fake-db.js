/*
ArchivingFakeDB provides a fake database connection which allows medic-conf to run when API is not available via --archive mode.
Instead of making all actions aware of the --archive mode, a fake database connection returns the same response that an empty database would return.
Data that would upload to API is saved to disk as an archive which the API can consume and deploy.
This class implements the interfaces from the PouchDB object which are used by medic-conf actions.
*/
const path = require('path');

const archiveDocToFile = require('./archive-doc-to-file');

class ArchivingFakeDB {
  constructor(options = {}) {
    this.options = Object.assign({
      destination: path.resolve(__dirname, 'archive'),
    }, options);
  }

  allDocs() {
    throw Error('not supported in --archive mode');
  }

  bulkDocs(docs) {
    docs.forEach(doc => archiveDocToFile(this.options.destination, doc._id, doc));
    return Promise.resolve(docs.map(doc => ({ id: doc._id })));
  }

  get description() {
    return this.options.destination;
  }

  get() {
    const error = Error('Document does not exist');
    error.status = 404;
    return Promise.reject(error);
  }

  put(doc) {
    archiveDocToFile(this.options.destination, doc._id, doc);
  }

  query() {
    throw Error('not supported in --archive mode');
  }

  remove() {
    throw Error('not supported in --archive mode');
  }
}

module.exports = ArchivingFakeDB;
