const git = require('../lib/git-exec');
const { info, warn } = require('../lib/log');
const userPrompt = require('../lib/user-prompt');
const environment = require('../lib/environment');

module.exports = {
  requiresInstance: false,
  execute: async () => {
    if (!environment.isProduction() && environment.instanceUrl) {
      // is not production and there is an instance URL set
      return info('No production environment detected: skipping check-git…');
    }
    const status = await git.status();
    if (status !== null) {
      if (status !== '') {
        warn('There are changes in your local branch to be committed or ' +
          'not staged for commit.');
        warn('Changes untracked or to be committed:\n' + status);
        if (!userPrompt.keyInYN('Are you sure you want to continue?')) {
          throw new Error('User aborted execution.');
        }
      }
      info('Fetching git upstream...');
      const syncStatus = await git.checkUpstream();
      if (syncStatus) {
        warn(syncStatus);
        if (!userPrompt.keyInYN('Are you sure you want to continue?')) {
          throw new Error('User aborted execution.');
        }
      }
    }
  }
};
