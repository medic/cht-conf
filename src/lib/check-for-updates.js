const info = require('../lib/log').info;
const request = require('request-promise-native');
const warn = require('../lib/log').warn;

module.exports = (options) => {
  if(!options) options = {};

  return request
    .get('https://registry.npmjs.org/medic-configurer-beta')
      .then(res => {
	const json = JSON.parse(res);
	const latest = json['dist-tags'].latest;
	const current = require('../../package').version;

	info(`Current version: ${current}`);
	if(latest === current) {
	  info('You are already on the latest version :¬)');
	} else {
	  warn(`New version available!

	  ${current} -> ${latest}

     To install:

	  npm install -g medic-configurer-beta
  `);
	}
      })
      .catch(err => {
	if(options.nonFatal && err.cause && err.cause.code === 'ENOTFOUND') {
	  warn('Could not check NPM for updates.  You may be offline.');
	} else throw err;
      })
      ;
}
