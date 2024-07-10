const path = require('path');
const fs = require('fs');
const https = require('https');
const { spawn } = require('child_process');
const request = require('request-promise-native');

const log = require('../../src/lib/log');

const DEFAULT_PROJECT_NAME = 'cht_conf_e2e_tests';
const dockerHelperDirectory = path.resolve(__dirname, '.cht-docker-helper');
const dockerHelperScript = path.resolve(dockerHelperDirectory, './cht-docker-compose.sh');

const downloadDockerHelperScript = () => new Promise((resolve, reject) => {
  const file = fs.createWriteStream(dockerHelperScript, { mode: 0o755 });
  https
    .get('https://raw.githubusercontent.com/medic/cht-core/master/scripts/docker-helper-4.x/cht-docker-compose.sh', (response) => {
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', () => file.close(reject));
    })
    .on('error', () => {
      fs.unlinkSync(file.path);
      file.close(() => reject('Failed to download CHT Docker Helper script "cht-docker-compose.sh"'));
    });
});

const ensureScriptExists = async () => {
  if (!fs.existsSync(dockerHelperDirectory)) {
    await fs.promises.mkdir(dockerHelperDirectory);
  }

  if (!fs.existsSync(dockerHelperScript)) {
    await downloadDockerHelperScript();
  }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getProjectConfig = async (projectName) => {
  try {
    const configFile = await fs.promises.readFile(path.resolve(dockerHelperDirectory, `${projectName}.env`), 'utf8');
    return Object.fromEntries(
      configFile.toString()
        .split('\n')
        .map(line => line.split('='))
        .filter(entry => entry.length === 2),
    );
  } catch (error) {
    log.error(error);
    return {
      COUCHDB_USER: 'medic',
      COUCHDB_PASSWORD: 'password',
      NGINX_HTTPS_PORT: '10443',
    };
  }
};

const getProjectUrl = async (projectName = DEFAULT_PROJECT_NAME) => {
  const config = await getProjectConfig(projectName);
  const { COUCHDB_USER, COUCHDB_PASSWORD, NGINX_HTTPS_PORT } = config;
  return `https://${COUCHDB_USER}:${COUCHDB_PASSWORD}@127-0-0-1.local-ip.medicmobile.org:${NGINX_HTTPS_PORT}`;
};

const isProjectReady = async (projectName, attempt = 1) => {
  log.info(`Checking if CHT is ready, attempt ${attempt}.`);
  const url = await getProjectUrl(projectName);
  await request({ uri: `${url}/api/v2/monitoring`, json: true })
    .catch(async (error) => {
      if (
        error.error.code !== 'DEPTH_ZERO_SELF_SIGNED_CERT' ||
        ![502, 503].includes(error.statusCode)
      ) {
        // unexpected error, log it to keep a trace,
        // but we'll keep retrying until the instance is up, or we hit the timeout limit
        log.trace(error);
      }

      await sleep(1000);
      return isProjectReady(projectName, attempt + 1);
    });
};

const startProject = (projectName) => new Promise((resolve, reject) => {
  const configFile = path.resolve(dockerHelperDirectory, `${projectName}.env`);
  if (fs.existsSync(configFile)) {
    // project config already exists, reuse it
    const childProcess = spawn(dockerHelperScript, [`${projectName}.env`, 'up'], { cwd: dockerHelperDirectory });
    childProcess.on('error', reject);
    childProcess.on('close', resolve);
  } else {
    // initialize a new project, config will be saved to `${projectName}.env`
    // stdio: 'pipe' to answer the prompts to initialize a project by writing to stdin
    const childProcess = spawn(dockerHelperScript, { stdio: 'pipe', cwd: dockerHelperDirectory });
    childProcess.on('error', reject);
    childProcess.on('close', async () => {
      await isProjectReady(projectName);
      resolve();
    });

    childProcess.stdin.write('y\n');
    childProcess.stdin.write('y\n');
    childProcess.stdin.write(`${projectName}\n`);
  }
});

const destroyProject = (projectName) => new Promise((resolve, reject) => {
  // stdio: 'inherit' to see the script's logs and understand why it requests elevated permissions when cleaning up project files
  const childProcess = spawn(dockerHelperScript, [`${projectName}.env`, 'destroy'], {
    stdio: 'inherit',
    cwd: dockerHelperDirectory
  });
  childProcess.on('error', reject);
  childProcess.on('close', resolve);
});

const spinUpCht = async (projectName = DEFAULT_PROJECT_NAME) => {
  await ensureScriptExists();
  await startProject(projectName);
};

const tearDownCht = async (projectName = DEFAULT_PROJECT_NAME) => {
  if (!fs.existsSync(path.resolve(dockerHelperDirectory, `${projectName}.env`))) {
    return;
  }

  await ensureScriptExists();
  await destroyProject(projectName);
};

module.exports = {
  DEFAULT_PROJECT_NAME,
  getProjectUrl,
  spinUpCht,
  tearDownCht,
};
