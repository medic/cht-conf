const fs = require('./sync-fs');
const jshintWithReport = require('./jshint-with-report');
const minify = require('../lib/minify-js');
const templatedJs = require('../lib/templated-js');

function lint(code) {
  jshintWithReport('contact-summary', code, {
    predef: [ 'console', 'contact', 'lineage', 'reports' ],
  });
}

module.exports = projectDir => {
  const freeformPath = `${projectDir}/contact-summary.js`;
  const structuredPath = `${projectDir}/contact-summary.templated.js`;

  const freeformPathExists = fs.exists(freeformPath);
  const structuredPathExists = fs.exists(structuredPath);

  if (!freeformPathExists && !structuredPathExists) throw new Error(`Could not find contact-summary javascript at either of ${freeformPath} or ${structuredPath}.  Please create one xor other of these files.`);
  if (freeformPathExists && structuredPathExists) throw new Error(`Found contact-summary javascript at both ${freeformPath} and ${structuredPath}.  Only one of these files should exist.`);

  let code;
  if (freeformPathExists) {
    code = templatedJs.fromFile(projectDir, freeformPath);
  } else {
    const contactSummaryLib = fs.read(`${__dirname}/../contact-summary/lib.js`);
    code = templatedJs.fromString(projectDir, `
var context, fields, cards;

__include_inline__('contact-summary-extras.js');
__include_inline__('contact-summary.templated.js');

${contactSummaryLib}
`);
  }

  lint(code);

  return minify(code);
};
