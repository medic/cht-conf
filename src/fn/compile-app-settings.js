const minimist = require('minimist');
const path = require('path');

const compilation = require('../lib/compilation');
const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const parsePurge = require('../lib/parse-purge');
const parseTargets = require('../lib/parse-targets');
const { warn } = require('../lib/log');
const validateAppSettings = require('../lib/validate-app-settings');
const { APP_SETTINGS_DIR_PATH, APP_SETTINGS_JSON_PATH } = require('../lib/project-paths');

// we can't use named capture groups yet
const JS_FILE_MATCHER = /^(.+)(\.js)$/; // 2 groups get the file name and extension
const JSON_FILE_MATCHER = /^(.+)(\.json)$/;
const configFileMatcher = (fileName) => {
  const jsFileMatchResult = fileName.match(JS_FILE_MATCHER);
  // the first element is always the whole matched string, then our first file name group
  if (jsFileMatchResult) {
    return jsFileMatchResult[1];
  }

  const jsonFileMatchResult = fileName.match(JSON_FILE_MATCHER);
  if (jsonFileMatchResult) {
    return jsonFileMatchResult[1];
  }

  return null;
};

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

  fs.writeJson(path.join(projectDir, APP_SETTINGS_JSON_PATH), appSettings);
};

const compileAppSettingsForProject = async (projectDir, options) => {
  // Helpful support for refactoring tasks.json to task-schedules.json
  // This warning can be removed when all projects have moved to the new layout.
  let taskSchedulesPath = path.join(projectDir, 'task-schedules.json');
  const oldTaskSchedulesPath = path.join(projectDir, 'tasks.json');
  if (fs.exists(oldTaskSchedulesPath)) {
    if (fs.exists(taskSchedulesPath)) {
      throw new Error(
        `You have both ${taskSchedulesPath} and ${oldTaskSchedulesPath}.  Please remove one to continue!`
      );
    }
    warn(`tasks.json file is deprecated.  Please rename ${oldTaskSchedulesPath} to ${taskSchedulesPath}`);
    taskSchedulesPath = oldTaskSchedulesPath;
  }

  const readOptionalJson = path => fs.exists(path) ? fs.readJson(path) : undefined;
  let appSettings;
  const baseSettingsPath = path.join(projectDir, `${APP_SETTINGS_DIR_PATH}/base_settings.json`);
  const appSettingsPath = path.join(projectDir, APP_SETTINGS_JSON_PATH);
  const esLintFilePath = path.join(projectDir, '.eslintrc');
  const parseMaxTaskNotifications = (maxTaskNotifications) => {
    if (typeof maxTaskNotifications !== 'number' || !Number.isInteger(maxTaskNotifications) ||
      maxTaskNotifications < 0) {
      throw new Error('max_task_notifications should be a positive integer number');
    }
    return maxTaskNotifications;
  };

  // Fail if no eslintrc file is found
  if (!fs.exists(esLintFilePath)) {
    throw new Error('No eslint configuration defined please create a .eslintrc file with the desired linting rules');
  }

  if (!fs.exists(baseSettingsPath) && !fs.exists(appSettingsPath)) {
    throw new Error(
      'No configuration defined please create a base_settings.json file in app_settings folder ' +
      'with the desired configuration'
    );
  }
  if (fs.exists(baseSettingsPath)) {
    // using modular config so should override anything already defined in app_settings.json
    appSettings = fs.readJson(baseSettingsPath);
    if (appSettings.forms) {
      warn('forms should be defined in a separate <config_repo>/app_settings/forms.json file.');
    }
    if (appSettings.schedules) {
      warn('schedules should be defined in a separate <config_repo>/app_settings/schedules.json file.');
    }
    const formSettings = readOptionalJson(path.join(projectDir, 'app_settings/forms.json'));
    if (formSettings) {
      // validate forms object
      const validate = validateAppSettings.validateFormsSchema(formSettings);
      if (!validate.valid) {
        throw new Error(`Invalid form settings: ${validate.error}`);
      }
      appSettings.forms = formSettings;
    }
    const scheduleSettings = readOptionalJson(path.join(projectDir, 'app_settings/schedules.json'));
    if (scheduleSettings) {
      // validate schedules object
      const validate = validateAppSettings.validateScheduleSchema(scheduleSettings);
      if (!validate.valid) {
        throw new Error(`Invalid schedule settings: ${validate.error}`);
      }
      appSettings.schedules = scheduleSettings;
    }

    const assetlinks = readOptionalJson(path.join(projectDir, 'app_settings/assetlinks.json'));
    if (assetlinks) {
      const validate = validateAppSettings.validateAssetlinks(assetlinks);
      if (!validate.valid) {
        throw new Error(`Invalid assetlinks: ${validate.error}`);
      }
      appSettings.assetlinks = assetlinks;
    }
  } else {
    warn(
      `app_settings.json file should not be edited directly.
    Please create a base_settings.json file in app_settings folder and move any manually defined configurations there.`
    );
    appSettings = fs.readJson(appSettingsPath);
  }

  appSettings.contact_summary = await compilation.compileContactSummary(projectDir, options);
  const compiledTasksAndTargets = await compilation.compileTasksAndTargets(projectDir, options);
  appSettings.tasks = {
    rules: compiledTasksAndTargets.rules,
    isDeclarative: compiledTasksAndTargets.isDeclarative,
    schedules: readOptionalJson(taskSchedulesPath),
    targets: parseTargets(projectDir),
  };

  if (appSettings.max_task_notifications) {
    appSettings.tasks.max_task_notifications = parseMaxTaskNotifications(appSettings.max_task_notifications);
    delete appSettings.max_task_notifications;
  }

  const purgeConfig = parsePurge(projectDir);
  if (purgeConfig) {
    appSettings.purge = purgeConfig;
  }
  else{
    warn('Setting purge configuration to empty object as purge.js and purging.js files were not found.');
    appSettings.purge = {};
  }
  return appSettings;
};

