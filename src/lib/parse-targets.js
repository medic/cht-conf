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

const readTargetsJson = (jsonPath, jsPath, jsExists, dirFiles) => {
  if (jsExists) {
    throw new Error(
      `Targets are defined at both ${jsonPath} and ${jsPath}. Only one of these files should exist.`,
    );
  }
  if (dirFiles.length) {
    throw new Error(
      `Targets are defined in both ${jsonPath} and the targets/ directory. ` +
        'targets.json is deprecated: move its contents into targets/base.js and delete targets.json.',
    );
  }
  warn(
    'targets.json is deprecated. Please move your targets to targets/base.js and delete targets.json.',
  );
  return fs.readJson(jsonPath);
};

const parseTargets = (projectDir) => {
  const jsonPath = path.join(projectDir, 'targets.json');
  const jsPath = path.join(projectDir, 'targets.js');
  const jsExists = fs.exists(jsPath);
  const dirFiles = findTargetsFiles(projectDir);

  if (fs.exists(jsonPath)) {
    return readTargetsJson(jsonPath, jsPath, jsExists, dirFiles);
  }

  // targets.js (deprecated base file, most-preferred) and targets/*.js merge
  // cleanly: both are arrays normalised through the same metadata whitelist,
  // `enabled` is always true, and cross-file duplicate ids are caught by
  // validate-declarative-schema.
  const jsItems = jsExists ? requireTargetArray(jsPath) : [];
  const dirItems = dirFiles.flatMap(requireTargetArray);
  return { enabled: true, items: jsItems.concat(dirItems) };
};

module.exports = parseTargets;
