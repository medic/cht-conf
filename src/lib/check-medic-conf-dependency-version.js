/**
 * Attempt to check that the version of medic-conf that a project relies on
 * matches the version of medic-conf being used to configure that project.
 *
 * Currently this check is only performed as part of app-settings compilation;
 * if required in more places then we might move the check to the main CLI
 * script.
 * Is this second part true?
 */

const fs = require('./sync-fs');
const semver = require('semver');
const { warn} = require('./log');

const runningVersion = require('../../package.json').version;

module.exports = projectDir => {
  const projectVersion = readRequestedVersion(projectDir);
  if(!projectVersion) {
    warn('Project has no dependency on medic-conf.');
    return;
  }

  const majorRunningVersion = semver.major(runningVersion);
  if(semver.satisfies(projectVersion, `<${majorRunningVersion}.x || >${runningVersion}`)) {
    throw new Error(`medic-conf version ${runningVersion} does not match the project's required version: ${projectVersion}. To ignore this error, use --skip-dependency-check.`);
  }
};

function readRequestedVersion(projectDir) {
  const path = `${projectDir}/package.json`;

  if(!fs.exists(path)) {
    warn(`No project package.json file found at ${path}`);
    return;
  }

  const json = fs.readJson(path);
  return (json.dependencies    && json.dependencies['medic-conf']) ||
         (json.devDependencies && json.devDependencies['medic-conf']);
}
