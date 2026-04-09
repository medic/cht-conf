const { clearCache } = require('../src/lib/get-api-version');

exports.mochaHooks = {
  afterEach() {
    clearCache();
  }
};
