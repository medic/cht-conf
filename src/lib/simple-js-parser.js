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
  let indentedCode = withIndent('  ', `'use strict';
${header}
${rawCode}`);

  // Allow removal of `return` statements etc.
  if(optsOrPath.trimLinesFromEnd) {
    indentedCode = indentedCode
        .split('\n')
        .slice(0, -optsOrPath.trimLinesFromEnd)
        .join('\n');
  }

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
