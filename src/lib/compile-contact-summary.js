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
  } else if (fs.exists(structuredPath)) {
    const extrasPath = `${projectDir}/contact-summary-extras.js`;
    const extrasExists = fs.exists(extrasPath);

    const contactSummaryLib = fs.read(`${__dirname}/../contact-summary/lib.js`);
    const templatedContactSummary = fs.read(`${projectDir}/contact-summary.templated.js`);
    const contactSummaryExtrasPath = `${projectDir}/contact-summary-extras.js`;
    const contactSummaryExtrasContent = fs.exists(contactSummaryExtrasPath) ? fs.read(contactSummaryExtrasPath) : '';

    code = `
var extras = (function() {
  var module = { exports: {} };
  ${contactSummaryExtrasContent}
  return module.exports;
})(); /*jshint unused:false*/

var contactSummary = (function(extras) {
  var module = { exports: {} };
  ${templatedContactSummary}
  return module.exports;
})(extras);

var fields = contactSummary.fields;
var context = contactSummary.context;
var cards = contactSummary.cards;
${contactSummaryLib}
`;
  }

  lint(code);

  return code; // minify(code);
};
