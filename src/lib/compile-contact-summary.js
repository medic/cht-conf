const path = require('path');
const fs = require('./sync-fs');
const lint = require('./lint-with-linenumbers');
const minify = require('../lib/minify-js');

module.exports = (projectDir, options) => {
  const freeformPath = `${projectDir}/contact-summary.js`;
  const structuredPath = `${projectDir}/contact-summary.templated.js`;

  const freeformPathExists = fs.exists(freeformPath);
  const structuredPathExists = fs.exists(structuredPath);

  if (!freeformPathExists && !structuredPathExists) throw new Error(`Could not find contact-summary javascript at either of ${freeformPath} or ${structuredPath}.  Please create one xor other of these files.`);
  if (freeformPathExists && structuredPathExists) throw new Error(`Found contact-summary javascript at both ${freeformPath} and ${structuredPath}.  Only one of these files should exist.`);

  let code;
  const pathToContactSummaryLib = path.join(__dirname, '../contact-summary/lib.js');
  if (freeformPathExists) {
    code = fs.read(projectDir, freeformPath);
  } else {
    const contactSummaryLib = fs.read(pathToContactSummaryLib);
  }

  lint(code, pathToContactSummaryLib, options);
  return minify(code, options).code;
};
