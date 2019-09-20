const api = require('./api');
const archiveDocToFile = require('./archive-doc-to-file');
const environment = require('./environment');

const archivingApi = {
  get appSettings() {
    return {
      get: () => { throw Error('not supported in --archive mode'); },

      update: (content) => {
        archiveDocToFile(environment.archiveDestination, 'settings', content);
        return Promise.resolve('{ "success": true }');
      },
    };
  },

  version() {
    return '1000.0.0'; // assume the latest version when archiving
  },
};

Object.keys(api).forEach(key => {
  if (!archivingApi[key]) {
    archivingApi[key] = () => { throw Error('not supported in --archive mode'); };
  }
});

module.exports = archivingApi;
