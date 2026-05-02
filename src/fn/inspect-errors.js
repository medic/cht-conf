/* eslint-disable no-console */
const getApi = require('../lib/api');
const { info, error } = require('../lib/log');
const environment = require('../lib/environment');
const url = require('url');

const execute = async () => {
  const api = getApi();
  
  try {
    const parsedUrl = new url.URL(environment.apiUrl);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.username}:${parsedUrl.password}@${parsedUrl.host}`;
    
    // Fetch recent documents from medic-logs
    const limit = 20;
    const logsUrl = `${baseUrl}/medic-logs/_all_docs?include_docs=true&descending=true&limit=${limit}`;
    const result = await api.get({ url: logsUrl, json: true });
    
    const errors = result.rows
      .map(row => row.doc)
      .filter(doc => doc && !doc._id.startsWith('_design/'));

    if (environment.extraArgs.includes('--json')) {
      console.log(JSON.stringify(errors, null, 2));
      return;
    }

    info(`Recent ${errors.length} log/error entries from medic-logs:`);
    errors.forEach((errDoc, i) => {
      console.log(`${i + 1}. [${errDoc.timestamp || errDoc.created || errDoc._id}] ${errDoc.type || 'unknown type'}`);
      if (errDoc.error || errDoc.message) {
        console.log(`   Message: ${errDoc.error || errDoc.message}`);
      }
      if (errDoc.action) {
        console.log(`   Action: ${errDoc.action}`);
      }
    });
  } catch (err) {
    if (err.statusCode === 404) {
      error('Could not access medic-logs database. Ensure you have the right permissions or the database exists.');
    } else {
      error(`Failed to fetch errors: ${err.message}`);
    }
  }
};

module.exports = {
  requiresInstance: true,
  execute
};
