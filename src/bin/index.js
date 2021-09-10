#!/usr/bin/env node
/* eslint-disable node/shebang */

const { error } = require('../lib/log');
require('../cli/check-node-version');

const main = require('../lib/main');

(async () => {
  let returnCode;
  try {
    returnCode = await main(process.argv, process.env);
  }
  catch (e) {
    error(e);
    returnCode = -1;
  }
  finally {
    process.exit(returnCode);
  }
})();
