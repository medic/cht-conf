#!/usr/bin/env node

const error = require('../src/lib/log').error;
const fs = require('../src/lib/sync-fs');
const info = require('../src/lib/log').info;
const usage = require('../src/cli/usage');
const supportedActions = require('../src/cli/supported-actions');

const args = process.argv.slice(2);

switch(args[0]) {
  case '--help': return usage(0);
  case '--shell-completion':
    const shell = args.length > 1 && args[1] || 'bash';
    const completionFile = `${fs.path.dirname(require.main.filename)}/../src/cli/shell-completion.${shell}`;
    if(fs.exists(completionFile)) {
      console.log(fs.read(completionFile));
      process.exit(0);
    } else {
      console.log('# ERROR medic-conf shell completion not yet supported for', shell);
      process.exit(1);
    }
    return;
  case '--supported-actions':
    console.log('Supported actions:\n ', supportedActions.join('\n  '));
    return process.exit(0);
  case '--version':
    console.log(require('../package.json').version);
    return process.exit(0);
}

if(args.length < 2) return usage(1);

const project = fs.path.normalize(args[0]).replace(/\/$/, '');
const instanceUrl = args[1];
const couchUrl = `${instanceUrl}/medic`;

let actions;

if(args.length === 2) {
  actions = [
    'compile-app-settings',
    'backup-app-settings',
    'upload-app-settings',
    'convert-app-forms',
    'convert-contact-forms',
    'backup-forms',
    'delete-forms',
    'upload-app-forms',
    'upload-contact-forms',
    'upload-resources',
    'upload-custom-translations',
  ];
} else {
  actions = args.slice(2);
}

const unsupported = actions.filter(a => !supportedActions.includes(a));
if(unsupported.length) {
  error(`Unsupported action(s): ${unsupported.join(' ')}`);
  process.exit(1);
}

info(`Processing config in ${project} for ${instanceUrl}.  Actions: ${actions}`);

return actions.reduce((promiseChain, action) =>
    promiseChain
      .then(() => info(`Starting action: ${action}…`))
      .then(() => require(`../src/fn/${action}`)(project, couchUrl))
      .then(() => info(`${action} complete.`)),
    Promise.resolve())
  .then(() => { if(actions.length > 1) info('All actions completed.'); })
  .catch(e => {
    error(e);
    process.exit(1);
  });
