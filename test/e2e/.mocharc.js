const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
chai.use(chaiAsPromised);

module.exports = {
  allowUncaught: false,
  color: true,
  checkLeaks: true,
  fullTrace: true,
  asyncOnly: false,
  spec: ['test/e2e/**/*.spec.js'],
  timeout: 300_000, // increased from 120s → 300s
  reporter: 'spec',
  file: ['test/e2e/hooks.js'],
  captureFile: 'test/e2e/results.txt',
  exit: true,
  recursive: true,
};
