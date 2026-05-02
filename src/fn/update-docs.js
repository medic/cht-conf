const path = require('path');
const os = require('os');
const fs = require('../lib/sync-fs');
const { info, error } = require('../lib/log');
const getApi = require('../lib/api');

const DOCS_DIR = path.join(os.homedir(), '.cht-conf', 'docs');
const REPO_URL = 'https://raw.githubusercontent.com/medic/cht-docs/master/content/en/core/6.x/configuring';

const FILES_TO_FETCH = [
  'forms.md',
  'tasks.js.md',
  'targets.js.md',
  'contact-summary.js.md',
];

const execute = async () => {
  const api = getApi();
  
  if (!fs.exists(DOCS_DIR)) {
    fs.mkdir(DOCS_DIR);
  }

  info(`Fetching fresh documentation to ${DOCS_DIR}...`);

  for (const file of FILES_TO_FETCH) {
    const url = `${REPO_URL}/${file}`;
    try {
      // Use the generic get we just added to api.js
      const content = await api.get({ uri: url });
      const localPath = path.join(DOCS_DIR, file);
      fs.write(localPath, content);
      info(`- Fetched ${file}`);
    } catch (err) {
      error(`- Failed to fetch ${file}: ${err.message}`);
    }
  }
  
  info('Documentation update complete.');
};

module.exports = {
  requiresInstance: false,
  execute
};
