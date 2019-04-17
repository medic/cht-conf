const path = require('path');
const filterProperties = require('../lib/filter-properties');
const fs = require('./sync-fs');

function warnOnUnexpectedProperties (targets) {
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
  targets.forEach((target, targetIndex) => {
    Object.keys(target)
      .filter(key => !EXPECTED_KEYS.includes(key))
      .forEach(key => console.warn(`Unexpected key found on target "${target.id || targetIndex}": ${key}`));
  });
}

const getTargets = (projectDir) => {
  const pathToNoolsExtras = path.join(projectDir, 'nools-extras.js');
  const pathToTargetJs = path.join(projectDir, 'targets.js');
  
  let targets;
  try {
    global.extras = require(pathToNoolsExtras);
    targets = require(pathToTargetJs);  
  } finally {
    delete global.extras;
  }

  warnOnUnexpectedProperties(targets);

  return targets;
};

module.exports = {
  js: projectDir => filterProperties(getTargets(projectDir), {
    required: [ 'id', 'appliesTo' ],
    optional: [ 'date', 'emitCustom', 'idType', 'passesIf', 'appliesToType', 'appliesIf' ],
  }),

  json: projectDir => {
    const jsonPath = path.join(projectDir, 'targets.json');
    const jsPath = path.join(projectDir, 'targets.js');

    const jsonExists = fs.exists(jsonPath);
    const jsExists   = fs.exists(jsPath);

    const err = m => { throw new Error(`Error loading targets: ${m}`); };

    if(!jsonExists && !jsExists) err(`Expected to find targets defined at one of ${jsonPath} or ${jsPath}, but could not find either.`);
    if(jsonExists  && jsExists)  err(`Targets are defined at both ${jsonPath} and ${jsPath}.  Only one of these files should exist.`);

    if(jsonExists) return fs.readJson(jsonPath);

    const targets = getTargets(projectDir);
    if(!targets) err(`No array named 'targets' was defined in ${jsPath}`);

    return {
      enabled: true,
      items: filterProperties(targets, {
        required: [ 'id', 'type', 'goal', 'translation_key' ],
        recommended: [ 'icon' ],
        optional: [ 'context', 'subtitle_translation_key' ],
      }),
    };
  },
};
