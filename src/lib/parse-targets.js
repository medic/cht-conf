const path = require('path');
const fs = require('./sync-fs');

const pick = (obj, attributes) => attributes.reduce((agg, curr) => {
  if (curr in obj) {
    agg[curr] = obj[curr];
  }
  return agg;
}, {});

module.exports = projectDir => {
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

  if (jsonExists) {
    return fs.readJson(jsonPath);
  }

  const pathToTargetJs = path.join(projectDir, 'targets.js');
  const targets = require(pathToTargetJs);
  if (!targets || !Array.isArray(targets)) {
    throwError(`Targets.js is expected to module.exports=[] an array of targets. ${jsPath}`);
  }
  const serializeFunctions = obj => {
    if (typeof obj === 'function') {
      return obj.toString();
    }
    if (Array.isArray(obj)) {
      return obj.map(serializeFunctions);
    }
    if (obj && typeof obj === 'object') {
      const result = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          result[key] = serializeFunctions(obj[key]);
        }

      }
      return result;
    }
    return obj;
  };


  return {
    enabled: true,
    items: targets.map(target => serializeFunctions(pick(target, [
      'id',
      'type',
      'goal',
      'translation_key',
      'passesIfGroupCount',
      'icon',
      'context',
      'subtitle_translation_key',
      'dhis',
      'visible',
      'aggregate',
    ]))),
  };

};
