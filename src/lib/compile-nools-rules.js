const path = require('path');

const fs = require('./sync-fs');
const pack = require('./package-lib');

const DECLARATIVE_NOOLS_FILES = [ 'tasks.js', 'targets.js' ];

const compileNoolsRules = (projectDir, options) => {
  const tryLoadLegacyRules = legacyNoolsFilePath => {
    let result;
    if (fs.exists(legacyNoolsFilePath)) {
      result = fs.read(legacyNoolsFilePath);
    }
  
    return result;
  };

  const legacyNoolsFilePath = path.join(projectDir, 'rules.nools.js');
  const legacyRules = tryLoadLegacyRules(legacyNoolsFilePath);
  
  if (legacyRules !== undefined) {
    if (findMissingDeclarativeFiles(projectDir).length !== DECLARATIVE_NOOLS_FILES.length) {
      throw new Error(`Both legacy and current nools definitions found. You should either have ${legacyNoolsFilePath} xor ${DECLARATIVE_NOOLS_FILES} files.`);
    }

    // TODO: Eslint this?

    return legacyRules;
  } else {
    return compileDeclarativeFiles(projectDir, options);
  }
};

const findMissingDeclarativeFiles = projectDir => DECLARATIVE_NOOLS_FILES.filter(filename => {
  const filePath = path.join(projectDir, filename);
  return !fs.exists(filePath);
});

const compileDeclarativeFiles = async (projectDir, options) => {
  const missingFiles = findMissingDeclarativeFiles(projectDir);
  if (missingFiles.length > 0) {
    throw new Error(`Missing required declarative configuration file(s): ${missingFiles}`);
  }

  const pathToNoolsDirectory = path.join(__dirname, '../nools');

  const code = await pack(projectDir, pathToNoolsDirectory, options);
  return `define Target { _id: null, deleted: null, type: null, pass: null, date: null }
define Contact { contact: null, reports: null }
define Task { _id: null, deleted: null, doc: null, contact: null, icon: null, date: null, title: null, fields: null, resolved: null, priority: null, priorityLabel: null, reports: null, actions: null }
rule GenerateEvents {
  when { c: Contact } then { ${code} }
}`;
};

module.exports = compileNoolsRules;