const redactBasicAuth = require('redact-basic-auth');
const readline = require('readline-sync');
const url = require('url');

const ArchiveRepository = require('./archive-repository');
const emoji = require('./emoji');
const { error, info, warn } = require('./log');
const ServerRepository = require('./server-repository');
const usage = require('../cli/usage');

const createRepository = (cmdArgs, env = {}, projectName) => {
  const specifiedModes = [cmdArgs.local, cmdArgs.instance, cmdArgs.url, cmdArgs.archive].filter(mode => mode);
  if (specifiedModes.length !== 1) {
    error('Require exactly one of these parameter: --local --instance --url --archive');
    usage();
    return false;
  }

  if (cmdArgs.archive) {
    return new ArchiveRepository(cmdArgs);
  }

  return createServerRepository(cmdArgs, env, projectName);
};

const createServerRepository = (cmdArgs, env, projectName) => {
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

  const productionUrlMatch = instanceUrl.href.match(/^https:\/\/(?:[^@]*@)?(.*)\.(app|dev)\.medicmobile\.org(?:$|\/)/);
  const expectedOptions = ['alpha', projectName];
  if (productionUrlMatch && !expectedOptions.includes(productionUrlMatch[1])) {
    warn(`Attempting to use project for \x1b[31m${projectName}\x1b[33m`,
        `against non-matching instance: \x1b[31m${redactBasicAuth(instanceUrl.href)}\x1b[33m`);
    if(!readline.keyInYN()) {
      error('User failed to confirm action.');
      return false;
    }
  }

  return new ServerRepository(`${instanceUrl.href}medic`);
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

module.exports = createRepository;
