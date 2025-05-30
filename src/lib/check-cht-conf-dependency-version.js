/**
 * Attempt to check that the version of cht-conf that a project relies on
 * matches the version of cht-conf being used to configure that project.
 */

const fs = require('./sync-fs');
const semver = require('semver');
const { warn } = require('./log');

const runningVersion = require('../../package.json').version;

module.exports = projectDir => {
  const projectVersion = readRequestedVersion(projectDir);
  if(!projectVersion) {
    warn('Project has no dependency on cht-conf.');
    return;
  }

  const majorRunningVersion = semver.major(runningVersion);
  let upgradeDowngradeLocalMsg = '';
  let upgradeDowngradeProjectMsg = '';
  const satisfiesLessThanMajorRunningVersion = semver.satisfies(projectVersion, `<${majorRunningVersion}.x`);
  const satisifiesGreaterThanRunningVersion = semver.satisfies(projectVersion, `>${runningVersion}`);

  if(satisfiesLessThanMajorRunningVersion || satisifiesGreaterThanRunningVersion) {

    if(satisfiesLessThanMajorRunningVersion) {
      upgradeDowngradeLocalMsg = 'Downgrade';
      upgradeDowngradeProjectMsg = 'update';
    }
    else if(satisifiesGreaterThanRunningVersion)
    {
      upgradeDowngradeLocalMsg = 'Upgrade';
      upgradeDowngradeProjectMsg = 'downgrade';
    }

    /* eslint-disable max-len */
    throw new Error(`Your cht-conf version is incompatible with the project's cht-conf version:
    Your local cht-conf version:   ${runningVersion}
    The project cht-conf version: ${projectVersion}
    
    Continuing without updating could cause this project to not compile or work as expected.
    
    ${upgradeDowngradeLocalMsg} your local cht-conf with:
        npm i -g cht-conf@${projectVersion}
    and try again, or ${upgradeDowngradeProjectMsg} the project cht-conf version to ${runningVersion}, or ignore this warning with --skip-dependency-check
    `);
    /* eslint-enable max-len */

  }
};

function readRequestedVersion(projectDir) {
  const path = `${projectDir}/package.json`;

  if(!fs.exists(path)) {
    warn(`No project package.json file found at ${path}`);
    return;
  }

  const json = fs.readJson(path);
  return (json.dependencies    && json.dependencies['cht-conf']) ||
         (json.devDependencies && json.devDependencies['cht-conf']);
}
