#!/usr/bin/env node

const opn = require('opn');

const ArchivingFakeApi = require('./archiving-fake-api');
const ArchivingFakeDb = require('./archiving-fake-db');
const checkForUpdates = require('../lib/check-for-updates');
const checkMedicConfDependencyVersion = require('../lib/check-medic-conf-depdency-version');
const createDb = require('./db');
const createApi = require('./api');
const fs = require('../lib/sync-fs');
const getApiUrl = require('../lib/get-api-url');
const log = require('../lib/log');
const readline = require('readline-sync');
const redactBasicAuth = require('redact-basic-auth');
const shellCompletionSetup = require('../cli/shell-completion-setup');
const supportedActions = require('../cli/supported-actions');
const usage = require('../cli/usage');

const { error, info, warn } = log;
const defaultActions = [
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

module.exports = async (argv, env) => {
  // No params at all
  if(argv.length <= 2) {
    usage(0);
    return -1;
  }

  const cmdArgs = require('minimist')(argv.slice(2), {
    boolean: true,
    '--': true
  });

  //
  // General single use actions
  //
  if (cmdArgs.help) {
    usage(0);
    return 0;
  }

  if (cmdArgs['shell-completion']) {
    return shellCompletionSetup(cmdArgs['shell-completion']);
  }

  if (cmdArgs['supported-actions']) {
    info('Supported actions:\n', supportedActions.join('\n  '));
    return 0;
  }

  if (cmdArgs.version) {
    info(require('../../package.json').version);
    return 0;
  }

  if (cmdArgs.changelog) {
      opn('https://github.com/medic/medic-conf/releases');
      return process.exit(0);
  }

  if (cmdArgs['accept-self-signed-certs']) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
  }

  //
  // Logging
  //
  if (cmdArgs.silent) {
    log.level = log.LEVEL_NONE;
  } else if (cmdArgs.verbose) {
    log.level = log.LEVEL_TRACE;
  } else {
    log.level = log.LEVEL_INFO;
  }

  //
  // Dependency check
  //
  const pathToProject = fs.path.resolve(cmdArgs.source || '.');
  if (!cmdArgs['skip-dependency-check']) {
    checkMedicConfDependencyVersion(pathToProject);
  }

  //
  // Construct the data access layer
  //
  const projectName = fs.path.basename(pathToProject);
  
  let db, api;
  if (cmdArgs.archive) {
    db = new ArchivingFakeDb(cmdArgs);
    api = new ArchivingFakeApi(cmdArgs);
  } else {
    const urlToApi = getApiUrl(cmdArgs, env);
    if (!urlToApi) {
      error('Failed to obtain a url to the API');
      return -1;
    }

    const instanceUrl = urlToApi.replace(/\/medic$/, '');
    const productionUrlMatch = instanceUrl.match(/^https:\/\/(?:[^@]*@)?(.*)\.(app|dev)\.medicmobile\.org(?:$|\/)/);
    const expectedOptions = ['alpha', projectName];
    if (productionUrlMatch && !expectedOptions.includes(productionUrlMatch[1])) {
      warn(`Attempting to use project for \x1b[31m${projectName}\x1b[33m`,
          `against non-matching instance: \x1b[31m${redactBasicAuth(instanceUrl.href)}\x1b[33m`);
      if(!readline.keyInYN()) {
        error('User failed to confirm action.');
        return false;
      }
    }

    db = createDb(urlToApi);
    api = createApi(urlToApi);
  }
  
  //
  // Build up actions
  //
  let actions = cmdArgs._;
  if (!actions.length) {
    actions = defaultActions;
  }

  let extraArgs = cmdArgs['--'];
  if (!extraArgs.length) {
    extraArgs = undefined;
  }

  const unsupported = actions.filter(a => !supportedActions.includes(a));
  if(unsupported.length) {
    error(`Unsupported action(s): ${unsupported.join(' ')}`);
    return -1;
  }

  //
  // GO GO GO
  //
  info(`Processing config in ${projectName}.`);
  info('Actions:\n     -', actions.join('\n     - '));
  info('Extra args:', extraArgs);

  const skipCheckForUpdates = cmdArgs.check === false;
  if (actions.includes('check-for-updates') && !skipCheckForUpdates) {
    await checkForUpdates({ nonFatal: true });
  }

  for (let action of actions) {
    info(`Starting action: ${action}…`);
    await executeAction(action, pathToProject, db, api, extraArgs);
    info(`${action} complete.`);
  }

  if (actions.length > 1) {
    await info('All actions completed.');
  }
};

const executeAction = (action, pathToProject, db, api, args) => require(`../fn/${action}`)(pathToProject, db, api, args);