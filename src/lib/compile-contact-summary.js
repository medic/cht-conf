const path = require('path');
const fs = require('./sync-fs');
const pack = require('../lib/package-lib');

module.exports = async (projectDir, options) => {
  const freeformPath = `${projectDir}/contact-summary.js`;
  const structuredPath = `${projectDir}/contact-summary.templated.js`;

  const freeformPathExists = fs.exists(freeformPath);
  const structuredPathExists = fs.exists(structuredPath);

  if (!freeformPathExists && !structuredPathExists) throw new Error(`Could not find contact-summary javascript at either of ${freeformPath} or ${structuredPath}.  Please create one xor other of these files.`);
  if (freeformPathExists && structuredPathExists) throw new Error(`Found contact-summary javascript at both ${freeformPath} and ${structuredPath}.  Only one of these files should exist.`);

  const pathToContactSummaryFolder = path.join(__dirname, '../contact-summary');
  
  let code;
  if (freeformPathExists) {
    code = fs.read(freeformPath);
    // TODO: How do you eslint this?
  } else {
    code = await pack(projectDir, pathToContactSummaryFolder, options);
  }

  return code;
};
