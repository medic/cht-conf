const jshint = require('jshint').JSHINT;
const withLineNumbers = require('./with-line-numbers');

module.exports = (description, code, options) => {
  jshint(code, options);

  if(jshint.errors.length) {
    console.log(`Generated code for ${description}:`);
    console.log(withLineNumbers(code));
    jshint.errors.map(e => console.log(`line ${e.line}, col ${e.character}, ${e.reason} (${e.code})`));
    throw new Error(`jshint violations found in ${description} :¬(`);
  }
};
