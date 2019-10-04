#!/usr/bin/env node

const opn = require('opn');

const checkForUpdates = require('../lib/check-for-updates');
const checkMedicConfDependencyVersion = require('../lib/check-medic-conf-depdency-version');
const environment = require('./environment');
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
];
const defaultArchiveActions = [
  'compile-app-settings',
  'upload-app-settings',
  'convert-app-forms',
  'convert-collect-forms',
  'convert-contact-forms',
  'upload-app-forms',
  'upload-collect-forms',
  'upload-contact-forms',
  'upload-resources',
  'upload-custom-translations',
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

  if (cmdArgs.archive && !cmdArgs.destination) {
    error('--destination=<path to save files> is required with --archive.');
    return -1;
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
  // Build up actions
  //
  let actions = cmdArgs._;
  if (!actions.length) {
    actions = !cmdArgs.archive ? defaultActions : defaultArchiveActions;
  }

  const unsupported = actions.filter(a => !supportedActions.includes(a));
  if(unsupported.length) {
    error(`Unsupported action(s): ${unsupported.join(' ')}`);
    return -1;
  }

  //
  // Initialize the environment
  //
  const projectName = fs.path.basename(pathToProject);

  let apiUrl;
  if (requiresInstance(actions)) {
    apiUrl = getApiUrl(cmdArgs, env);
    if (!apiUrl) {
      error('Failed to obtain a url to the API');
      return -1;
    }
  }

  let extraArgs = cmdArgs['--'];
  if (!extraArgs.length) {
    extraArgs = undefined;
  }

  environment.initialize(pathToProject, !!cmdArgs.archive, cmdArgs.destination, extraArgs, apiUrl);

  const productionUrlMatch = environment.instanceUrl && environment.instanceUrl.match(/^https:\/\/(?:[^@]*@)?(.*)\.(app|dev)\.medicmobile\.org(?:$|\/)/);
  const expectedOptions = ['alpha', projectName];
  if (productionUrlMatch && !expectedOptions.includes(productionUrlMatch[1])) {
    warn(`Attempting to use project for \x1b[31m${projectName}\x1b[33m`,
        `against non-matching instance: \x1b[31m${redactBasicAuth(environment.instanceUrl)}\x1b[33m`);
    if(!readline.keyInYN()) {
      error('User failed to confirm action.');
      return false;
    }
  }

  //
  // GO GO GO
  //
  info(`Processing config in ${projectName}.`);
  info('Actions:\n     -', actions.join('\n     - '));

  const skipCheckForUpdates = cmdArgs.check === false;
  if (actions.includes('check-for-updates') && !skipCheckForUpdates) {
    await checkForUpdates({ nonFatal: true });
  }

  for (let action of actions) {
    info(`Starting action: ${action}…`);
    await executeAction(action);
    info(`${action} complete.`);
  }

  if (actions.length > 1) {
    await info('All actions completed.');
  }
};


const requiresInstance = actions => actions.find(actionName => {
  const actionLib = require(`../fn/${actionName}`);
  if (typeof actionLib === 'function') {
    return true;
  }

  if (typeof actionLib.requiresInstance === 'boolean') {
    return actionLib.requiresInstance;
  }

  return true;
});

const executeAction = actionName => {
  const actionLib = require(`../fn/${actionName}`);
  if (typeof actionLib === 'function') {
    return actionLib();
  }

  return actionLib.execute();
};
