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

  let code;
  if(fs.exists(freeformPath)) {
    code = templatedJs.fromFile(projectDir, freeformPath);
  } else if(fs.exists(structuredPath)) {
    const contactSummaryLib = fs.read(`${__dirname}/../contact-summary/lib.js`);
    code = templatedJs.fromString(projectDir, `
var context, fields, cards;

__include_inline__('contact-summary-extras.js');
__include_inline__('contact-summary.templated.js');

${contactSummaryLib}
`);
  } else throw new Error(`Could not find contact-summary javascript at either of ${freeformPath} or ${structuredPath}.  Please create one xor other of these files.`);

  lint(code);

  return minify(code);
};
