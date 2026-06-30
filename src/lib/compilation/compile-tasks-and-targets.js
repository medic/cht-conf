const path = require('path');
const os = require('node:os');
const nodeFs = require('node:fs');

const pack = require('./package-lib');
const validateDeclarativeSchema = require('./validate-declarative-schema');
const { findTasksFiles, findTargetsFiles } = require('../auto-include');
const { info, warn } = require('../log');

/**
 * Ordered list of files for a config type: the deprecated base file first
 * (most preferred), then the directory files alphabetically.
 * @param {string} projectDir - Project directory path
 * @param {string} baseFilename - Deprecated single base file (e.g. 'tasks.js')
 * @param {function} directoryFinder - auto-include finder for the config directory
 * @param {string} label - Config type label, used for logging and the directory name
 * @returns {string[]} Absolute paths of source files
 */
const collectFiles = (projectDir, baseFilename, directoryFinder, label) => {
  const files = [];
  const basePath = path.join(projectDir, baseFilename);
  if (nodeFs.existsSync(basePath)) {
    warn(`${baseFilename} is deprecated. Please move it to ${label}/base.js`);
    files.push(basePath);
  }
  directoryFinder(projectDir).forEach(filePath => {
    info(`Including ${label}: ${path.basename(filePath)}`);
    files.push(filePath);
  });
  return files;
};

/**
 * Generate the webpack entry that requires every task/target file and emits
 * them via the emitters.
 * @param {string[]} taskFiles - Absolute paths of task source files
 * @param {string[]} targetFiles - Absolute paths of target source files
 * @returns {string} Path to the generated entry file
 */
const generateEntry = (taskFiles, targetFiles) => {
  // Unique dir per call so concurrent compiles (parallel CI, monorepos) never
  // clobber each other's entry file.
  const entryDir = nodeFs.mkdtempSync(path.join(os.tmpdir(), 'nools-'));
  const entryPath = path.join(entryDir, 'lib.js');

  const taskEmitterPath = path.join(__dirname, '../../nools/task-emitter');
  const targetEmitterPath = path.join(__dirname, '../../nools/target-emitter');
  const requireList = paths => paths.map(p => `  require(${JSON.stringify(p)})`).join(',\n');

  const content = `/* global c, emit, Task, Target, Utils */
const taskEmitter = require(${JSON.stringify(taskEmitterPath)});
const targetEmitter = require(${JSON.stringify(targetEmitterPath)});

const allTasks = [].concat(
${requireList(taskFiles)}
);
const allTargets = [].concat(
${requireList(targetFiles)}
);

targetEmitter(allTargets, c, Utils, Target, emit);
taskEmitter(allTasks, c, Utils, Task, emit);

emit('_complete', { _id: true });
`;
  nodeFs.writeFileSync(entryPath, content);
  return entryPath;
};

const compileTasksAndTargets = async (projectDir, options = {}) => {
  const taskFiles = collectFiles(projectDir, 'tasks.js', findTasksFiles, 'tasks');
  const targetFiles = collectFiles(projectDir, 'targets.js', findTargetsFiles, 'targets');

  validateDeclarativeSchema(projectDir, options.haltOnSchemaError);

  const entryPath = generateEntry(taskFiles, targetFiles);
  const baseEslintPath = path.join(__dirname, '../../nools/.eslintrc');

  const rules = await pack(projectDir, entryPath, { baseEslintPath, options });
  return { rules, isDeclarative: true };
};

module.exports = compileTasksAndTargets;
