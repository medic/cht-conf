const git = require('../lib/git-exec');
const { info, warn, error } = require('../lib/log');
const userPrompt = require('../lib/user-prompt');

module.exports = {
  requiresInstance: false,
  execute: async () => {
    const status = await git.status();
    if (status !== null) {
      if (status !== '') {
        warn('There are changes in your local branch to be committed or ' +
          'not staged for commit.');
        warn('Changes untracked or to be committed:\n' + status);
        if (!userPrompt.keyInYN('Are you sure you want to continue?')) {
          error('User failed to confirm action.');
          process.exit(-1);
        }
      }
      info('Fetching git upstream...');
      const syncStatus = await git.checkUpstream();
      if (syncStatus) {
        warn(syncStatus);
        if (!userPrompt.keyInYN('Are you sure you want to continue?')) {
          error('User failed to confirm action.');
          process.exit(-1);
        }
      }
    }
  }
};
