const path = require('path');
const filterProperties = require('../lib/filter-properties');
const fs = require('./sync-fs');
const { warn } = require('./log');

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
      .forEach(key => warn(`Unexpected key found on target "${target.id || targetIndex}": ${key}`));
  });
}

const getTargets = (projectDir) => {
  const pathToTargetJs = path.join(projectDir, 'targets.js');

  const targets = require(pathToTargetJs);
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

    const throwError = err => {
      throw new Error(`Error loading targets: ${err}`);
    };

    if (!jsonExists && !jsExists) {
      throwError(`Expected to find targets defined at one of ${jsonPath} or ${jsPath}, but could not find either.`);
    }

    if (jsonExists && jsExists) {
      throwError(`Targets are defined at both ${jsonPath} and ${jsPath}.  Only one of these files should exist.`);
    }

    if (jsonExists) return fs.readJson(jsonPath);

    const targets = getTargets(projectDir);
    if (!targets || !Array.isArray(targets)) {
      throwError(`Targets.js is expected to module.exports=[] an array of targets. ${jsPath}`);
    }

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
