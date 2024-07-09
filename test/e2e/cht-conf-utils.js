const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const fse = require('fs-extra');

const log = require('../../src/lib/log');
const { getProjectUrl } = require('./cht-docker-utils');

const getProjectDirectory = (projectName) => path.resolve(__dirname, `../../build/${projectName}`);

const runChtConf = (projectName, command) => new Promise((resolve, reject) => {
  getProjectUrl(projectName).then(url => {
    const projectDirectory = getProjectDirectory(projectName);
    const cliPath = path.join(__dirname, '../../src/bin/index.js');
    exec(`node ${cliPath} --url=${url} ${command}`, { cwd: projectDirectory }, (error, stdout, stderr) => {
      if (!error) {
        return resolve(stdout);
      }

      log.error(stderr);
      reject(new Error(stdout.toString('utf8')));
    });
  });
});

const cleanupProject = (projectName) => {
  const projectDirectory = getProjectDirectory(projectName);
  fse.removeSync(projectDirectory);
};

const initProject = async (projectName) => {
  const projectDirectory = getProjectDirectory(projectName);
  if (fs.existsSync(projectDirectory)) {
    fse.removeSync(projectDirectory);
  }

  fse.mkdirpSync(projectDirectory);
  fs.writeFileSync(
    path.join(projectDirectory, 'package.json'),
    JSON.stringify({
      name: 'e2e-edit-app-settings',
      version: '1.0.0',
      dependencies: {
        'cht-conf': 'file:../..',
      },
    }, null, 4),
  );

  await runChtConf(projectName, 'initialise-project-layout');
};

module.exports = {
  cleanupProject,
  getProjectDirectory,
  initProject,
  runChtConf,
};
