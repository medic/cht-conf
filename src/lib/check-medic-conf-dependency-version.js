/**
 * Attempt to check that the version of medic-conf that a project relies on
 * matches the version of medic-conf being used to configure that project.
 */

const fs = require('./sync-fs');
const semver = require('semver');
const { warn } = require('./log');

const runningVersion = require('../../package.json').version;

module.exports = projectDir => {
  const projectVersion = readRequestedVersion(projectDir);
  if(!projectVersion) {
    warn('Project has no dependency on medic-conf.');
    return;
  }

  const majorRunningVersion = semver.major(runningVersion);
  if(semver.satisfies(projectVersion, `<${majorRunningVersion}.x || >${runningVersion}`)) {
    throw new Error(`Your medic-conf version is incompatible with the project's medic-conf version:
    Yours:  ${runningVersion}
    Theirs: ${projectVersion}
    
    Continuing without updating could cause this project to not compile or work as expected.
    
    Update your local medic-conf with:
     npm i -g medic-conf@${projectVersion}
    and try again, or update the project to your current version, or ignore this warning with --skip-dependency-check
    `);
  
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
