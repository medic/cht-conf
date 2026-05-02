/* eslint-disable no-console */
const getApi = require('../lib/api');
const { info } = require('../lib/log');
const environment = require('../lib/environment');
const jsonDiff = require('json-diff');
const fs = require('../lib/sync-fs');
const path = require('path');

const execute = async () => {
  const api = getApi();
  const remoteSettings = await api.getAppSettings();
  
  // Try to find local settings
  let localSettings;
  const projectDir = environment.pathToProject;
  
  // Try app_settings.json first
  const appSettingsPath = path.join(projectDir, 'app_settings.json');
  if (fs.exists(appSettingsPath)) {
    localSettings = fs.readJson(appSettingsPath);
  } else {
    // Try compiled settings (assuming they might have been compiled already)
    // Or we should trigger a compilation here?
    // For now, let's just look for app_settings/ directory and maybe warn.
    info('app_settings.json not found. To compare modular settings, please compile them first.');
    return;
  }

  const diff = jsonDiff.diffString(remoteSettings, localSettings);

  if (environment.extraArgs.includes('--json')) {
    console.log(JSON.stringify(jsonDiff.diff(remoteSettings, localSettings), null, 2));
    return;
  }

  if (!diff) {
    info('Local and remote settings are in sync.');
  } else {
    info('Differences found between local and remote settings:');
    console.log(diff);
  }
};

module.exports = {
  requiresInstance: true,
  execute
};
