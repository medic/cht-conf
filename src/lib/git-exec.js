const exec = require('./exec-promise');
const pluralize = require('pluralize');
const log = require('./log');

const GIT = 'git';    // Git command path
const NOT_FOUND_REGEX = new RegExp(`[(Cc)ommand|${GIT}].* not found`);

/**
 * Returns the working tree status in a string (files to commit),
 * or empty if the working tree is clean.
 *
 * If there is no git installation or git repository in the
 * working directory it warns a message with the issue and
 * returns `null`.
 */
module.exports.status = async () => {
  try {
    return await exec([GIT, 'status', '--porcelain'], log.LEVEL_NONE);
  } catch (e) {
    if (typeof e === 'string') {
      if (NOT_FOUND_REGEX.test(e)) {
        log.warn(`Command ${GIT} not found`);
        return null;
      }
      if (e.indexOf('not a git repository') >= 0) {
        log.warn('git repository not found');
        return null;
      }
      log.warn('git command could not be executed successfully -', e);
      return null;
    }
    throw e;
  }
};

/**
 * Returns a string with the upstream repository name
 * configured in the git repository in the working directory,
 * normally 'origin'.
 *
 * If there is more than one upstream, it returns 'origin' if
 * it is among the list, or the first found.
 *
 * Returns `null` if there are no upstreams repos configured.
 */
module.exports.getUpstream = async () => {
  const result = (await exec([GIT, 'remote'], log.LEVEL_NONE)).trim();
  if (result) {
    const lines = result.split('\n');
    if (lines.length > 1) {
      const upstream = lines.find(r=> r === 'origin');
      if (upstream) {
        return upstream;
      }
      return lines[0];
    }
    return result;
  }
  return null;
};

/**
 * Fetches the upstream repository and compares the current
 * branch against it, returning a message with the result whether it
 * is behind, ahead or both.
 *
 * Returns an empty string if it's in sync.
 *
 * If there is no upstream repository in the
 * working directory it warns a message with the issue and
 * returns `null`.
 */
module.exports.checkUpstream = async () => {
  await exec([GIT, 'fetch'], log.LEVEL_ERROR);
  const upstream = await module.exports.getUpstream();
  if (upstream === null) {
    log.warn('git upstream repository not found');
    return null;
  }
  try {
    const result = await exec([GIT, `rev-list --left-right --count ...${upstream}`], log.LEVEL_ERROR);
    const [ahead, behind] = result.split('\t').filter(s => s).map(Number);
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
  } catch (e) {
    if (typeof e === 'string') {
      if (e.indexOf('unknown revision or path') >= 0) {
        log.warn('git repository not found');
        return false;
      }
      throw new Error(e);
    }
    throw e;
  }
};
