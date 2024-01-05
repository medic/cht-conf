const semver = require('semver');

const api = require('../lib/api');
const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const { getValidApiVersion } = require('../lib/get-api-version');
const { info } = require('../lib/log');
const nools = require('../lib/nools-utils');
const { APP_SETTINGS_DIR_PATH, APP_SETTINGS_JSON_PATH } = require('../lib/project-paths');

const uploadAppSettings = async api => {
  const appSettings = JSON.parse(fs.read(`${environment.pathToProject}/${APP_SETTINGS_JSON_PATH}`));
  await augmentDeclarativeWithNoolsBoilerplate(appSettings);
  
  const requestResult = await api.updateAppSettings(JSON.stringify(appSettings));
  const json = JSON.parse(requestResult);
  // As per https://github.com/medic/cht-core/issues/3674, this endpoint
  // will return 200 even when upload fails.
  if (!json.success) {
    throw new Error(json.error);
  }

  if ('updated' in json) {
    // the `updated` param was added in 3.9
    // https://github.com/medic/cht-core/issues/6315
    if (!json.updated) {
      info('Settings not updated - no changes detected');
    } else {
      info('Settings updated successfully');
    }
  }
};

// https://github.com/medic/cht-core/issues/6506 added in 4.2
// augmented during upload so compile-app-settings doesn't require a url on the command-line
async function augmentDeclarativeWithNoolsBoilerplate(appSettings) {
  if (!appSettings || !appSettings.tasks || !appSettings.tasks.isDeclarative) {
    return;
  }

  const actualCoreVersion = await getValidApiVersion(appSettings);
  const addNoolsBoilerplate = actualCoreVersion && semver.lt(actualCoreVersion, '4.2.0-dev');
  if (addNoolsBoilerplate) {
    appSettings.tasks.rules = nools.addBoilerplateToCode(appSettings.tasks.rules);

    // do not set the isDeclarative flag when the code has nools boilerplate
    delete appSettings.tasks.isDeclarative;
  }
}

module.exports = {
  uploadAppSettings,
  APP_SETTINGS_DIR_PATH,
  APP_SETTINGS_JSON_PATH,
  requiresInstance: true,
  execute: () => uploadAppSettings(api())
};
