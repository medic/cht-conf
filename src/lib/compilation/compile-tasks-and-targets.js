const path = require('path');
const nodeFs = require('node:fs');

const pack = require('./package-lib');
const validateDeclarativeSchema = require('./validate-declarative-schema');
const { collectConfigFiles } = require('../auto-include');
const { requireStatements, writeEntry } = require('./generated-entry');
const { warn } = require('../log');

const REMOVED_NOOLS_FILE = 'rules.nools.js';

/**
 * Warn (once) if the project still has the removed nools rules file, which is
 * silently ignored as of cht-conf 7.0.
 * @param {string} projectDir - Project directory path
 */
const warnRemovedFiles = (projectDir) => {
  if (nodeFs.existsSync(path.join(projectDir, REMOVED_NOOLS_FILE))) {
    warn(
      `${REMOVED_NOOLS_FILE} is no longer supported and will be ignored. `
      + 'Migrate your nools rules to declarative tasks/ and targets/ configuration.'
    );
  }
};

/**
 * Generate the webpack entry that requires every task/target file and emits
 * them via the emitters.
 * @param {string[]} taskFiles - Absolute paths of task source files
 * @param {string[]} targetFiles - Absolute paths of target source files
 * @returns {string} Path to the generated entry file
 */
const generateEntry = (taskFiles, targetFiles) => {
  const taskEmitterPath = path.join(__dirname, '../../nools/task-emitter');
  const targetEmitterPath = path.join(__dirname, '../../nools/target-emitter');

  const content = `/* global c, emit, Task, Target, Utils */
const taskEmitter = require(${JSON.stringify(taskEmitterPath)});
const targetEmitter = require(${JSON.stringify(targetEmitterPath)});

const allTasks = [].concat(
  ${requireStatements(taskFiles).join(',\n  ')}
);
const allTargets = [].concat(
  ${requireStatements(targetFiles).join(',\n  ')}
);

targetEmitter(allTargets, c, Utils, Target, emit);
taskEmitter(allTasks, c, Utils, Task, emit);

emit('_complete', { _id: true });
`;
  return writeEntry('nools', content);
};

const compileTasksAndTargets = async (projectDir, options = {}) => {
  warnRemovedFiles(projectDir);

  const taskFiles = collectConfigFiles(projectDir, {
    baseFilename: 'tasks.js', subdir: 'tasks', label: 'tasks', log: true,
  });
  const targetFiles = collectConfigFiles(projectDir, {
    baseFilename: 'targets.js', subdir: 'targets', label: 'targets', log: true,
  });

  validateDeclarativeSchema(projectDir, options.haltOnSchemaError);

  const entryPath = generateEntry(taskFiles, targetFiles);
  const baseEslintPath = path.join(__dirname, '../../nools/.eslintrc');

  const rules = await pack(projectDir, entryPath, { baseEslintPath, options });
  return { rules, isDeclarative: true };
};

module.exports = compileTasksAndTargets;
