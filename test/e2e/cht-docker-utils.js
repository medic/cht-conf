const path = require('path');
const fs = require('fs');
const https = require('https');
const { spawn } = require('child_process');
const request = require('request-promise-native');

const projectName = 'cht_conf_e2e_tests';
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

const isProjectReady = async (attempt = 1) => {
    console.log(`Checking if CHT is ready, attempt ${attempt}.`);
    const COUCHDB_USER = 'medic';
    const COUCHDB_PASSWORD = 'password';
    const url = `https://${COUCHDB_USER}:${COUCHDB_PASSWORD}@127-0-0-1.local-ip.medicmobile.org:10443`;
    await request({ uri: `${url}/api/v2/monitoring`, json: true })
      .catch(async (error) => {
          if (error.error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
              await sleep(1000);
              return isProjectReady(attempt + 1);
          }

          if ([502, 503].includes(error.statusCode)) {
              await sleep(1000);
              return isProjectReady(attempt + 1);
          }

          throw error;
      });
};

const startProject = () => new Promise((resolve, reject) => {
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
            await isProjectReady();
            resolve();
        });
        childProcess.stdin.write('y\n');
        childProcess.stdin.write('y\n');
        childProcess.stdin.write(`${projectName}\n`);
    }
});

const destroyProject = () => new Promise((resolve, reject) => {
    const childProcess = spawn(dockerHelperScript, [`${projectName}.env`, 'destroy'], {
        stdio: 'inherit',
        cwd: dockerHelperDirectory
    });
    childProcess.on('error', reject);
    childProcess.on('close', resolve);
});

const spinUpCht = async () => {
    await ensureScriptExists();
    await startProject();
};

const tearDownCht = async () => {
    await ensureScriptExists();
    await destroyProject();
};

module.exports = {
    spinUpCht,
    tearDownCht,
};
