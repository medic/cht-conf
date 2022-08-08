const semver = require('semver');
const { getNodes } = require('../../forms-utils');

// Based on https://forum.getodk.org/t/spec-proposal-harmonize-compact-compact-n-horizontal-horizontal-compact-appearances/15565/32
// Note the order of evaluation is important
const getDeprecatedAppearances = (apiVersion) => [
  {
    match: appearance => appearance.match(/(?:^|\s)horizontal-compact(?:$|\s)/),
    replacement: () => 'columns-pack',
    versionDeprecated: '4.0.0'
  },
  {
    match: appearance => appearance.match(/(?:^|\s)horizontal(?:$|\s)/),
    replacement: () => 'columns',
    versionDeprecated: '4.0.0'
  },
  {
    match: appearance => appearance.match(/(?:^|\s)compact-(\d{1,2})(?:$|\s)/),
    replacement: (match) => `columns-${match[1].trim()} no-buttons`,
    versionDeprecated: '4.0.0'
  },
  {
    match: appearance => appearance.match(/(?:^|\s)compact(?:$|\s)/),
    replacement: () => 'columns-pack no-buttons',
    versionDeprecated: '4.0.0'
  },
].filter(deprecatedAppearance => semver.gte(apiVersion, deprecatedAppearance.versionDeprecated));

const getElementsWithAppearance = (xmlDoc) => getNodes(xmlDoc, '/h:html/h:body//*[@appearance]');

const unpackDeprecationAttributes = element => ({
  ref: element.getAttribute('ref'),
  appearance: element.getAttribute('appearance'),
});

const hasAppearance = ({ appearance }) => appearance;

const populateDeprecatedAppearance = deprecatedAppearances => ({ ref, appearance }) => ({
  ref,
  appearance,
  // Only warning for the first deprecated appearance found for an element. This seems acceptable.
  deprecatedAppearance: deprecatedAppearances.find(depAppearance => depAppearance.match(appearance))
});

const hasDeprecatedAppearance = ({ deprecatedAppearance }) => deprecatedAppearance;

const createWarning = ({ ref, appearance, deprecatedAppearance }) => {
  const match = deprecatedAppearance.match(appearance);
  const originalAppearance = match[0].trim();
  const newAppearance = deprecatedAppearance.replacement(match);
  return `  - ${ref}: replace [${originalAppearance}] with [${newAppearance}]`;
};

const populateWarningHeader = (xformPath, warnings) => {
  if(warnings.length) {
    warnings.unshift(`Form at ${xformPath} contains fields with the deprecated \`horizontal\`/\`compact\` appearance. ` +
      'These have been deprecated in favor of the `columns` appearance. Please update the following fields:');
  }
};

const validateDeprecatedAppearances = async({ xformPath, xmlDoc, apiVersion }) => {
  if(!apiVersion) {
    return { warnings: [], errors: [], };
  }

  const deprecatedAppearances = getDeprecatedAppearances(apiVersion);
  if(!deprecatedAppearances.length) {
    return { warnings: [], errors: [], };
  }

  const warnings = getElementsWithAppearance(xmlDoc)
    .map(unpackDeprecationAttributes)
    .filter(hasAppearance)
    .map(populateDeprecatedAppearance(deprecatedAppearances))
    .filter(hasDeprecatedAppearance)
    .map(createWarning);

  populateWarningHeader(xformPath, warnings);

  return { errors: [], warnings };
};

module.exports = {
  requiresInstance: true,
  skipFurtherValidation: false,
  execute: validateDeprecatedAppearances
};
