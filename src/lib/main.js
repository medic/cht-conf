#!/usr/bin/env node

const opn = require('opn');
const readline = require('readline-sync');
const redactBasicAuth = require('redact-basic-auth');
const url = require('url');

const checkForUpdates = require('../lib/check-for-updates');
const emoji = require('../lib/emoji');
const log = require('../lib/log');
const fs = require('../lib/sync-fs');
const supportedActions = require('../cli/supported-actions');
const shellCompletionSetup = require('../cli/shell-completion-setup');
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
  // Compile instance information
  //
  if (cmdArgs.user && !cmdArgs.instance) {
    error('The --user switch can only be used if followed by --instance');
    return -1;
  }

  let instanceUrl;
  if (cmdArgs.local) {
    const { COUCH_URL } = env;
    if (COUCH_URL) {
      instanceUrl = parseCouchUrl(COUCH_URL);

      info('Using local url from COUCH_URL environment variable');
      info(instanceUrl);
      if (instanceUrl.hostname !== 'localhost') {
        error(`You asked to configure a local instance, but the COUCH_URL env var is set to '${COUCH_URL}'.  This may be a remote server.`);
        return -1;
      }
    } else {
      instanceUrl = url.parse('http://admin:pass@localhost:5988');
      info('Using default local url');
    }
  } else if (cmdArgs.instance) {
    const password = readline.question(`${emoji.key}  Password: `, { hideEchoBack: true });
    const instanceUsername = cmdArgs.user || 'admin';
    const encodedPassword = encodeURIComponent(password);
    instanceUrl = url.parse(`https://${instanceUsername}:${encodedPassword}@${cmdArgs.instance}.medicmobile.org`);
  } else if (cmdArgs.url) {
    instanceUrl = url.parse(cmdArgs.url);
  } else {
    error('Missing one of these required parameter: --local --instance --url');
    usage();
    return -1;
  }

  const projectName = fs.path.basename(fs.path.resolve('.'));

  if (instanceUrl) {
    const productionUrlMatch = instanceUrl.href.match(/^https:\/\/(?:[^@]*@)?(.*)\.(app|dev)\.medicmobile\.org(?:$|\/)/);
    if (productionUrlMatch &&
        productionUrlMatch[1] !== projectName &&
        productionUrlMatch[1] !== 'alpha') {
      warn(`Attempting to use project for \x1b[31m${projectName}\x1b[33m`,
          `against non-matching instance: \x1b[31m${redactBasicAuth(instanceUrl.href)}\x1b[33m`);
      if(!readline.keyInYN()) {
        error('User failed to confirm action.');
        return -1;
      }
    }
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
  info(`Processing config in ${projectName} for ${instanceUrl.href}.`);
  info('Actions:\n     -', actions.join('\n     - '));
  info('Extra args:', extraArgs);

  const skipCheckForUpdates = cmdArgs.check === false;
  if (actions.includes('check-for-updates') && !skipCheckForUpdates) {
    await checkForUpdates({ nonFatal:true });
  }

  for (let action of actions) {
    info(`Starting action: ${action}…`);
    await executeAction(action, `${instanceUrl.href}medic`, extraArgs);
    info(`${action} complete.`);
  }

  if (actions.length > 1) {
    await info('All actions completed.');
  }
};

const parseCouchUrl = COUCH_URL => {
  const parsed = url.parse(COUCH_URL);
  parsed.path = parsed.pathname = '';
  parsed.host = `${parsed.hostname}:5988`;
  return url.parse(url.format(parsed));
};

const executeAction = (action, instanceUrl, extraArgs) => require(`../fn/${action}`)('.', instanceUrl, extraArgs);

