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
    // TODO: switch back to using `master` branch of cht-core once DNS issue is resolved - https://github.com/medic/medic-infrastructure/issues/571#issuecomment-2209120441
    .get('https://raw.githubusercontent.com/medic/cht-core/dnm-docker-helper-experiments/scripts/docker-helper-4.x/cht-docker-compose.sh', (response) => {
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
      if (error.error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
        await sleep(1000);
        return isProjectReady(projectName, attempt + 1);
      }

      if ([502, 503].includes(error.statusCode)) {
        await sleep(1000);
        return isProjectReady(projectName, attempt + 1);
      }

      throw error;
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
