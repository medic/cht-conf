#!/usr/bin/env node

const error = require('../src/lib/log').error;
const fs = require('../src/lib/sync-fs');
const info = require('../src/lib/log').info;
const supportedActions = require('../src/cli/supported-actions');
const usage = require('../src/cli/usage');

const args = process.argv.slice(2);

switch(args[0]) {
  case '--help': return usage(0);
  case '--shell-completion':
    return require('../src/cli/shell-completion-setup')(args[1]);
  case '--supported-actions':
    console.log('Supported actions:\n ', supportedActions.join('\n  '));
    return process.exit(0);
  case '--version':
    console.log('beta-' + require('../package.json').version);
    return process.exit(0);
}

if(args.length < 1) return usage(1);

const projectName = fs.path.basename(fs.path.resolve('.'));
const instanceUrl = args[0];
const couchUrl = `${instanceUrl}/medic`;

let actions = args.slice(1);
let extraArgs;

const argDivider = actions.indexOf('--');
if(argDivider !== -1) {
  extraArgs = actions.slice(argDivider + 1);
  actions = actions.slice(0, argDivider);
}

if(!actions.length) {
  actions = [
    'compile-app-settings',
    'backup-app-settings',
    'upload-app-settings',
    'convert-app-forms',
    'convert-contact-forms',
    'backup-all-forms',
    'delete-all-forms',
    'upload-app-forms',
    'upload-collect-forms',
    'upload-contact-forms',
    'upload-resources',
    'upload-custom-translations',
  ];
}

const unsupported = actions.filter(a => !supportedActions.includes(a));
if(unsupported.length) {
  error(`Unsupported action(s): ${unsupported.join(' ')}`);
  process.exit(1);
}

info(`Processing config in ${projectName} for ${instanceUrl}.`);
info('Actions:\n     -', actions.join('\n     - '));
info('Extra args:', extraArgs);

return actions.reduce((promiseChain, action) =>
    promiseChain
      .then(() => info(`Starting action: ${action}…`))
      .then(() => require(`../src/fn/${action}`)('.', couchUrl, extraArgs))
      .then(() => info(`${action} complete.`)),
    Promise.resolve())
  .then(() => { if(actions.length > 1) info('All actions completed.'); })
  .catch(e => {
    error(e);
    process.exit(1);
  });
