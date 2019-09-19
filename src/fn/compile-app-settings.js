const minimist = require('minimist');
const path = require('path');
const compileContactSummary = require('../lib/compile-contact-summary');
const compileNoolsRules = require('../lib/compile-nools-rules');
const fs = require('../lib/sync-fs');
const parseTargets = require('../lib/parse-targets');
const { warn } = require('../lib/log');

const compileAppSettings = async (projectDir, db, api, extraArgs) => {
  const options = parseExtraArgs(extraArgs);
  projectDir = path.resolve(projectDir);
  
  let appSettings;
  const inheritedPath = path.join(projectDir, 'settings.inherit.json');
  if (fs.exists(inheritedPath)) {
    const inherited = fs.readJson(inheritedPath);
    appSettings = await compileAppSettingsForProject(path.join(projectDir, inherited.inherit), options);
    applyTransforms(appSettings, inherited);
  } else {
    appSettings = await compileAppSettingsForProject(projectDir, options);
  }

  fs.writeJson(path.join(projectDir, 'app_settings.json'), appSettings);
};

const compileAppSettingsForProject = async (projectDir, options) => {
  const parsePurgingFunction = root => {
    const purgeFnPath = path.join(root, 'purging.js');
    if (fs.exists(purgeFnPath)) {
      const purgeFn = fs.read(purgeFnPath);
  
      try {
        eval(`(${purgeFn})`);
      } catch(err) {
        warn('Unable to parse purging.js', err);
        throw err;
      }
  
      return purgeFn;
    }
  };

  // Helpful support for refactoring tasks.json to task-schedules.json
  // This warning can be removed when all projects have moved to the new layout.
  let taskSchedulesPath = path.join(projectDir, 'task-schedules.json');
  const oldTaskSchedulesPath = path.join(projectDir, 'tasks.json');
  if (fs.exists(oldTaskSchedulesPath)) {
    if (fs.exists(taskSchedulesPath)) {
      throw new Error(`You have both ${taskSchedulesPath} and ${oldTaskSchedulesPath}.  Please remove one to continue!`);
    }
    warn(`tasks.json file is deprecated.  Please rename ${oldTaskSchedulesPath} to ${taskSchedulesPath}`);
    taskSchedulesPath = oldTaskSchedulesPath;
  }

  const readOptionalJson = path => fs.exists(path) ? fs.readJson(path) : undefined;
  const appSettings = fs.readJson(path.join(projectDir, 'app_settings.json'));
  appSettings.contact_summary = await compileContactSummary(projectDir, options);
  appSettings.tasks = {
    rules: await compileNoolsRules(projectDir, options),
    schedules: readOptionalJson(taskSchedulesPath),
    targets: parseTargets.json(projectDir),
  };

  const purgingFunction = parsePurgingFunction(projectDir);
  if (purgingFunction) {
    appSettings.purge = appSettings.purging || {};
    appSettings.purge.fn = purgingFunction;
  }

  return appSettings;
};

function applyTransforms(app_settings, inherited) {
  function doDelete(target, rules) {
    if (!Array.isArray(rules)) throw new Error('.delete should be an array');
  
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
    if (typeof rules !== 'object') throw new Error('.replace should be an object');
  
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
        if (Array.isArray(source[k])) target[k] = target[k].concat(source[k]);
        else if (typeof source[k] === 'object') doMerge(target[k], source[k]);
        else source[k] = target[k];
      });
  }

  function doFilter(target, rules) {
    if (typeof rules !== 'object') throw new Error('.filter should be an object');
  
    Object.keys(rules)
      .forEach(k => {
        const parts = k.split('.');
        let t = target;
        while(parts.length > 1) {
          t = t[parts[0]];
          parts.shift();
        }
  
        if (!Array.isArray(rules[k])) throw new Error('.filter values must be arrays!');
  
        Object.keys(t[parts[0]])
          .forEach(tK => {
            if (!rules[k].includes(tK)) delete t[parts[0]][tK];
          });
      });
  }

  doDelete(app_settings, inherited.delete);
  doReplace(app_settings, inherited.replace);
  doMerge(app_settings, inherited.merge);
  doFilter(app_settings, inherited.filter);
}

const parseExtraArgs = (extraArgs = []) => {
  const args = minimist(extraArgs, { boolean: true });
  return {
    minifyScripts: !args.debug,
    haltOnWebpackWarning: !args.debug,
    haltOnLintMessage: !args.debug,
  };
};

module.exports = compileAppSettings;
