const _ = require('lodash');
const jshint = require('jshint').JSHINT;
const withLineNumbers = require('./with-line-numbers');

const DEFAULT_OPTS = {
  bitwise: true,
  esversion: 5,
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

  jshint(code, options);

  if(jshint.errors.length) {
    console.log(`Generated code for ${description}:`);
    console.log(withLineNumbers(code));
    jshint.errors.map(e => console.log(`line ${e.line}, col ${e.character}, ${e.reason} (${e.code})`));
    throw new Error(`jshint violations found in ${description} :¬(`);
  }
};
