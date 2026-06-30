const path = require('node:path');
const fs = require('node:fs');

/**
 * Check if a path points to a regular file.
 * @param {string} filePath - Path to check
 * @returns {boolean} True if path is a regular file
 */
const isRegularFile = (filePath) => fs.statSync(filePath).isFile();

/**
 * Find all *.js files inside a config subdirectory of the project.
 * @param {string} projectDir - Project directory path
 * @param {string} subdir - Config subdirectory name (e.g. 'tasks')
 * @returns {string[]} Absolute paths of matching files, sorted alphabetically
 */
const findConfigFiles = (projectDir, subdir) => {
  const dir = path.join(projectDir, subdir);
  try {
    return fs.readdirSync(dir)
      .filter(file => file.endsWith('.js'))
      .sort()
      .map(file => path.join(dir, file))
      .filter(isRegularFile);
  } catch {
    // Directory may not exist, which is expected when the project does not
    // use this config type. Return empty array.
    return [];
  }
};

const findTasksFiles = (projectDir) => findConfigFiles(projectDir, 'tasks');
const findTargetsFiles = (projectDir) => findConfigFiles(projectDir, 'targets');
const findContactSummaryFiles = (projectDir) => findConfigFiles(projectDir, 'contact-summary');

module.exports = {
  findConfigFiles,
  findTasksFiles,
  findTargetsFiles,
  findContactSummaryFiles,
};
