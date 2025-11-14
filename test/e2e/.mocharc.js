const rootConfig = require('../../.mocharc');

module.exports = {
  ...rootConfig,
  captureFile: 'test/e2e/results.txt',
  checkLeaks: true,
  exclude: [],
  file: 'test/e2e/hooks.js',
  spec: 'test/e2e/**/*.spec.js',
  timeout: 120_000, // spinning up a CHT instance takes a little long
};
