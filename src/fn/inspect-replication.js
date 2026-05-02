/* eslint-disable no-console */
const getApi = require('../lib/api');
const { info, error } = require('../lib/log');
const environment = require('../lib/environment');
const url = require('node:url');

const execute = async () => {
  const api = getApi();
  
  try {
    const parsedUrl = new url.URL(environment.apiUrl);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.username}:${parsedUrl.password}@${parsedUrl.host}`;
    
    // CouchDB active tasks
    const activeTasks = await api.get({ url: `${baseUrl}/_active_tasks`, json: true });
    
    const replications = activeTasks.filter(task => task.type === 'replication');

    if (environment.extraArgs.includes('--json')) {
      console.log(JSON.stringify(replications, null, 2));
      return;
    }

    info(`Found ${replications.length} active replication tasks:`);
    replications.forEach(task => {
      console.log(`- Task: ${task.task || task.replication_id}`);
      console.log(`  Source: ${task.source}`);
      console.log(`  Target: ${task.target}`);
      console.log(`  Status: ${task.docs_written} docs written, ${task.docs_read} read. Prog: ${task.progress}%`);
    });
  } catch (err) {
    error(`Failed to fetch replication status: ${err.message}`);
  }
};

module.exports = {
  requiresInstance: true,
  execute
};
