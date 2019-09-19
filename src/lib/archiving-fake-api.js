const path = require('path');

const archiveDocToFile = require('./archive-doc-to-file');

class ArchivingFakeAPI {
  constructor(options = {}) {
    this.options = Object.assign({
      destination: path.resolve(__dirname, 'archive'),
    }, options);
  }

  createUser() {
    throw Error('not supported in --archive mode');
  }

  get description() {
    return this.options.destination;
  }

  get appSettings() {
    return {
      get: () => { throw Error('not supported in --archive mode'); },

      update: (content) => {
        archiveDocToFile(this.options.destination, 'settings', content);
        return Promise.resolve('{ "success": true }');
      },
    };
  }

  uploadSms() {
    throw Error('not supported in --archive mode');
  }

  version() {
    return '1000.0.0'; // assume the latest version when archiving
  }
}

module.exports = ArchivingFakeAPI;
