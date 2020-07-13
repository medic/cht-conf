const exec = require('./exec-promise');
const pluralize = require('pluralize');

const GIT = 'git';    // Git command path

/**
 * Returns the working tree status in a string (files to commit),
 * or empty if the working tree is clean.
 */
module.exports.status = () => {
  return exec(GIT, 'status', '--porcelain');
};

/**
 * Sets up to date the local git repository fetching from
 * the upstream repository (but without auto-merge).
 */
module.exports.fetch = () => {
  return exec(GIT, 'fetch');
};

/**
 * Compares the current branch against the upstream and returns
 * a message with the result whether it is behind, ahead or both,
 * or returns an empty string if is in sync.
 */
module.exports.checkUpstream = async () => {
  const result = await exec(GIT, 'rev-list --left-right --count ...origin');
  const [ahead, behind] = result.split('\t').filter(s=>s).map(Number);
  if (ahead && behind) {
    return `branch is behind upstream by ${pluralize('commit', behind, true)} `
         + `and ahead by ${pluralize('commit', ahead, true)}`;
  }
  if (behind) {
    return `branch is behind upstream by ${pluralize('commit', behind, true)}`;
  }
  if (ahead) {
    return `branch is ahead upstream by ${pluralize('commit', ahead, true)}`;
  }
  return '';
};
