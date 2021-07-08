/**
 * archivingApi allows cht-conf to run when API is not available. Instead of making all actions aware of
 * the --archive mode, this API returns mocked response that mimic successful actions.
 *
 * Data that would upload to API is saved to disk as an archive. The API uses one such archive when
 * it starts to deploy a default configuration.
 *
 * So this module implements some methods from the ./api.js module which are used by cht-conf actions,
 * and when cht-conf is executed with the `--archive` flag, this implementation is used instead
 * of ./api.js.
 *
 * See ./archiving-api.js
 */

const archiveDocToFile = require('./archive-doc-to-file');
const environment = require('./environment');

const archivingApi = {
  updateAppSettings: (content) => {
    archiveDocToFile(environment.archiveDestination, 'settings', content);
    return Promise.resolve('{ "success": true }');
  },

  version() {
    return '1000.0.0'; // assume the latest version when archiving
  },

  formsValidate: () => {
    // There is no need to validate the forms
    // in --archive mode, so the forms are
    // considered valid
    return Promise.resolve({ok: true});
  },

  async getCompressibleTypes () {
    return [];
  }
};

module.exports = archivingApi;
