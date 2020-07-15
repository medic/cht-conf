const exec = require('./exec-promise');
const pluralize = require('pluralize');
const log = require('./log');

const GIT = 'git';    // Git command path

/**
 * Returns the working tree status in a string (files to commit),
 * or empty if the working tree is clean.
 */
module.exports.status = () => {
  return exec([GIT, 'status', '--porcelain'], log.LEVEL_ERROR);
};

/**
 * Fetches the upstream repository and compares the current
 * branch against it, returning a message with the result whether it
 * is behind, ahead or both. Returns an empty string if it s in sync.
 */
module.exports.checkUpstream = async () => {
  await exec([GIT, 'fetch'], log.LEVEL_ERROR);
  const result = await exec([GIT, 'rev-list --left-right --count ...origin'], log.LEVEL_ERROR);
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
