const path = require('node:path');
const fs = require('node:fs');
const { info, warn } = require('./log');

/**
 * Find all *.js files inside a config subdirectory of the project.
 * @param {string} projectDir - Project directory path
 * @param {string} subdir - Config subdirectory name (e.g. 'tasks')
 * @returns {string[]} Absolute paths of matching files, sorted alphabetically
 */
const findConfigFiles = (projectDir, subdir) => {
  const dir = path.join(projectDir, subdir);
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((dirent) => dirent.isFile() && dirent.name.endsWith('.js'))
      .map((dirent) => dirent.name)
      .sort()
      .map((name) => path.join(dir, name));
  } catch (err) {
    // A missing directory is expected when the project does not use this config
    // type. Any other error (permissions, not-a-directory, fd exhaustion) means
    // config exists but could not be read — fail loudly rather than silently
    // dropping it.
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
};

/**
 * Build the ordered list of config files for a config type: the deprecated
 * single base file first, then the directory files
 * alphabetically. Optionally logs a deprecation warning for the base file and
 * an info line per directory file.
 * @param {string} projectDir - Project directory path
 * @param {object} opts
 * @param {string} opts.baseFilename - Deprecated single base file (e.g. 'tasks.js')
 * @param {string} opts.subdir - Config subdirectory name (e.g. 'tasks')
 * @param {string} opts.label - Config type label used in log messages and the base.js hint
 * @param {boolean} [opts.log=false] - Emit deprecation/info logs
 * @returns {string[]} Ordered absolute paths
 */
const collectConfigFiles = (
  projectDir,
  { baseFilename, subdir, label, log = false },
) => {
  const files = [];
  const basePath = path.join(projectDir, baseFilename);
  if (fs.existsSync(basePath)) {
    if (log) {
      warn(`${baseFilename} is deprecated. Please move it to ${label}/base.js`);
    }
    files.push(basePath);
  }
  findConfigFiles(projectDir, subdir).forEach((filePath) => {
    if (log) {
      info(`Including ${label}: ${path.basename(filePath)}`);
    }
    files.push(filePath);
  });
  return files;
};

const findTasksFiles = (projectDir) => findConfigFiles(projectDir, 'tasks');
const findTargetsFiles = (projectDir) => findConfigFiles(projectDir, 'targets');
const findContactSummaryFiles = (projectDir) =>
  findConfigFiles(projectDir, 'contact-summary');

module.exports = {
  findConfigFiles,
  collectConfigFiles,
  findTasksFiles,
  findTargetsFiles,
  findContactSummaryFiles,
};
