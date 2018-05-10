const fs = require('../lib/sync-fs');

const cleanJs = js =>
  js.split('\n')
    .map(s =>
      s.trim()
        .replace(/\s*\/\/.*/, '') // single-line comments (like this one)
    ).join('')
        .replace(/\s*\/\*(?:(?!\*\/).)*\*\/\s*/g, ''); /* this kind of comment */

module.exports = (projectDir, rootFile) =>
    cleanJs(fs.read(`${projectDir}/${rootFile}`)
	.replace(/__include_inline__\('\s*([^_]*)'\s*\);/g, (_, includedFile) =>
	    fs.read(`${projectDir}/${includedFile}`)));
