const git = require('../lib/git-exec');
const { warn, error } = require('../lib/log');
const readline = require('readline-sync');

module.exports = {
  requiresInstance: false,
  execute: async () => {
    const status = await git.status();
    if (status) {
      warn('There are changes in your local branch to be committed or ' +
           'not staged for commit.');
      warn('Changes untracked or to be committed:\n' + status);
      if(!readline.keyInYN('Are you sure you want to continue?')) {
        error('User failed to confirm action.');
        process.exit(-1);
      }
    }
    await git.fetch();
    const syncStatus = await git.checkUpstream();
    if (syncStatus) {
      warn(syncStatus);
      if(!readline.keyInYN('Are you sure you want to continue?')) {
        error('User failed to confirm action.');
        process.exit(-1);
      }
    }
  }
};