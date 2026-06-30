const path = require('path');
const fs = require('./sync-fs');
const { findTargetsFiles } = require('./auto-include');

const TARGET_FIELDS = [
  'id', 'type', 'goal', 'translation_key', 'passesIfGroupCount', 'icon',
  'context', 'subtitle_translation_key', 'dhis', 'visible', 'aggregate',
  'limit_count_to_goal',
];

const pick = (obj, attributes) => attributes.reduce((agg, curr) => {
  if (curr in obj) {
    agg[curr] = obj[curr];
  }
  return agg;
}, {});

const requireTargetArray = (filePath) => {
  const targets = require(filePath);
  if (!Array.isArray(targets)) {
    throw new Error(`Targets file is expected to module.exports=[] an array of targets. ${filePath}`);
  }
  return targets.map(target => pick(target, TARGET_FIELDS));
};

module.exports = projectDir => {
  const jsonPath = path.join(projectDir, 'targets.json');
  const jsPath = path.join(projectDir, 'targets.js');
  const jsonExists = fs.exists(jsonPath);
  const jsExists = fs.exists(jsPath);

  if (jsonExists && jsExists) {
    throw new Error(
      `Targets are defined at both ${jsonPath} and ${jsPath}. Only one of these files should exist.`
    );
  }

  const dirItems = findTargetsFiles(projectDir).flatMap(requireTargetArray);

  if (jsonExists) {
    const json = fs.readJson(jsonPath);
    // Preserve exact legacy behaviour when no directory files are present.
    if (dirItems.length === 0) {
      return json;
    }
    // Merging with directory files: normalise both sources through the same field
    // whitelist so the combined items array has a consistent shape. Tolerate a legacy
    // top-level-array targets.json as well as the documented { enabled, items } object.
    const jsonItems = Array.isArray(json) ? json : (json.items || []);
    const merged = Array.isArray(json) ? { enabled: true } : Object.assign({}, json);
    merged.items = jsonItems.map(target => pick(target, TARGET_FIELDS)).concat(dirItems);
    return merged;
  }

  if (jsExists) {
    return { enabled: true, items: requireTargetArray(jsPath).concat(dirItems) };
  }

  return { enabled: true, items: dirItems };
};
