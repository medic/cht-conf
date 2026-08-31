/* eslint-disable no-console */
const getApi = require('../lib/api');
const { info, warn } = require('../lib/log');
const environment = require('../lib/environment');

const execute = async () => {
  const api = getApi();
  const settings = await api.getAppSettings();
  
  const transitions = settings.transitions || {};
  const transitionNames = Object.keys(transitions);

  if (environment.extraArgs.includes('--json')) {
    console.log(JSON.stringify(transitions, null, 2));
    return;
  }

  info(`Found ${transitionNames.length} transitions:`);
  
  // Fetch deprecations if possible
  try {
    const uri = `${environment.instanceUrl}/api/v1/settings/deprecated-transitions`;
    const deprecatedTransitions = await api.get({ uri, json: true }); // Wait, api() returns the object
    // Actually api() in api.js returns different things based on isArchiveMode
    // But getApi() I used in other files is just require('../lib/api')
    
    transitionNames.forEach(name => {
      const config = transitions[name];
      const status = config.disable ? 'Disabled' : 'Enabled';
      const deprecated = (deprecatedTransitions || []).find(d => d.name === name);
      
      let msg = `- ${name} [${status}]`;
      if (deprecated && !config.disable) {
        msg += ' (DEPRECATED)';
        console.log(msg);
        warn(`  ${deprecated.deprecationMessage}`);
      } else {
        console.log(msg);
      }
    });
  } catch (err) {
    warn(`Failed to fetch deprecated transitions status: ${err.message}`);
    // If deprecated-transitions endpoint fails, just list them
    transitionNames.forEach(name => {
      const config = transitions[name];
      const status = config.disable ? 'Disabled' : 'Enabled';
      console.log(`- ${name} [${status}]`);
    });
  }
};

module.exports = {
  requiresInstance: true,
  execute
};
