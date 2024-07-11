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
  if (fs.existsSync(projectDirectory)) {
    fse.removeSync(projectDirectory);
  }
};

const initProject = async (projectName) => {
  const projectDirectory = getProjectDirectory(projectName);
  cleanupProject(projectName);

  fse.mkdirpSync(projectDirectory);
  fs.writeFileSync(
    path.join(projectDirectory, 'package.json'),
    JSON.stringify({
      name: projectName,
      version: '1.0.0',
      dependencies: {
        'cht-conf': 'file:../..',
      },
    }, null, 4),
  );

  await runChtConf(projectName, 'initialise-project-layout');
};

const writeBaseAppSettings = async (projectName, baseSettings) => {
  const projectDirectory = getProjectDirectory(projectName);

  return await fs.promises.writeFile(
    path.join(projectDirectory, 'app_settings/base_settings.json'),
    JSON.stringify(baseSettings, null, 2),
  );
};

const readCompiledAppSettings = async (projectName) => {
  const projectDirectory = getProjectDirectory(projectName);

  return JSON.parse(
    await fs.promises.readFile(path.join(projectDirectory, 'app_settings.json'), 'utf8')
  );
};

module.exports = {
  cleanupProject,
  getProjectDirectory,
  initProject,
  runChtConf,
  readCompiledAppSettings,
  writeBaseAppSettings,
};
