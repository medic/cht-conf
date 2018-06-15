const emoji = require('../lib/emoji');
const fs = require('../lib/sync-fs');
const info = require('../lib/log').info;
const log = require('../lib/log');
const readline = require('readline-sync');
const supportedActions = require('../cli/supported-actions');
const usage = require('../cli/usage');

module.exports = args => {
  const opts = {
    logLevel: log.LEVEL_INFO,
  };

  if(getFlag('--help')) usage(0);
  if(getFlag('--version')) exitPrint(require('../package.json').version);
  if(getFlag('--supported-actions'))
    exitPrint('Supported actions:\n ', supportedActions.join('\n  '));
  if(getFlag('--changelog')) exitPrint(fs.read(`${__dirname}/../CHANGELOG.md`));

  const shellCompletion = getOpt('--shell-completion');
  if(shellCompletion) return require('../cli/shell-completion-setup')(shellCompletion);


  const argDivider = args.indexOf('--');
  if(argDivider !== -1) {
    opts.extraArgs = args.slice(argDivider + 1);
    args = args.slice(0, argDivider);
  }

  if(getFlag('--silent'))  opts.logLevel = log.LEVEL_NONE;
  if(getFlag('--verbose')) opts.logLevel = log.LEVEL_TRACE;

  if(getFlag('--no-check')) opts.skipChecks = true;

  opts.instanceUrl = getInstanceUrl();

  // treat the remaining args as actions
  if(args.length) opts.requestedActions = args;

  return opts;


  function getFlag(flag) {
    if(!args.includes(flag)) return false;
    args.splice(args.indexOf(flag));
    return true;
  }

  function getOpt(flag) {
    if(!args.includes(flag)) return false;
    return args
        .splice(args.indexOf(flag), 2)
        .slice(1)[0];
  }

  function getInstanceUrl() {
    let instanceUsername = 'admin';

    const username = getOpt('--user');
    if(username) instanceUsername = username;

    const instanceName = getOpt('--instance');
    if(instanceName) {
      const password = readline.question(`${emoji.key}  Password: `, { hideEchoBack:true });
      const encodedPassword = encodeURIComponent(password);
      return `https://${instanceUsername}:${encodedPassword}@${instanceName}.medicmobile.org`;
    }

    if(username) {
      throw new Error(`--user cannot be used without --instance`);
    }

    const url = getOpt('--url');
    if(url) return url;

    if(getFlag('--local')) {
      const envVar = process.env.COUCH_URL;
      if(envVar) {
        if(!envVar.match(/localhost/)) {
          throw new Error(`You asked to configure a local instance, but the COUCH_URL env var is set to '${envVar}'.  This may be a remote server.`);
        }
        info('Using instance URL from COUCH_URL environment variable.');
        return envVar.replace(/\/medic$/, '');
      } else {
        return 'http://admin:pass@localhost:5988';
      }
    }
  }
};


function exitPrint(message) {
  console.log(message);
  process.exit(0);
}
