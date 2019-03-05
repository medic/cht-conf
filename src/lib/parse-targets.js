const filterProperties = require('../lib/filter-properties');
const fs = require('./sync-fs');
const jsToString = require('./js-to-string');
const parseJs = require('./simple-js-parser');

function getUnfilteredJs(projectDir) {
  const unfiltered = parseJs({
    jsFiles: [
      `${projectDir}/shared.lib.js`,
      `${projectDir}/targets.lib.js`,
      `${projectDir}/targets.js`,
    ],
    export: [
      'targets',
    ],
    header: `
      var Utils = {
        now: function() {},
      }`,
  }).targets;

  // TODO not clear if we want to do this, as it restricts people from doing
  // creative things in the future.  Maybe that's a good thing, though...
  // Check for unexpected properties in target definitions:
  const EXPECTED_KEYS = [
    // common properties
    'id',

    // nools paroperties
    'appliesIf',
    'appliesTo',
    'appliesToType',
    'date',
    'emitCustom',
    'idType',
    'passesIf',

    // display properties
    'type',
    'icon',
    'goal',
    'translation_key',
    'subtitle_translation_key',
    'context',
  ];
  unfiltered.forEach(t =>
      Object.keys(t)
        .filter(k => !EXPECTED_KEYS.includes(k))
        .forEach(k => {
          throw new Error(`Unexpected key found in target definition: ${k}`);
        }));

  // Validate required fields which are not used by all types of target:
  unfiltered.forEach(t => {
    switch(t.appliesTo) {
      case 'reports':
        checkForRequiredProperty(t, 'date');
        break;
      case 'contacts':
        break;
      default:
        throw new Error(`No handling implemented in medic-conf for target appliesTo: ${t.appliesTo}`);
    }
  });

  return unfiltered;
}

function checkForRequiredProperty(target, property) {
  if(target.hasOwnProperty(property)) return;

  throw new Error(`${target.appliesTo}-based target is missing required property: 'date': ${jsToString(target)}`);
}


module.exports = {
  js: projectDir => filterProperties(getUnfilteredJs(projectDir), {
    required: [ 'id', 'appliesTo' ],
    optional: [ 'date', 'emitCustom', 'idType', 'passesIf', 'appliesToType', 'appliesIf' ],
  }),

  json: projectDir => {
    const jsonPath = `${projectDir}/targets.json`;
    const jsPath   = `${projectDir}/targets.js`;

    const jsonExists = fs.exists(jsonPath);
    const jsExists   = fs.exists(jsPath);

    const err = m => { throw new Error(`Error loading targets: ${m}`); };

    if(!jsonExists && !jsExists) err(`Expected to find targets defined at one of ${jsonPath} or ${jsPath}, but could not find either.`);
    if(jsonExists  && jsExists)  err(`Targets are defined at both ${jsonPath} and ${jsPath}.  Only one of these files should exist.`);

    if(jsonExists) return fs.readJson(jsonPath);

    const targets = getUnfilteredJs(projectDir);
    if(!targets) err(`No array named 'targets' was defined in ${jsPath}`);

    return {
      enabled: true,
      items: filterProperties(targets, {
        required: [ 'id', 'type', 'goal', 'translation_key', 'subtitle_translation_key' ],
        recommended: [ 'icon' ],
        optional: [ 'context' ],
      }),
    };
  },
};
