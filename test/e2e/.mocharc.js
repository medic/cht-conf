const rootConfig = require('../../.mocharc');

module.exports = {
  ...rootConfig,
  captureFile: 'test/e2e/results.txt',
  checkLeaks: true,
  exclude: process.env.RUN_GOOGLE_TESTS === 'true' ? [] : ['test/e2e/fetch-forms-from-google-drive.spec.js'], // Do not run Google tests locally by default
  file: 'test/e2e/hooks.js',
  spec: 'test/e2e/**/*.spec.js',
  timeout: 120_000, // spinning up a CHT instance takes a little long
};