function applyTransforms(app_settings, inherited) {
  function doDelete(target, rules) {
    if (!Array.isArray(rules)) {
      throw new Error('.delete should be an array');
    }

    rules.forEach(k => {
      const parts = k.split('.');
      let t = target;
      while (parts.length > 1) {
        t = t[parts[0]];
        parts.shift();
      }
      delete t[parts[0]];
    });
  }

  function doReplace(target, rules) {
    if (typeof rules !== 'object') {
      throw new Error('.replace should be an object');
    }

    Object.keys(rules)
      .forEach(k => {
        const parts = k.split('.');
        let t = target;
        while (parts.length > 1) {
          t = t[parts[0]];
          parts.shift();
        }
        t[parts[0]] = rules[k];
      });
  }

  function doMerge(target, source) {
    Object.keys(target)
      .forEach(k => {
        if (Array.isArray(source[k])) {
          target[k] = target[k].concat(source[k]);
        }
        else if (typeof source[k] === 'object') {
          doMerge(target[k], source[k]);
        }
        else {
          source[k] = target[k];
        }
      });
  }

  function doFilter(target, rules) {
    if (typeof rules !== 'object') {
      throw new Error('.filter should be an object');
    }

    Object.keys(rules)
      .forEach(k => {
        const parts = k.split('.');
        let t = target;
        while (parts.length > 1) {
          t = t[parts[0]];
          parts.shift();
        }

        if (!Array.isArray(rules[k])) {
          throw new Error('.filter values must be arrays!');
        }

        Object.keys(t[parts[0]])
          .forEach(tK => {
            if (!rules[k].includes(tK)) {
              delete t[parts[0]][tK];
            }
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
  APP_SETTINGS_DIR_PATH,
  configFileMatcher,
  execute: compileAppSettings
};
