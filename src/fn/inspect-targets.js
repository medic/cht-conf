/* eslint-disable no-console */
const getApi = require('../lib/api');
const { info } = require('../lib/log');
const environment = require('../lib/environment');

const execute = async () => {
  const api = getApi();
  const settings = await api.getAppSettings();
  
  const targets = settings.targets || [];

  if (environment.extraArgs.includes('--json')) {
    console.log(JSON.stringify(targets, null, 2));
    return;
  }

  info(`Found ${targets.length} deployed targets:`);
  targets.forEach((target, index) => {
    console.log(`${index + 1}. ${target.id || 'Unnamed target'} (${target.type || 'no type'})`);
  });
};

module.exports = {
  requiresInstance: true,
  execute
};
