#!/usr/bin/env node

const error = require('../src/lib/log').error;
const info = require('../src/lib/log').info;
const path = require('path');
const usage = require('../src/cli/usage');
const supportedActions = require('../src/cli/supported-actions');

const args = process.argv.slice(2);
if(args.length === 1) {
  switch(args[0]) {
    case '--help': usage(); process.exit(0);
    case '--version':
      console.log(require('../package.json').version);
      process.exit(0);
  }
}
if(args.length < 2) {
    usage();
    process.exit(1);
}

const project = path.normalize(args[0]).replace(/\/$/, '');
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
