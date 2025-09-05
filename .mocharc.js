const chai = require('chai');
chai.use(require('chai-as-promised'));
chai.use(require('chai-exclude'));
chai.use(require('chai-shallow-deep-equal'));

module.exports = {
  allowUncaught: false,
  asyncOnly: false,
  exclude: '../../test/e2e/**/*.spec.js',
  exit: true,
  color: true,
  fullTrace: true,
  recursive: true,
  reporter: 'spec',
  // These tests get run from build/test
  spec: '../../test/**/*.spec.js',
};
