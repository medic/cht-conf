#!/usr/bin/env node

const { error } = require('../lib/log');
const checkNodeVersion = require('../cli/check-node-version');

try {
  checkNodeVersion();
} catch (e) {
  error(e.message);
  process.exitCode = 1;
}

const main = require('../lib/main');
(async () => {
  try {
    await main(process.argv, process.env);
  } catch (e) {
    error(e.message);
    process.exitCode = 1;
  }
})();
