const _ = require('lodash');
const jshint = require('jshint').JSHINT;
const withLineNumbers = require('./with-line-numbers');

const DEFAULT_OPTS = {
  bitwise: true,
  esversion: 6,
  eqeqeq: true,
  freeze: true,
  funcscope: true,
  futurehostile: true,
  latedef: 'nofunc',
  noarg: true,
  nocomma: true,
  nonbsp: true,
  nonew: true,
  notypeof: true,
  shadow: 'inner',
  undef: true,
  unused: true,
};

module.exports = (description, code, options) => {
  options = _.extend(options, DEFAULT_OPTS);

  // wrap our code in a function because otherwise jshint can't detect repeated
  // declarations.  Ref: https://github.com/jshint/jshint/issues/3288
  jshint(`(function() {
    ${code}
  }());`, options);

  if(jshint.errors.length) {
    console.log(`Generated code for ${description}:`);
    console.log(withLineNumbers(code));
    jshint.errors.map(e => console.log(`line ${e.line-1}, col ${e.character}, ${e.reason} (${e.code})`));
    throw new Error(`jshint violations found in ${description} :¬(`);
  }
};
