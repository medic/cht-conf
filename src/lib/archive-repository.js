/*
ArchiveRepository is an implementation of the repository data access layer which allows medic-conf to run when API is not available.
Data that would upload to API is saved to disk as an archive which the API can consume and deploy.

Assumptions when API does run:
* it will be running the latest version
* couchDB is empty
*/
const fs = require('fs');
const path = require('path');

class ArchiveRepository {
  constructor(options = {}) {
    this.options = Object.assign({
      destination: path.resolve(__dirname, 'archive'),
    }, options);
  }

  allDocs() {
    return { rows: [] };
  }

  bulkDocs(docs) {
    docs.forEach(doc => save(this.options.destination, doc._id, doc));
    return Promise.resolve(docs.map(doc => ({ id: doc._id })));
  }

  createUser() {
    throw Error('not supported in --archive mode');
  }

  async descendantsOf() {
    throw Error('not supported in --archive mode');
  }

  get description() {
    return this.options.destination;
  }

  formsList() {
    return Promise.resolve({ rows: [] });
  }

  get() {
    const error = Error('Document does not exist');
    error.status = 404;
    return Promise.reject(error);
  }
  
  insertOrReplace(doc) {
    save(this.options.destination, doc._id, doc);
    return Promise.resolve();
  }

  put(doc) {
    save(this.options.destination, doc._id, doc);
  }

  remove() {
    throw Error('not supported in --archive mode');
  }

  async reportsCreatedBy() {
    throw Error('not supported in --archive mode');
  }

  requestAppSettings() {
    throw Error('not supported in --archive mode');
  }
 
  updateAppSettings(content) {
    save(this.options.destination, 'settings', content);
    return Promise.resolve('{ "success": true }');
  }

  uploadSms() {
    throw Error('not supported in --archive mode');
  }

  version() {
    return '1000.0.0'; // assume the latest version when archiving
  }
}

const save = (folderPath, fileName, content) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }

  const destination = path.resolve(folderPath, fileName);
  const fileContent = typeof content === 'string' ? content : JSON.stringify(content);
  fs.writeFileSync(destination, fileContent);
};

module.exports = ArchiveRepository;
