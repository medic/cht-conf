const path = require('path');
const fs = require('fs');
const https = require('https');
const { spawn } = require('child_process');

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

const spinUpCHT = () => new Promise((resolve, reject) => {
    const childProcess = spawn(dockerHelperScript, { stdio: 'pipe', cwd: dockerHelperDirectory });
    childProcess.on('error', reject);
    childProcess.on('close', resolve);

    const configFile = path.resolve(dockerHelperDirectory, `${projectName}.env`);
    if (fs.existsSync(configFile)) {
        childProcess.stdin.write('n\n');
        childProcess.stdin.write('1\n');
    } else {
        childProcess.stdin.write('y\n');
        childProcess.stdin.write('y\n');
        childProcess.stdin.write(`${projectName}\n`);
    }
});

const takeDownCHT = () => new Promise((resolve, reject) => {
    const childProcess = spawn(dockerHelperScript, [`${projectName}.env`, 'destroy'], { cwd: dockerHelperDirectory });
    childProcess.on('error', reject);
    childProcess.on('close', resolve);
});

const time = async (fn, label) => {
  const before = Date.now();
  const res = await fn();
  const took = Date.now() - before;
  console.log(`${label} took ${took}ms`);
  return res;
};

before(async () => {
    console.log('before');

    if (!fs.existsSync(dockerHelperDirectory)) {
        fs.mkdirSync(dockerHelperDirectory);
    }

    if (!fs.existsSync(dockerHelperScript)) {
        await time(downloadDockerHelperScript, 'download docker helper script');
    }

    await time(spinUpCHT, 'spin up cht');

    console.log('cht up');
});

after(async () => {
    console.log('after');

    await time(takeDownCHT, 'take down cht');

    console.log('cht down');
});

beforeEach(() => {
    console.log('beforeEach');
});

afterEach(() => {
    console.log('afterEach');
});
