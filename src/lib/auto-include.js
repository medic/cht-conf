const path = require('node:path');
const fs = require('node:fs');

/**
 * Check if a file matches the suffix pattern and is not excluded
 * @param {string} file - File name to check
 * @param {string} suffix - File suffix to match
 * @param {string} exclude - File name to exclude
 * @returns {boolean} True if file matches criteria
 */
const matchesSuffixPattern = (file, suffix, exclude) => {
  return file.endsWith(suffix) && file !== exclude;
};

/**
 * Check if a path points to a regular file
 * @param {string} filePath - Path to check
 * @returns {boolean} True if path is a regular file
 */
const isRegularFile = (filePath) => {
  return fs.statSync(filePath).isFile();
};

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
    const matchingFiles = files.filter(file => matchesSuffixPattern(file, suffix, exclude));
    const sortedFiles = matchingFiles.sort();
    const fullPaths = sortedFiles.map(file => path.join(projectDir, file));
    return fullPaths.filter(isRegularFile);
  } catch {
    // Directory may not exist or may not be readable, which is expected
    // when the project doesn't use auto-include files. Return empty array.
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
