const path = require('path');
const checkMedicConfDependencyVersion = require('../lib/check-medic-conf-depdency-version');
const compileContactSummary = require('../lib/compile-contact-summary');
const compileNoolsRules = require('../lib/compile-nools-rules');
const fs = require('../lib/sync-fs');
const parseTargets = require('../lib/parse-targets');
const { error, info, warn } = require('../lib/log');
const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true });

const SCHEMA_FILE_PREFIX = 'schema-';
const SCHEMA_FILE_EXT = '.bak';

function parsePurgingFunction(root) {
  const purgeFnPath = `${root}/purging.js`;
  if (fs.exists(purgeFnPath)) {
    const purgeFn = fs.read(purgeFnPath);

    try {
      /* jshint -W061 */
      eval(`(${purgeFn})`);
    } catch(err) {
      warn('Unable to parse purging.js', err);
      throw err;
    }

    return purgeFn;
  }
}

module.exports = (projectDir, instanceUrl, extraArgs) => {
  projectDir = path.resolve(projectDir);

  return Promise.resolve()
    .then(() => {
      checkMedicConfDependencyVersion(projectDir);

      let app_settings;

      const inheritedPath = `${projectDir}/settings.inherit.json`;
      if(fs.exists(inheritedPath)) {

        const inherited = fs.readJson(inheritedPath);
        app_settings = compileAppSettings(`${projectDir}/${inherited.inherit}`);

        applyTransforms(app_settings, inherited);

      } else {
        app_settings = compileAppSettings(projectDir);
      }

      if (extraArgs !== undefined && extraArgs.includes('skip-validation')){
        info("Skipping validation of app_settings");
      } else {
        let schema_file = fs.readdir('.').find( f => {
          return f.startsWith(SCHEMA_FILE_PREFIX) && f.endsWith(SCHEMA_FILE_EXT);
        });

        if (schema_file){
          let schema = fs.fs.readFileSync(schema_file, { encoding: 'utf8' });
          let validate = ajv.compile(JSON.parse(schema));
          let valid = validate(app_settings);
          if (valid) {
            info("App settings conformant to schema");
          } else {
            error(`app_settings.json not conformant to schema found at ${schema_file}`);
            error("If you think this is an error, you can skip validation with the 'skip-validation' flag");
            error(validate.errors);
          }
        } else {
          warn("app_settings.json schema not found, skipping validation");
        }
      }

      fs.writeJson(`${projectDir}/app_settings.json`, app_settings);

    });

  function compileAppSettings(projectDir) {
    // Helpful support for refactoring tasks.json to task-schedules.json
    // This warning can be removed when all projects have moved to the new layout.
    let taskSchedulesPath = `${projectDir}/task-schedules.json`;
    const oldTaskSchedulesPath = `${projectDir}/tasks.json`;
    if(fs.exists(oldTaskSchedulesPath)) {
      if(fs.exists(taskSchedulesPath)) {
        throw new Error(`You have both ${taskSchedulesPath} and ${oldTaskSchedulesPath}.  Please remove one to continue!`);
      }
      warn(`tasks.json file is deprecated.  Please rename ${oldTaskSchedulesPath} to ${taskSchedulesPath}`);
      taskSchedulesPath = oldTaskSchedulesPath;
    }

    // TODO why not inline this with app_settings.tasks setup below?
    const files = {
      app_settings: fs.readJson(`${projectDir}/app_settings.json`),
      contact_summary: compileContactSummary(projectDir),
      nools: compileNoolsRules(projectDir),
      targets: parseTargets.json(projectDir),
      tasks_schedules: readOptionalJson(taskSchedulesPath),
      purging: parsePurgingFunction(projectDir)
    };

    const app_settings = files.app_settings;

    app_settings.contact_summary = files.contact_summary;

    app_settings.tasks = {
      rules: files.nools,
      schedules: files.tasks_schedules,
      targets: files.targets,
    };

    if (files.purging) {
      app_settings.purge = app_settings.purging || {};
      app_settings.purge.fn = files.purging;
    }

    return app_settings;
  }

};

const readOptionalJson = path => {
  if(fs.exists(path)) return fs.readJson(path);
};

function applyTransforms(app_settings, inherited) {
  doDelete(app_settings, inherited.delete);
  doReplace(app_settings, inherited.replace);
  doMerge(app_settings, inherited.merge);
  doFilter(app_settings, inherited.filter);
}

function doDelete(target, rules) {
  if(!Array.isArray(rules)) throw new Error('.delete should be an array');

  rules.forEach(k => {
    const parts = k.split('.');
    let t = target;
    while(parts.length > 1) {
      t = t[parts[0]];
      parts.shift();
    }
    delete t[parts[0]];
  });
}

function doReplace(target, rules) {
  if(typeof rules !== 'object') throw new Error('.replace should be an object');

  Object.keys(rules)
    .forEach(k => {
      const parts = k.split('.');
      let t = target;
      while(parts.length > 1) {
        t = t[parts[0]];
        parts.shift();
      }
      t[parts[0]] = rules[k];
    });
}

function doMerge(target, source) {
  Object.keys(target)
    .forEach(k => {
      if(Array.isArray(source[k])) target[k] = target[k].concat(source[k]);
      else if(typeof source[k] === 'object') doMerge(target[k], source[k]);
      else source[k] = target[k];
    });
}

function doFilter(target, rules) {
  if(typeof rules !== 'object') throw new Error('.filter should be an object');

  Object.keys(rules)
    .forEach(k => {
      const parts = k.split('.');
      let t = target;
      while(parts.length > 1) {
        t = t[parts[0]];
        parts.shift();
      }

      if(!Array.isArray(rules[k])) throw new Error('.filter values must be arrays!');

      Object.keys(t[parts[0]])
        .forEach(tK => {
          if(!rules[k].includes(tK)) delete t[parts[0]][tK];
        });
    });
}
