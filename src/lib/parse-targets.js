const path = require('path');
const fs = require('./sync-fs');
const { findTargetsFiles } = require('./auto-include');
const {
  TARGET_METADATA_FIELDS,
} = require('./compilation/validate-declarative-schema');
const { warn } = require('./log');

const pick = (obj, attributes) =>
  attributes.reduce((agg, curr) => {
    if (curr in obj) {
      agg[curr] = obj[curr];
    }
    return agg;
  }, {});

const requireTargetArray = (filePath) => {
  const targets = require(filePath);
  if (!Array.isArray(targets)) {
    throw new TypeError(
      `Targets file is expected to module.exports=[] an array of targets. ${filePath}`,
    );
  }
  return targets.map((target) => pick(target, TARGET_METADATA_FIELDS));
};

module.exports = (projectDir) => {
  const jsonPath = path.join(projectDir, 'targets.json');
  const jsPath = path.join(projectDir, 'targets.js');
  const jsonExists = fs.exists(jsonPath);
  const jsExists = fs.exists(jsPath);
  const dirFiles = findTargetsFiles(projectDir);

  if (jsonExists && jsExists) {
    throw new Error(
      `Targets are defined at both ${jsonPath} and ${jsPath}. Only one of these files should exist.`,
    );
  }

  if (jsonExists && dirFiles.length) {
    throw new Error(
      `Targets are defined in both ${jsonPath} and the targets/ directory. ` +
        'targets.json is deprecated: move its contents into targets/base.js and delete targets.json.',
    );
  }

  if (jsonExists) {
    warn(
      'targets.json is deprecated. Please move your targets to targets/base.js and delete targets.json.',
    );
    return fs.readJson(jsonPath);
  }

  const dirItems = dirFiles.flatMap(requireTargetArray);
  if (jsExists) {
    return {
      enabled: true,
      items: requireTargetArray(jsPath).concat(dirItems),
    };
  }

  return { enabled: true, items: dirItems };
};
