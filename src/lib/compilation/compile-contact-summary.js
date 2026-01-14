const path = require('path');
const nodeFs = require('node:fs');
const fs = require('../sync-fs');
const pack = require('./package-lib');
const os = require('node:os');
const { findContactSummaryExtensions } = require('../auto-include');
const { info } = require('../log');

module.exports = async (projectDir, options) => {
  const freeformPath = `${projectDir}/contact-summary.js`;
  const structuredPath = `${projectDir}/contact-summary.templated.js`;

  const freeformPathExists = fs.exists(freeformPath);
  const structuredPathExists = fs.exists(structuredPath);

  if (!freeformPathExists && !structuredPathExists) {
    throw new Error(
      `Could not find contact-summary javascript at either of ${freeformPath} or ${structuredPath}.  `
      + 'Please create one xor other of these files.'
    );
  }
  if (freeformPathExists && structuredPathExists) {
    throw new Error(
      `Found contact-summary javascript at both ${freeformPath} and ${structuredPath}.  `
      + 'Only one of these files should exist.'
    );
  }

  const baseEslintPath = path.join(__dirname, '../../contact-summary/.eslintrc');
  const pathToDeclarativeLib = path.join(__dirname, '../../contact-summary/lib.js');
  const pathToPack = freeformPathExists ? freeformPath : pathToDeclarativeLib;

  // Find auto-include files (only for templated mode)
  const extraAliases = {};
  let cardExtensions = [];

  if (structuredPathExists) {
    cardExtensions = findContactSummaryExtensions(projectDir);

    cardExtensions.forEach((filePath, index) => {
      const aliasName = `cht-cards-extension-${index}.js`;
      extraAliases[aliasName] = filePath;
      info(`Auto-including contact-summary: ${path.basename(filePath)}`);
    });
  }

  // Generate shim that explicitly requires all extensions (webpack needs static requires)
  const cardsShimPath = path.join(os.tmpdir(), 'cht-cards-extensions-shim.js');
  const cardsRequires = cardExtensions.map((_, i) => `require('cht-cards-extension-${i}.js')`).join(',\n  ');
  const cardsShimContent = cardExtensions.length > 0
    ? `module.exports = [\n  ${cardsRequires}\n];`
    : 'module.exports = [];';
  nodeFs.writeFileSync(cardsShimPath, cardsShimContent);
  extraAliases['cht-cards-extensions-shim.js'] = cardsShimPath;

  /*
  WebApp expects the contact-summary to make a bare return
  This isn't a direct output option for webpack, so add some boilerplate
  */
  const packOptions = Object.assign({}, options, { libraryTarget: 'ContactSummary' });
  const code = await pack(projectDir, pathToPack, { baseEslintPath, options: packOptions, extraAliases });
  return `var ContactSummary = {}; ${code} return ContactSummary;`;
};
