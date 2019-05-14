#!/usr/bin/env node

const opn = require('opn');

require('../cli/check-node-version');

const checkForUpdates = require('../lib/check-for-updates');
const emoji = require('../lib/emoji');
const error = require('../lib/log').error;
const fs = require('../lib/sync-fs');
const info = require('../lib/log').info;
const log = require('../lib/log');
const readline = require('readline-sync');
const redactBasicAuth = require('redact-basic-auth');
const supportedActions = require('../cli/supported-actions');
const usage = require('../cli/usage');
const warn = require('../lib/log').warn;

// No params at all
if(process.argv.length === 2) {
  return checkForUpdates({ nonFatal:true })
      .then(() => usage(0));
}

const argv = require('minimist')(process.argv.slice(2), {
  boolean: true,
  '--': true
});

//
// General single use actions
//
if (argv.help) {
  return usage(0);
}

if (argv['accept-self-signed-certs']) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
}

if (argv['shell-completion']) {
  return require('../cli/shell-completion-setup')(argv['shell-completion']);
}

if (argv['supported-actions']) {
  console.log('Supported actions:\n ', supportedActions.join('\n  '));
  return process.exit(0);
}

if (argv.version) {
  console.log(require('../../package.json').version);
  return process.exit(0);
}

if (argv.changelog) {
  opn('https://github.com/medic/medic-conf/releases');
  return process.exit(0);
}

//
// Logging
//
if (argv.silent) {
  log.level = log.LEVEL_NONE;
} else if (argv.verbose) {
  log.level = log.LEVEL_TRACE;
} else {
  log.level = log.LEVEL_INFO;
}

//
// Update Check?
//
const skipCheckForUpdates = argv.check === false;

//
// Compile instance information
//
if (argv.user && !argv.instance) {
  throw new Error('The --user switch can only be used if followed by --instance');
}

const instanceUsername = argv.user || 'admin';
let instanceUrl;
if (argv.local) {
  if(process.env.COUCH_URL) {
    if(!process.env.COUCH_URL.match(/localhost/)) {
      throw new Error(`You asked to configure a local instance, but the COUCH_URL env var is set to '${process.env.COUCH_URL}'.  This may be a remote server.`);
    }
    instanceUrl = process.env.COUCH_URL
      .replace(/\/medic$/, '') // strip off the database
      .replace(/:5984/, ':5988'); // use api port instead of couchdb
    info('Using instance URL from COUCH_URL environment variable.');
  } else {
    instanceUrl = 'http://admin:pass@localhost:5988';
  }
} else if (argv.instance) {
  const password = readline.question(`${emoji.key}  Password: `, { hideEchoBack:true });
  const encodedPassword = encodeURIComponent(password);
  instanceUrl = `https://${instanceUsername}:${encodedPassword}@${argv.instance}.medicmobile.org`;
} else if (argv.url) {
  instanceUrl = argv.url;
}

const projectName = fs.path.basename(fs.path.resolve('.'));
const couchUrl = instanceUrl && `${instanceUrl}/medic`;

if(instanceUrl) {
  if(instanceUrl.match('/medic$')) {
    warn('Supplied URL ends in "/medic".  This is probably incorrect.');
  }

  const productionUrlMatch = instanceUrl.match(/^https:\/\/(?:[^@]*@)?(.*)\.(app|dev)\.medicmobile\.org(?:$|\/)/);
  if(productionUrlMatch &&
      productionUrlMatch[1] !== projectName &&
      productionUrlMatch[1] !== 'alpha') {
    warn(`Attempting to use project for \x1b[31m${projectName}\x1b[33m`,
        `against non-matching instance: \x1b[31m${redactBasicAuth(instanceUrl)}\x1b[33m`);
    if(!readline.keyInYN()) {
      error('User failed to confirm action.');
      process.exit(1);
    }
  }
}

//
// Build up actions
//
let actions = argv._;
if(!actions.length) {
  actions = [
    'compile-app-settings',
    'backup-app-settings',
    'upload-app-settings',
    'convert-app-forms',
    'convert-collect-forms',
    'convert-contact-forms',
    'backup-all-forms',
    'delete-all-forms',
    'upload-app-forms',
    'upload-collect-forms',
    'upload-contact-forms',
    'upload-resources',
    'upload-custom-translations',
    'csv-to-docs',
    'upload-docs',
  ];
}

let extraArgs = argv['--'];
if (!extraArgs.length) {
  extraArgs = undefined;
}

const unsupported = actions.filter(a => !supportedActions.includes(a));
if(unsupported.length) {
  error(`Unsupported action(s): ${unsupported.join(' ')}`);
  process.exit(1);
}

//
// GO GO GO
//
info(`Processing config in ${projectName} for ${instanceUrl}.`);
info('Actions:\n     -', actions.join('\n     - '));
info('Extra args:', extraArgs);

const initialPromise = actions.includes('check-for-updates') || skipCheckForUpdates ?
    Promise.resolve() : checkForUpdates({ nonFatal:true });

return actions.reduce((promiseChain, action) =>
    promiseChain
      .then(() => info(`Starting action: ${action}…`))
      .then(() => require(`../fn/${action}`)('.', couchUrl, extraArgs))
      .then(() => info(`${action} complete.`)),
    initialPromise)
  .then(() => {
    if (actions.length > 1) {
      info('All actions completed.');
    }
  })
  .catch(e => {
    error(e);
    process.exit(1);
  });
