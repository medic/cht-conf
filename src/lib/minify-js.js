const { info, warn, error } = require('./log');
const Terser = require('terser');
const withLineNumbers = require('./with-line-numbers');

module.exports = (jsCode, options = {}) => {
  const result = Terser.minify(jsCode, {
    warnings: true,
    ecma: options.ecma || 5,
    compress: options.minifyScripts ? {
      drop_debugger: false,
    } : false,
    // sourceMap: options.includeSourceMap ? {
    //   filename: 'compiled-configuration.js',
    //   // url: 'inline',
    // } : false,
    parse: { bare_returns: true },
    output: { quote_style: 1 },
  });

  if (result.error || result.warnings) {
    info('Generated code:');
    info(withLineNumbers(jsCode));

    if(result.error) {
      error(`Error while minifying javascript at line ${result.error.line}, col ${result.error.col}`);
      throw result.error;
    }

    if(result.warnings) {
      const logLevel = options.haltOnMinifyWarning ? error : warn;
      result.warnings.forEach(warning => logLevel(warning));
      if (options.haltOnMinifyWarning) {
        throw new Error(`Warnings generated while minifying javscript.`);
      }
    }
  }

  return result;
};
