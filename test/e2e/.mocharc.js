module.exports = {
  allowUncaught: false,
  color: true,
  checkLeaks: true,
  fullTrace: true,
  asyncOnly: false,
  spec: ['test/e2e/**/*.spec.js'],
  timeout: 120_000, // spinning up a CHT instance takes a little long
  reporter: 'spec',
  file: ['test/e2e/hooks.js'],
  captureFile: 'test/e2e/results.txt',
  exit: true,
  recursive: true,
};
