const fs = require('./sync-fs');
const withLineNumbers = require('./with-line-numbers');

module.exports = (optsOrPath, ...exportNames) => {
  let header, paths;
  if(typeof optsOrPath === 'object') {
    paths = optsOrPath.jsFiles;
    if(optsOrPath.export) {
      exportNames = exportNames.concat(optsOrPath.export);
    }
    header = optsOrPath.header;
  } else {
    paths = [ optsOrPath ];
  }
  if(!header) header = '';

  const rawCode = paths.map(fs.read).join('');
  const indentedCode = withIndent('  ', `'use strict';
${header}
${rawCode}`);

  const returnList = exportNames.map(r => `${r}:${r}`).join(',');

  const code =
`(function() {
${indentedCode}
  return { ${returnList} };
}());`;

  try {
    return eval(code); // jshint ignore:line
  } catch(e) {
    console.log(`Error evaluating code compiled from ${paths}:
${withLineNumbers(code)}`);
    throw new Error(`Error evaluating ${paths}: ${e}`);
  }
};

function withIndent(indent, code) {
  return code.replace(/^/mg, () => indent);
}
