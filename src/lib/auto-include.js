const path = require('path');
const fs = require('fs');

/**
 * Find all files matching a suffix pattern in a directory
 * @param {string} projectDir - Project directory path
 * @param {string} suffix - File suffix to match (e.g., '.tasks.js')
 * @param {string} exclude - Main file to exclude (e.g., 'tasks.js')
 * @returns {string[]} Array of matching file paths (sorted alphabetically)
 */
const findAutoIncludeFiles = (projectDir, suffix, exclude) => {
  try {
    const files = fs.readdirSync(projectDir);
    return files
      .filter(file => file.endsWith(suffix) && file !== exclude)
      .sort() // Deterministic order
      .map(file => path.join(projectDir, file))
      .filter(filePath => fs.statSync(filePath).isFile());
  } catch (e) {
    return [];
  }
};

/**
 * Find all *.tasks.js files (excluding tasks.js)
 * @param {string} projectDir - Project directory path
 * @returns {string[]} Array of matching file paths
 */
const findTasksExtensions = (projectDir) => {
  return findAutoIncludeFiles(projectDir, '.tasks.js', 'tasks.js');
};

/**
 * Find all *.targets.js files (excluding targets.js)
 * @param {string} projectDir - Project directory path
 * @returns {string[]} Array of matching file paths
 */
const findTargetsExtensions = (projectDir) => {
  return findAutoIncludeFiles(projectDir, '.targets.js', 'targets.js');
};

/**
 * Find all *.contact-summary.js files (excluding contact-summary.templated.js)
 * @param {string} projectDir - Project directory path
 * @returns {string[]} Array of matching file paths
 */
const findContactSummaryExtensions = (projectDir) => {
  return findAutoIncludeFiles(projectDir, '.contact-summary.js', 'contact-summary.templated.js');
};

module.exports = {
  findAutoIncludeFiles,
  findTasksExtensions,
  findTargetsExtensions,
  findContactSummaryExtensions,
};
