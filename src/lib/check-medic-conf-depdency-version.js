/**
 * Attempt to check that the version of medic-conf that a project relies on
 * matches the version of medic-conf being used to configure that project.
 *
 * Currently this check is only performed as part of app-settings compilation;
 * if required in more places then we might move the check to the main CLI
 * script.
 */

const error = require('./log').error;
const fs = require('./sync-fs');
const readline = require('readline-sync');
const semver = require('semver');
const warn = require('./log').warn;

module.exports = projectDir => {
  const myVersion = require('../../package.json').version;

  const theirPackageVersion = readRequestedVersion(projectDir);
  if(!theirPackageVersion) {
    warn('Project has no dependency on medic-conf.  It may not have any tests.');
    return;
  }
  if(!semver.satisfies(myVersion, theirPackageVersion)) {
    throw new Error(`medic-conf version ${myVersion} does not match the project's required version: ${theirPackageVersion}`);
  }

  const theirLockedVersion = readLockedVersion(projectDir);
  if(!theirLockedVersion) throw new Error('medic-conf requested in package.json but not found in package-lock.json!');
  if(myVersion !== theirLockedVersion) requestUserConfirmation(myVersion, theirLockedVersion);
};

function requestUserConfirmation(myVersion, theirLockedVersion) {
  warn(`medic-conf version is ${myVersion}, but project is tested against ${theirLockedVersion}.  Are you sure you want to continue?`);
  if(!readline.keyInYN()) {
    error('User failed to confirm action.');
    process.exit(1);
  }
}

function readLockedVersion(projectDir) {
  const path = `${projectDir}/package-lock.json`;

  if(!fs.exists(path)) {
    warn('No package-lock.json found.  This file should be committed!');
    return;
  }

  const json = fs.readJson(path);

  return json &&
         json.dependencies &&
         json.dependencies['medic-conf'] &&
         json.dependencies['medic-conf'].version;
}

function readRequestedVersion(projectDir) {
  const path = `${projectDir}/package.json`;

  if(!fs.exists(path)) {
    warn('No package.json file found.  This project may be missing tests, or improperly set up.');
    return;
  }

  const json = fs.readJson(path);

  return (json.dependencies    && json.dependencies['medic-conf']) ||
         (json.devDependencies && json.devDependencies['medic-conf']);
}
