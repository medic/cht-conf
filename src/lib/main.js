const open = require('open');
const checkForUpdates = require('../lib/check-for-updates');
const checkChtConfDependencyVersion = require('../lib/check-cht-conf-dependency-version');
const environment = require('./environment');
const fs = require('../lib/sync-fs');
const { getApiUrl, isLocalhost } = require('../lib/get-api-url');
const log = require('../lib/log');
const userPrompt = require('../lib/user-prompt');
const redactBasicAuth = require('redact-basic-auth');
const shellCompletionSetup = require('../cli/shell-completion-setup');
const supportedActions = require('../cli/supported-actions');
const usage = require('../cli/usage');
const api = require('../lib/api');

const { info, warn } = log;
const defaultActions = [
  'check-git',
  'compile-app-settings',
  'backup-app-settings',
  'upload-app-settings',
  'convert-app-forms',
  'convert-collect-forms',
  'convert-contact-forms',
  'convert-training-forms',
  'validate-app-forms',
  'validate-collect-forms',
  'validate-contact-forms',
  'validate-training-forms',
  'backup-all-forms',
  'delete-all-forms',
  'upload-app-forms',
  'upload-collect-forms',
  'upload-contact-forms',
  'upload-training-forms',
  'upload-resources',
  'upload-branding',
  'upload-partners',
  'upload-custom-translations',
  'upload-privacy-policies',
  'upload-extension-libs',
];
const defaultArchiveActions = [
  'compile-app-settings',
  'upload-app-settings',
  'convert-app-forms',
  'convert-collect-forms',
  'convert-contact-forms',
  'convert-training-forms',
  'validate-app-forms',
  'validate-collect-forms',
  'validate-contact-forms',
  'validate-training-forms',
  'upload-app-forms',
  'upload-collect-forms',
  'upload-contact-forms',
  'upload-training-forms',
  'upload-resources',
  'upload-branding',
  'upload-partners',
  'upload-custom-translations',
  'upload-privacy-policies',
  'upload-extension-libs',
];

module.exports = async (argv, env) => {
  // No params at all
  const cmd = argv[1];
  if (cmd && cmd.endsWith('medic-conf')) {
    warn('The "medic-conf" cli command is deprecated. Please use "cht" instead');
  }

  if (argv.length <= 2) {
    usage();
    throw new Error('Invalid number of arguments.');
  }

  const cmdArgs = require('minimist')(argv.slice(2), {
    boolean: true,
    '--': true
  });

  //
  // General single use actions
  //
  if (cmdArgs.help) {
    usage();
    return;
  }

  if (cmdArgs['shell-completion']) {
    return shellCompletionSetup(cmdArgs['shell-completion']);
  }

  if (cmdArgs['supported-actions']) {
    info('Supported actions:\n', supportedActions.join('\n  '));
    return;
  }

  if (cmdArgs.version) {
    info(require('../../package.json').version);
    return;
  }

  if (cmdArgs.changelog) {
    await open('https://github.com/medic/cht-conf/releases', { url: true });
    return;
  }

  if (cmdArgs.archive && !cmdArgs.destination) {
    throw new Error('--destination=<path to save files> is required with --archive.');
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
    checkChtConfDependencyVersion(pathToProject);
  }

  //
  // Build up actions
  //
  const skipValidate = cmdArgs['skip-validate'];
  const actions = buildActions(cmdArgs, skipValidate);

  //
  // Initialize the environment
  //
  const projectName = fs.path.basename(pathToProject);

  const requiresInstance = actions.some(action => action.requiresInstance);
  const apiUrl = requiresInstance && getApiUrl(cmdArgs, env);

  if (cmdArgs['accept-self-signed-certs'] || isLocalhost(apiUrl)) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
  }

  let extraArgs = cmdArgs['--'];
  if (!extraArgs.length) {
    extraArgs = undefined;
  }

  environment.initialize(
    pathToProject,
    !!cmdArgs.archive,
    cmdArgs.destination,
    extraArgs,
    apiUrl,
    cmdArgs.force,
    cmdArgs['skip-translation-check'],
    skipValidate,
    cmdArgs['session-token'],
  );

  if (requiresInstance && apiUrl) {
    await api().available();
  }

  const productionUrlMatch = environment.instanceUrl
    && environment.instanceUrl.match(/^https:\/\/(?:[^@]*@)?(.*)\.(app|dev)\.medicmobile\.org(?:$|\/)/);
  const expectedOptions = ['alpha', projectName];
  if (productionUrlMatch && !expectedOptions.includes(productionUrlMatch[1])) {
    warn(`Attempting to use project for \x1b[31m${projectName}\x1b[33m`,
      `against non-matching instance: \x1b[31m${redactBasicAuth(environment.instanceUrl)}\x1b[33m`);
    if (!userPrompt.keyInYN()) {
      throw new Error('User aborted execution.');
    }
  }

  //
  // GO GO GO
  //
  info(`Processing config in ${projectName}.`);
  info('Actions:\n     -', actions.map(({name}) => name).join('\n     - '));

  const skipCheckForUpdates = cmdArgs.check === false;
  if (actions.some(action => action.name === 'check-for-updates') && !skipCheckForUpdates) {
    await checkForUpdates({ nonFatal: true });
  }

  for (const action of actions) {
    info(`Starting action: ${action.name}…`);
    await executeAction(action);
    info(`${action.name} complete.`);
  }

  if (actions.length > 1) {
    await info('All actions completed.');
  }
};

function buildActions(cmdArgs, skipValidate) {
  let actions = cmdArgs._;
  if (actions.length) {
    const unsupported = actions.filter(a => !supportedActions.includes(a));
    if (unsupported.length) {
      usage();
      throw new Error(`Unsupported action(s): ${unsupported.join(' ')}`);
    }
  } else {
    actions = !cmdArgs.archive ? defaultActions : defaultArchiveActions;
  }

  if (cmdArgs['skip-git-check']) {
    actions = actions.filter(a => a !== 'check-git');
  }

  if(skipValidate) {
    warn('Skipping all form validation.');
    const validateActions = [
      'validate-app-forms',
      'validate-collect-forms',
      'validate-contact-forms',
      'validate-training-forms',
    ];
    actions = actions.filter(action => !validateActions.includes(action));
  } else {
    const addFormValidationIfNecessary = (formType) => {
      const updateFormsIndex = actions.indexOf(`upload-${formType}-forms`);
      if (updateFormsIndex >= 0 && actions.indexOf(`validate-${formType}-forms`) < 0) {
        actions.splice(updateFormsIndex, 0, `validate-${formType}-forms`);
      }
    };
    addFormValidationIfNecessary('app');
    addFormValidationIfNecessary('collect');
    addFormValidationIfNecessary('contact');
    addFormValidationIfNecessary('training');
  }

  return actions.map(actionName => {
    const action = require(`../fn/${actionName}`);

    if (typeof action.execute !== 'function') {
      throw new Error(`${actionName} has not been implemented correctly: no 'execute' function`);
    }

    if (!Object.hasOwnProperty.call(action, 'requiresInstance')) {
      action.requiresInstance = true;
    }

    action.name = actionName;

    return action;
  });
}

// Exists for generic mocking purposes
const executeAction = action => action.execute();
