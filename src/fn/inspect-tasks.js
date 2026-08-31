/* eslint-disable no-console */
const getApi = require('../lib/api');
const { info } = require('../lib/log');
const environment = require('../lib/environment');

const execute = async () => {
  const api = getApi();
  const settings = await api.getAppSettings();
  
  const tasks = settings.tasks || [];

  if (environment.extraArgs.includes('--json')) {
    console.log(JSON.stringify(tasks, null, 2));
    return;
  }

  info(`Found ${tasks.length} deployed tasks:`);
  tasks.forEach((task, index) => {
    console.log(`${index + 1}. ${task.name || 'Unnamed task'} (${task.icon || 'no icon'})`);
  });
};

module.exports = {
  requiresInstance: true,
  execute
};
