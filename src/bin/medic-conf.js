#!/usr/bin/env node

require('../cli/check-node-version');

const checkForUpdates = require('../lib/check-for-updates');
const error = require('../lib/log').error;
const fs = require('../lib/sync-fs');
const info = require('../lib/log').info;
const log = require('../lib/log');
const parseArgs = require('../cli/parse-args.js');
const readline = require('readline-sync');
const redactBasicAuth = require('redact-basic-auth');
const supportedActions = require('../cli/supported-actions');
const usage = require('../cli/usage');
const warn = require('../lib/log').warn;

let args = process.argv.slice(2);
if(!args.length) {
  return checkForUpdates({ nonFatal:true })
      .then(() => usage(0));
}

const opts = parseArgs(args);
log.level = opts.logLevel;

const projectName = fs.path.basename(fs.path.resolve('.'));
const couchUrl = opts.instanceUrl && `${opts.instanceUrl}/medic`;

if(opts.instanceUrl) {
  if(opts.instanceUrl.match('/medic$')) warn('Supplied URL ends in "/medic".  This is probably incorrect.');

  const productionUrlMatch = opts.instanceUrl.match(/^https:\/\/(?:[^@]*@)?(.*)\.(app|dev)\.medicmobile\.org(?:$|\/)/);
  if(productionUrlMatch &&
      productionUrlMatch[1] !== projectName &&
      productionUrlMatch[1] !== 'alpha') {
    warn(`Attempting to upload configuration for \x1b[31m${projectName}\x1b[33m`,
        `to non-matching instance: \x1b[31m${redactBasicAuth(opts.instanceUrl)}\x1b[33m`);
    if(!readline.keyInYN()) {
      error('User failed to confirm action.');
      process.exit(1);
    }
  }
}

const actions = opts.requestedActions || [
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

const unsupported = actions.filter(a => !supportedActions.includes(a));
if(unsupported.length) {
  error(`Unsupported action(s): ${unsupported.join(' ')}`);
  process.exit(1);
}

info(`Processing config in ${projectName} for ${opts.instanceUrl}.`);
info('Actions:\n     -', actions.join('\n     - '));
info('Extra args:', opts.extraArgs);

const initialPromise = actions.includes('check-for-updates') || opts.skipChecks ?
    Promise.resolve() : checkForUpdates({ nonFatal:true });

return actions.reduce((promiseChain, action) =>
    promiseChain
      .then(() => info(`Starting action: ${action}…`))
      .then(() => require(`../fn/${action}`)('.', couchUrl, opts.extraArgs))
      .then(() => info(`${action} complete.`)),
    initialPromise)
  .then(() => { if(actions.length > 1) info('All actions completed.'); })
  .catch(e => {
    error(e);
    process.exit(1);
  });
