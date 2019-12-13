const fs = require('./sync-fs');
const { warn } = require('./log');

module.exports = (formsDir, extension, options) => {
  const candidateFiles = fs.readdir(formsDir)
    .filter(name => name.endsWith(extension));
  
  const formAllowList = options && options.forms && options.forms.filter(form => !form.startsWith('--'));
  if (!formAllowList || !formAllowList.length) {
    return candidateFiles;
  }

  const filteredFiles = candidateFiles.filter(name => formAllowList.includes(fs.withoutExtension(name)));
  if (candidateFiles.length && !filteredFiles.length) {
    warn(`No matches found for files matching form filter: ${formAllowList.join(extension + ',')}${extension}`);
  }

  return filteredFiles;
};