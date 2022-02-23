#!/usr/bin/env node

const { info, error } = require('../lib/log');
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
    info(e); // log the details for debugging
    error(e.message); // error the message to make it clear
    process.exitCode = 1; // emit a non-zero exit code for scripting
  }
})();
