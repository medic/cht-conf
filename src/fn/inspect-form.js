/* eslint-disable no-console */
const getApi = require('../lib/api');
const { info, error } = require('../lib/log');
const environment = require('../lib/environment');

const execute = async () => {
  const formId = environment.extraArgs.find(arg => !arg.startsWith('-'));
  if (!formId) {
    error('Please specify a form ID: cht inspect-form <id>');
    return;
  }

  const api = getApi();
  const settings = await api.getAppSettings();
  
  const form = settings.forms && settings.forms[formId];
  if (!form) {
    error(`Form ${formId} not found in deployed settings.`);
    return;
  }

  if (environment.extraArgs.includes('--json')) {
    console.log(JSON.stringify(form, null, 2));
    return;
  }

  info(`Form details for ${formId}:`);
  console.log(JSON.stringify(form, null, 2));
};

module.exports = {
  requiresInstance: true,
  execute
};
