#!/usr/bin/env node

require('../cli/check-node-version');

const runMedicConf = require('../lib/main');

(async () => {
  let returnCode;
  try {
    returnCode = await runMedicConf(process.argv, process.env);
  }
  catch (e) {
    console.error(e);
    returnCode = -1;
  }
  finally {
    process.exit(returnCode);
  }
})();

