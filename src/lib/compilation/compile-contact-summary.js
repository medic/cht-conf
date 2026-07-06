const path = require('path');
const nodeFs = require('node:fs');
const pack = require('./package-lib');
const { collectConfigFiles } = require('../auto-include');
const { requireStatements, writeEntry } = require('./generated-entry');
const { warn } = require('../log');

const REMOVED_FREEFORM_FILE = 'contact-summary.js';

/**
 * Warn (once) if the project still has the removed freeform contact-summary
 * file, which is silently ignored as of cht-conf 7.0.
 * @param {string} projectDir - Project directory path
 */
const warnRemovedFiles = (projectDir) => {
  if (nodeFs.existsSync(path.join(projectDir, REMOVED_FREEFORM_FILE))) {
    warn(
      `${REMOVED_FREEFORM_FILE} (freeform contact-summary) is no longer supported and will be ignored. `
      + 'Migrate to declarative contact-summary/ configuration.'
    );
  }
};

/**
 * Generate the webpack entry that requires every contact-summary file and
 * emits the merged config via the emitter.
 * @param {string[]} files - Absolute paths of contact-summary source files
 * @returns {string} Path to the generated entry file
 */
const generateEntry = (files) => {
  const emitterPath = path.join(__dirname, '../../contact-summary/contact-summary-emitter');
  const content = `const emitter = require(${JSON.stringify(emitterPath)});
const contactSummaries = [
  ${requireStatements(files).join(',\n  ')}
];
module.exports = emitter(contactSummaries, contact, reports);
`;
  return writeEntry('contact-summary', content);
};

module.exports = async (projectDir, options) => {
  warnRemovedFiles(projectDir);

  const files = collectConfigFiles(projectDir, {
    baseFilename: 'contact-summary.templated.js',
    subdir: 'contact-summary',
    label: 'contact-summary',
    log: true,
  });
  const { entryPath, cleanup } = generateEntry(files);

  const baseEslintPath = path.join(__dirname, '../../contact-summary/.eslintrc');

  // WebApp expects the contact-summary to make a bare return
  // This isn't a direct output option for webpack, so add some boilerplate
  const packOptions = Object.assign({}, options, { libraryTarget: 'ContactSummary' });
  try {
    const code = await pack(projectDir, entryPath, { baseEslintPath, options: packOptions });
    return `var ContactSummary = {}; ${code} return ContactSummary;`;
  } finally {
    cleanup();
  }
};
