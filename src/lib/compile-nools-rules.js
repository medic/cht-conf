const fs = require('./sync-fs');
const jshintWithReport = require('./jshint-with-report');
const jsToString = require('./js-to-string');
const minifyJs = require('./minify-js');
const minifyNools = require('./minify-nools');
const parseTargets = require('./parse-targets');
const templatedJs = require('./templated-js');

function lint(code) {
  jshintWithReport('nools rules', code, {
    predef: [ 'c', 'console', 'emit', 'Contact', 'Target', 'Task', 'Utils' ],
  });
}

function compileWithDefaultLayout(projectDir) {
  checkForRequiredFilesForDefaultLayout(projectDir);

  const targets = parseTargets.js(projectDir);
  const tasks = fs.read(`${projectDir}/tasks.js`);
  const supportCode = fs.read(`${projectDir}/nools-extras.js`);
  const noolsLib = fs.read(`${__dirname}/../nools/lib.js`);

  const jsCode = templatedJs.fromString(projectDir, `
    var idx1, idx2, r, target;
    var now = Utils.now();
    ${supportCode}
    var targets = ${jsToString(targets)};
    var tasks = ${tasks};

    ${noolsLib}
  `);

  lint(jsCode);

  const minifiedJs = minifyJs(jsCode);

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
  const required = [ 'nools-extras.js', 'targets.js', 'tasks.js' ];

  const missing = required.map(f => `${projectDir}/${f}`)
                          .filter(f => !fs.exists(f));
  if(missing.length) {
    throw new Error(`Missing required file(s): ${missing}`);
  }
}

module.exports = projectDir => {
  const noolsPath = `${projectDir}/rules.nools.js`;
  if(fs.exists(noolsPath)) return minifyNools(templatedJs.fromFile(projectDir, noolsPath));
  else return compileWithDefaultLayout(projectDir);
};
