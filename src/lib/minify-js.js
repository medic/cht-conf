const uglify = require('uglify-js');
const warn = require('./log').warn;
const withLineNumbers = require('./with-line-numbers');

module.exports = js => {
  const result = uglify.minify(js, {
    warnings: true,
    parse: {  bare_returns:true },
    output: { quote_style:1 },
  });

  if(result.error || result.warnings) {
    console.log('Generated code:');
    console.log(withLineNumbers(js));

    if(result.error) {
      throw new Error(`Error while minifying javascript at line ${result.error.line}, col ${result.error.col}: ${result.error}`);
    }

    if(result.warnings) {
      result.warnings.forEach(w => warn(w));
      throw new Error(`Warnings generated while minifying javscript.`);
    }
  }

  return result.code;
};
