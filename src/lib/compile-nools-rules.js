const fs = require('./sync-fs');
const jshintWithReport = require('./jshint-with-report');

// This is causing some many scoping and closure related issues it's insanity
const jsToString = require('./js-to-string');
const minifyJs = require('./minify-js');
const minifyNools = require('./minify-nools');
const parseTargets = require('./parse-targets');
const templatedJs = require('./templated-js');

const CURRENT_NOOLS_FILES = [ 'tasks.js', 'targets.js' ];

function lint(code) {
  jshintWithReport('nools rules', code, {
    predef: [ 'c', 'console', 'emit', 'Contact', 'Target', 'Task', 'Utils' ],
  });
}

function compileWithDefaultLayout(projectDir) {
  checkForRequiredFilesForDefaultLayout(projectDir);

  const loadLibFile = filename => {
    const path = `${projectDir}/${filename}.js`;
    if (!fs.exists(path)) {
      console.warn(`Library file does not exist at ${path}`);
      return '';
    }

    return fs.read(path);
  };
  const noolsLib = fs.read(`${__dirname}/../nools/lib.js`);

  const jsCode = templatedJs.fromString(projectDir, `
    var idx1, idx2, r, target;
    var now = Utils.now();
    ${loadLibFile('shared.lib')}
    ${loadLibFile('tasks.lib')}
    ${loadLibFile('targets.lib')}
    ${loadLibFile('targets')}
    var tasks = ${loadLibFile('tasks')};

    ${noolsLib}
  `);

  lint(jsCode);

  const minifiedJs = jsCode; //minifyJs(jsCode);

  return minifyNools(`
    define Target {
      _id: null,
      deleted: null,
      type: null,
      pass: null,
      date: null
    }

    define Contact {
      contact: null,
      reports: null
    }

    define Task {
      _id: null,
      deleted: null,
      doc: null,
      contact: null,
      icon: null,
      date: null,
      title: null,
      fields: null,
      resolved: null,
      priority: null,
      priorityLabel: null,
      reports: null,
      actions: null
    }

    rule GenerateEvents {
      when {
        c: Contact
      }
      then {
        ${minifiedJs}
      }
    }
  `);
}

function checkForRequiredFilesForDefaultLayout(projectDir) {
  const missing = CURRENT_NOOLS_FILES.filter(f => !fs.exists(`${projectDir}/${f}`));

  if(missing.length) {
    throw new Error(`Missing required file(s): ${missing}`);
  }
}

module.exports = projectDir => {
  const legacyNoolsPath = `${projectDir}/rules.nools.js`;

  if(fs.exists(legacyNoolsPath)) {
    if(CURRENT_NOOLS_FILES.some(f => fs.exists(`${projectDir}/${f}`))) {
      throw new Error('Both legacy and current nools definitions found.  ' +
          `You should either have ${legacyNoolsPath} or ${CURRENT_NOOLS_FILES} files.`);
    }
    return minifyNools(templatedJs.fromFile(projectDir, legacyNoolsPath));
  } else {
    return compileWithDefaultLayout(projectDir);
  }
};
