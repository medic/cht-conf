const minimist = require('minimist');
const path = require('path');
const compileContactSummary = require('../lib/compile-contact-summary');
const compileNoolsRules = require('../lib/compile-nools-rules');
const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const parseTargets = require('../lib/parse-targets');
const { warn } = require('../lib/log');
const parsePurge = require('../lib/parse-purge');

const compileAppSettings = async () => {
  const options = parseExtraArgs(environment.extraArgs);
  const projectDir = path.resolve(environment.pathToProject);

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
  // Manual configurations should be done in the base-settings.json file
  // This check and warning can be removed when all project configurations have this new file defined
  let appSettings = fs.readJson(path.join(projectDir, 'app_settings.json'));
  const baseSettingsPath = path.join(projectDir, 'app-settings/base-settings.json');
  if (fs.exists(baseSettingsPath)) {
    appSettings = fs.readJson(baseSettingsPath);
  } else {
    warn(`app_settings.json file should not be edited directly.
    Please create a base-settings.json file and move any manually defined configurations there.`);
  }
  const formSettings = readOptionalJson(path.join(projectDir, 'app-settings/forms.json'));
  if (formSettings) {
    if (appSettings.forms && Object.keys(appSettings.forms).length !== 0) {
      throw new Error(`forms is defined in both the base settings and the forms.json file.`);
    }
    appSettings.forms = formSettings;
  }
  const scheduleSettings = readOptionalJson(path.join(projectDir, 'app-settings/schedules.json'));
  if (scheduleSettings) {
    if (appSettings.schedules && appSettings.schedules.length !== 0) {
      throw new Error(`schedules is defined in both the base settings and the schedules.json file.`);
    }
    appSettings.schedules = scheduleSettings;
  }
  appSettings.contact_summary = await compileContactSummary(projectDir, options);
  appSettings.tasks = {
    rules: await compileNoolsRules(projectDir, options),
    schedules: readOptionalJson(taskSchedulesPath),
    targets: parseTargets(projectDir),
  };

  const purgeConfig = parsePurge(projectDir);
  if (purgeConfig) {
    appSettings.purge = purgeConfig;
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
    haltOnSchemaError: !args.debug,
  };
};

module.exports = {
  requiresInstance: false,
  execute: compileAppSettings
};
