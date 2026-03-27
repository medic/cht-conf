const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const fse = require('fs-extra');

const log = require('../../src/lib/log');
const { getProjectUrl, DEFAULT_PROJECT_NAME } = require('./cht-docker-utils');

const getProjectDirectory = (projectName = DEFAULT_PROJECT_NAME) => path
  .resolve(__dirname, `../../build/${projectName}`);

const runChtConf = async (
  command,
  { url, sessionToken, projectName = DEFAULT_PROJECT_NAME } = {},
) => {
  const instanceUrl = url || await getProjectUrl(projectName);
  const sessionParam = sessionToken ? `--session-token=${sessionToken}` : '';
  const projectDirectory = getProjectDirectory(projectName);
  const cliPath = path.join(__dirname, '../../src/bin/index.js');
  return new Promise((resolve, reject) => {
    exec(
      `node ${cliPath} --url=${instanceUrl} ${sessionParam} ${command}`,
      { cwd: projectDirectory },
      (error, stdout, stderr) => {
        if (!error) {
          return resolve(stdout);
        }

        log.error(stderr);
        reject(new Error(stdout.toString('utf8')));
      }
    );
  });
};

const cleanupProject = (projectName = DEFAULT_PROJECT_NAME) => {
  const projectDirectory = getProjectDirectory(projectName);
  if (fs.existsSync(projectDirectory)) {
    fse.removeSync(projectDirectory);
  }
};

const initProject = async (projectName = DEFAULT_PROJECT_NAME) => {
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

  await runChtConf('initialise-project-layout', { projectName });
};

const writeBaseAppSettings = async (baseSettings, projectName = DEFAULT_PROJECT_NAME) => {
  const projectDirectory = getProjectDirectory(projectName);

  return await fs.promises.writeFile(
    path.join(projectDirectory, 'app_settings/base_settings.json'),
    JSON.stringify(baseSettings, null, 2),
  );
};

const readCompiledAppSettings = async (projectName = DEFAULT_PROJECT_NAME) => {
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
