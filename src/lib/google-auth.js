const child_process = require('child_process');
const fs = require('../lib/sync-fs');
const google = require('googleapis');
const info = require('../lib/log').info;
const readline = require('readline-sync');
const warn = require('../lib/log').warn;

const SECRETS_FILE = './.gdrive.secrets.json';

module.exports = () => {
  const client = oauthClient();

  const authUrl = client.generateAuthUrl({
    scope: 'https://www.googleapis.com/auth/drive.readonly'
  });

  openBrowserAt(authUrl);
  const accessCode = readline.question(`Enter access code from browser: `);

  return new Promise((resolve, reject) => {
    client.getToken(accessCode, function (err, tokens) {
      if(err) return reject(err);

      client.setCredentials(tokens);

      resolve(client);
    });
  });
};

function oauthClient() {
  let configFile;
  try {
    configFile = fs.readJson(SECRETS_FILE);
  } catch(e) {
    info('Failed to load google drive secrets from file.', e);
    configFile = {};
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || configFile.client_id;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || configFile.client_secret;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ||
      (configFile.redirect_uris && configFile.redirect_uris[0]);

  const missingConfig =
      checkRequred(clientId, 'client_id', 'GOOGLE_CLIENT_ID') |
      checkRequred(clientSecret, 'client_secret', 'GOOGLE_CLIENT_SECRET') |
      checkRequred(redirectUri, 'redirect_uris', 'GOOGLE_REDIRECT_URI');

  if(missingConfig) throw new Error('Missing required config for google drive access.  Please check warnings.');

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function openBrowserAt(url) {
  info(`Should open browser at: ${url}`);
  child_process.exec(`open "${url}" || firefox "${url}" || chromium-browser "${url}" || chrome "${url}"`);
}

function checkRequred(value, jsonKey, envVar) {
  if(value) return;

  warn(`Missing .${jsonKey} in ${SECRETS_FILE} or env var ${envVar}!`);
  return true;
}
