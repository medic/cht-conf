const semver = require('semver');
const { getNodes, getBindNodes } = require('../../forms-utils');

const validateNoteCountdownTimer = async ({ xformPath, xmlDoc, apiVersion }) => {
  if (!apiVersion) {
    return { errors: [], warnings: [] };
  }
  if (semver.lt(apiVersion, '4.7.0')) {
    return { errors: [], warnings: [] };
  }

  const bindNodes = getBindNodes(xmlDoc);

  const warnings = getNodes(xmlDoc, '/h:html/h:body//*[@appearance]')
    .filter(node => node.getAttribute('appearance').match(/(?:^|\s)countdown-timer(?:$|\s)/))
    .map(node => node.getAttribute('ref'))
    .filter(ref => {
      const bind = bindNodes.find(b => b.getAttribute('nodeset') === ref);
      return bind?.hasAttribute('readonly');
    })
    .map(ref => `  - ${ref}`);

  if (warnings.length) {
    warnings.unshift(
      `Form at ${xformPath} contains fields with the deprecated countdown-timer note appearance. `
      + 'Please update the following fields to use trigger fields instead:'
    );
  }

  return { errors: [], warnings };
};

module.exports = {
  requiresInstance: true,
  skipFurtherValidation: false,
  execute: validateNoteCountdownTimer
};