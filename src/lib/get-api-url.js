const readline = require('readline-sync');
const url = require('url');
const usage = require('../cli/usage');

const emoji = require('./emoji');
const { error, info } = require('./log');

const getApiUrl = (cmdArgs, env={}) => {
  const specifiedModes = [cmdArgs.local, cmdArgs.instance, cmdArgs.url, cmdArgs.archive].filter(mode => mode);
  if (specifiedModes.length !== 1) {
    error('Require exactly one of these parameter: --local --instance --url --archive');
    usage();
    return false;
  }

  if (cmdArgs.archive) {
    return false;
  }

  if (cmdArgs.user && !cmdArgs.instance) {
    error('The --user switch can only be used if followed by --instance');
    return false;
  }

  let instanceUrl;
  if (cmdArgs.local) {
    instanceUrl = parseLocalUrl(env.COUCH_URL);
    if (instanceUrl.hostname !== 'localhost') {
      error(`You asked to configure localhost, but the COUCH_URL env var is set to '${instanceUrl.hostname}'.  This may be a remote server.`);
      return false;
    }
  } else if (cmdArgs.instance) {
    const password = readline.question(`${emoji.key}  Password: `, { hideEchoBack: true });
    const instanceUsername = cmdArgs.user || 'admin';
    const encodedPassword = encodeURIComponent(password);
    instanceUrl = url.parse(`https://${instanceUsername}:${encodedPassword}@${cmdArgs.instance}.medicmobile.org`);
  } else if (cmdArgs.url) {
    instanceUrl = url.parse(cmdArgs.url);
  }

  return `${instanceUrl.href}medic`;
};

const parseLocalUrl = (couchUrl) => {
  const doParse = (unparsed) => {
    const parsed = url.parse(unparsed);
    parsed.path = parsed.pathname = '';
    parsed.host = `${parsed.hostname}:5988`;
    return url.parse(url.format(parsed));
  };

  if (couchUrl) {
    info(`Using local url from COUCH_URL environment variable: ${couchUrl}`);
    return doParse(couchUrl);
  }

  info('Using default local url');
  return url.parse('http://admin:pass@localhost:5988');
};

module.exports = getApiUrl;
