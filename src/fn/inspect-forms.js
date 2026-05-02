/* eslint-disable no-console */
const getApi = require('../lib/api');
const { info } = require('../lib/log');
const environment = require('../lib/environment');

const execute = async () => {
  const api = getApi();
  const settings = await api.getAppSettings();
  
  const forms = settings.forms || {};
  const formIds = Object.keys(forms);

  if (environment.extraArgs.includes('--json')) {
    console.log(JSON.stringify(formIds, null, 2));
    return;
  }

  info(`Found ${formIds.length} deployed forms:`);
  formIds.forEach(id => console.log(`- ${id}`));
};

module.exports = {
  requiresInstance: true,
  execute
};
