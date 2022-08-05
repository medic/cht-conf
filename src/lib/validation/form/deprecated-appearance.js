const { getNodes } = require('../../forms-utils');

// Based on https://forum.getodk.org/t/spec-proposal-harmonize-compact-compact-n-horizontal-horizontal-compact-appearances/15565/32
// Note the order of evaluation is important
const DEPRECATED_APPEARANCES = [
  {
    match: appearance => appearance.match(/(?:^|\s)horizontal-compact(?:$|\s)/),
    replacement: () => 'columns-pack'
  },
  {
    match: appearance => appearance.match(/(?:^|\s)horizontal(?:$|\s)/),
    replacement: () => 'columns'
  },
  {
    match: appearance => appearance.match(/(?:^|\s)compact-(\d{1,2})(?:$|\s)/),
    replacement: (match) => `columns-${match[1].trim()} no-buttons`
  },
  {
    match: appearance => appearance.match(/(?:^|\s)compact(?:$|\s)/),
    replacement: () => 'columns-pack no-buttons'
  },
];

const getElementsWithAppearance = (xmlDoc) => getNodes(xmlDoc, '/h:html/h:body//*[@appearance]');

const unpackElementAttributes = element => ({
  ref: element.getAttribute('ref'),
  appearance: element.getAttribute('appearance'),
});

const populateDeprecatedAppearance = node => {
  // Only warning for the first deprecated appearance found for an element. This seems acceptable.
  node.deprecatedAppearance = DEPRECATED_APPEARANCES.find(depAppearance => depAppearance.match(node.appearance));
  return node;
};

const createWarning = ({ ref, appearance, deprecatedAppearance }) => {
  const match = deprecatedAppearance.match(appearance);
  const originalAppearance = match[0].trim();
  const newAppearance = deprecatedAppearance.replacement(match);
  return `  - ${ref}: replace [${originalAppearance}] with [${newAppearance}]`;
};

module.exports = {
  requiresInstance: true,
  skipFurtherValidation: false,
  execute: async({ xformPath, xmlDoc }) => {
    const warnings = getElementsWithAppearance(xmlDoc)
      .map(unpackElementAttributes)
      .filter(({ appearance }) => appearance)
      .map(populateDeprecatedAppearance)
      .filter(({ deprecatedAppearance }) => deprecatedAppearance)
      .map(createWarning);

    if(warnings.length) {
      warnings.unshift(`Form at ${xformPath} contains fields with the deprecated \`horizontal\`/\`compact\` appearance. ` +
        'These have been deprecated in favor of the `columns` appearance. Please update the following fields:');
    }

    return { errors: [], warnings };
  }
};
