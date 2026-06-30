const path = require('path');
const nodeFs = require('node:fs');
const os = require('node:os');
const pack = require('./package-lib');
const { findContactSummaryFiles } = require('../auto-include');
const { info, warn } = require('../log');

const DEPRECATED_BASE = 'contact-summary.templated.js';

/**
 * Build the ordered list of contact-summary source files: the deprecated
 * templated base file first (most preferred), then contact-summary/*.js.
 * @param {string} projectDir - Project directory path
 * @returns {string[]} Absolute paths of contact-summary source files
 */
const collectContactSummaryFiles = (projectDir) => {
  const files = [];
  const basePath = path.join(projectDir, DEPRECATED_BASE);
  if (nodeFs.existsSync(basePath)) {
    warn(`${DEPRECATED_BASE} is deprecated. Please move it to contact-summary/base.js`);
    files.push(basePath);
  }
  findContactSummaryFiles(projectDir).forEach(filePath => {
    info(`Including contact-summary: ${path.basename(filePath)}`);
    files.push(filePath);
  });
  return files;
};

/**
 * Generate the webpack entry that requires every contact-summary file and
 * emits the merged config via the emitter.
 * @param {string[]} files - Absolute paths of contact-summary source files
 * @returns {string} Path to the generated entry file
 */
const generateEntry = (files) => {
  const entryDir = path.join(os.tmpdir(), 'contact-summary');
  nodeFs.mkdirSync(entryDir, { recursive: true });
  const entryPath = path.join(entryDir, 'lib.js');

  const emitterPath = path.join(__dirname, '../../contact-summary/contact-summary-emitter');
  const requires = files.map(f => `  require(${JSON.stringify(f)})`).join(',\n');
  const content = `const emitter = require(${JSON.stringify(emitterPath)});
const contactSummaries = [
${requires}
];
module.exports = emitter(contactSummaries, contact, reports);
`;
  nodeFs.writeFileSync(entryPath, content);
  return entryPath;
};

module.exports = async (projectDir, options) => {
  const files = collectContactSummaryFiles(projectDir);
  const entryPath = generateEntry(files);

  const baseEslintPath = path.join(__dirname, '../../contact-summary/.eslintrc');

  // WebApp expects the contact-summary to make a bare return
  // This isn't a direct output option for webpack, so add some boilerplate
  const packOptions = Object.assign({}, options, { libraryTarget: 'ContactSummary' });
  const code = await pack(projectDir, entryPath, { baseEslintPath, options: packOptions });
  return `var ContactSummary = {}; ${code} return ContactSummary;`;
};
