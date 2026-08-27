const path = require('path');
const nodeFs = require('node:fs');
const pack = require('./package-lib');
const { collectConfigFiles } = require('../auto-include');
const { requireStatements, writeEntry } = require('./generated-entry');

const REMOVED_FREEFORM_FILE = 'contact-summary.js';
const CONTACT_SUMMARY_DOCS_URL =
  'https://docs.communityhealthtoolkit.org/building/contact-summary/contact-summary-templated/';

/**
 * Fail if the project still has the removed freeform contact-summary file.
 * Compiling it would silently produce an empty contact-summary config, which
 * would then wipe the contact-summary on the server it is uploaded to.
 * @param {string} projectDir - Project directory path
 * @throws {Error} If the removed freeform file is present
 */
const assertNoRemovedFiles = (projectDir) => {
  if (nodeFs.existsSync(path.join(projectDir, REMOVED_FREEFORM_FILE))) {
    throw new Error(
      `${REMOVED_FREEFORM_FILE} (freeform contact-summary) is no longer supported. `
      + 'Migrate to declarative contact-summary/ configuration, then delete the file. '
      + `See ${CONTACT_SUMMARY_DOCS_URL}`
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
  assertNoRemovedFiles(projectDir);

  const files = collectConfigFiles(projectDir, {
    baseFilename: 'contact-summary.templated.js',
    subdir: 'contact-summary',
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
