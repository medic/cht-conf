const semver = require('semver');

const api = require('../lib/api');
const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const { getValidApiVersion } = require('../lib/get-api-version');
const { info } = require('../lib/log');
const nools = require('../lib/nools-utils');
const { APP_SETTINGS_JSON_PATH } = require('../lib/project-paths');

const dryRunPurgeConfig = async api => {
  const appSettings = JSON.parse(fs.read(`${environment.pathToProject}/${APP_SETTINGS_JSON_PATH}`));
  await augmentDeclarativeWithNoolsBoilerplate(appSettings);

  const dryRunResult = await api.dryRunPurgeConfig(JSON.stringify(appSettings.purge));

  const {
    next_run: nextRun,
    wont_change_count: wontChangeCount,
    will_purge_count: willPurgeCount,
    will_unpurge_count: willUnpurgeCount,
  } = JSON.parse(dryRunResult);
  const nextRunDate = new Date(nextRun);

  info(`Next purge will run on ${nextRunDate.toDateString()} at ${nextRunDate.toTimeString()}`);
  info(`With current settings, next purge run will purge ${willPurgeCount} docs, unpurge ${willUnpurgeCount}, and leave ${wontChangeCount} untouched.`);
};

// https://github.com/medic/cht-core/issues/6506 added in 4.2
// augmented during upload so compile-app-settings doesn't require a url on the command-line
async function augmentDeclarativeWithNoolsBoilerplate(appSettings) {
  if (!appSettings || !appSettings.tasks || !appSettings.tasks.isDeclarative) {
    return;
  }

  const actualCoreVersion = await getValidApiVersion(appSettings);
  const addNoolsBoilerplate = semver.lt(actualCoreVersion, '4.2.0-dev');
  if (addNoolsBoilerplate) {
    appSettings.tasks.rules = nools.addBoilerplateToCode(appSettings.tasks.rules);

    // do not set the isDeclarative flag when the code has nools boilerplate
    delete appSettings.tasks.isDeclarative;
  }
}

module.exports = {
  dryRunPurgeConfig,
  requiresInstance: true,
  execute: () => dryRunPurgeConfig(api())
};
