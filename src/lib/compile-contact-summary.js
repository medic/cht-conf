const jshint = require('jshint').JSHINT;
const minify = require('../lib/minify-js');
const templatedJs = require('../lib/templated-js');
const withLineNumbers = require('./with-line-numbers');

function lint(code) {
  jshint(code, {
    esversion: 5,
    eqeqeq: true,
    funcscope: true,
    latedef: 'nofunc',
    nonbsp: true,
    predef: [ 'contact', 'lineage', 'reports' ],
    undef: true,
    unused: true,
  });

  if(jshint.errors.length) {
    console.log('Generated code:');
    console.log(withLineNumbers(code));
    jshint.errors.map(e => console.log(`line ${e.line}, col ${e.character}, ${e.reason} (${e.code})`));
    throw new Error(`jshint violations found in contact-summary :¬(`);
  }
}

module.exports = projectDir => {
  const code = templatedJs.fromFile(projectDir, `${projectDir}/contact-summary.js`);

  lint(code);

  return minify(code);
};
