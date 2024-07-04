module.exports = {
  allowUncaught: false,
  color: true,
  checkLeaks: true,
  fullTrace: true,
  asyncOnly: false,
  spec: ['test/e2e/**/*.spec.js'],
  timeout: 200 * 1000, //API takes a little long to start up
  reporter: 'spec',
  file: ['test/e2e/hooks.js'],
  captureFile: 'test/e2e/results.txt',
  exit: true,
  recursive: true,
};
