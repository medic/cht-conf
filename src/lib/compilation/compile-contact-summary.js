const path = require('path');
const nodeFs = require('node:fs');
const fs = require('../sync-fs');
const pack = require('./package-lib');
const os = require('node:os');
const { findContactSummaryExtensions } = require('../auto-include');
const { info } = require('../log');

/**
 * Validate that exactly one contact-summary file exists
 * @param {string} freeformPath - Path to contact-summary.js
 * @param {string} structuredPath - Path to contact-summary.templated.js
 * @throws {Error} If neither or both files exist
 */
const validateContactSummaryFiles = (freeformPath, structuredPath) => {
  const freeformExists = fs.exists(freeformPath);
  const structuredExists = fs.exists(structuredPath);

  if (!freeformExists && !structuredExists) {
    throw new Error(
      `Could not find contact-summary javascript at either of ${freeformPath} or ${structuredPath}.  `
      + 'Please create one xor other of these files.'
    );
  }
  if (freeformExists && structuredExists) {
    throw new Error(
      `Found contact-summary javascript at both ${freeformPath} and ${structuredPath}.  `
      + 'Only one of these files should exist.'
    );
  }

  return { freeformExists, structuredExists };
};

/**
 * Register card extension aliases for webpack
 * @param {string[]} extensions - Array of extension file paths
 * @returns {Object} Webpack aliases map
 */
const registerExtensionAliases = (extensions) => {
  const aliases = {};
  extensions.forEach((filePath, index) => {
    aliases[`cht-cards-extension-${index}.js`] = filePath;
    info(`Auto-including contact-summary: ${path.basename(filePath)}`);
  });
  return aliases;
};

/**
 * Generate shim file with explicit requires for webpack
 * @param {string[]} extensions - Array of extension file paths
 * @returns {string} Path to generated shim file
 */
const generateExtensionsShim = (extensions) => {
  const shimPath = path.join(os.tmpdir(), 'cht-cards-extensions-shim.js');
  const requires = extensions.map((_, i) => `require('cht-cards-extension-${i}.js')`).join(',\n  ');
  const content = extensions.length > 0
    ? `module.exports = [\n  ${requires}\n];`
    : 'module.exports = [];';
  nodeFs.writeFileSync(shimPath, content);
  return shimPath;
};

module.exports = async (projectDir, options) => {
  const freeformPath = `${projectDir}/contact-summary.js`;
  const structuredPath = `${projectDir}/contact-summary.templated.js`;

  const { freeformExists, structuredExists } = validateContactSummaryFiles(freeformPath, structuredPath);

  const baseEslintPath = path.join(__dirname, '../../contact-summary/.eslintrc');
  const pathToDeclarativeLib = path.join(__dirname, '../../contact-summary/lib.js');
  const pathToPack = freeformExists ? freeformPath : pathToDeclarativeLib;

  // Find and register auto-include files (only for templated mode)
  const cardExtensions = structuredExists ? findContactSummaryExtensions(projectDir) : [];
  const extraAliases = registerExtensionAliases(cardExtensions);
  extraAliases['cht-cards-extensions-shim.js'] = generateExtensionsShim(cardExtensions);

  // WebApp expects the contact-summary to make a bare return
  // This isn't a direct output option for webpack, so add some boilerplate
  const packOptions = Object.assign({}, options, { libraryTarget: 'ContactSummary' });
  const code = await pack(projectDir, pathToPack, { baseEslintPath, options: packOptions, extraAliases });
  return `var ContactSummary = {}; ${code} return ContactSummary;`;
};
