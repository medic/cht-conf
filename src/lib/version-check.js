const fs = require('fs');
const path = require('path');
const https = require('https');
const semver = require('semver');

/**
 * Reads the package.json file to get the current version of the tool.
 */
const getLocalVersion = () => {
  const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
  return JSON.parse(packageJsonContent).version;
};

/**
 * Fetches the latest version number from the NPM registry.
 */
const getLatestVersion = () => {
  return new Promise((resolve, reject) => {
    const request = https.get('https://registry.npmjs.org/cht-conf/latest', (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to get version from npm. Status: ${res.statusCode}`));
      }

      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve(JSON.parse(data).version);
      });
    });

    request.on('error', reject);

    request.setTimeout(2000, () => {
      request.destroy();
      reject(new Error('Request to npm timed out'));
    });
  });
};

const notifyOfNewVersion = async () => {
  try {
    const localVersion = getLocalVersion();
    const latestVersion = await getLatestVersion();

    if (semver.gt(latestVersion, localVersion)) {
      console.log(`\n🔔 A new version of cht-conf is available: ${latestVersion} (you have ${localVersion}).`);
      console.log('   To update, run: npm install -g cht-conf');
    }
  } catch (error) {
    // This is a non-critical background task that should not interrupt the user.
    // The error is logged to the debug channel for troubleshooting purposes
    // and to satisfy the SonarCloud quality gate.
    console.debug('cht-conf version check failed:', error.message);
  }
};

module.exports = { notifyOfNewVersion };