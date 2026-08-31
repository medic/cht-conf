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
  // A missing directory is expected when the project does not use this config
  // type. Anything that exists but cannot be read (permissions,
  // not-a-directory) still throws from readdirSync — config that is there must
  // fail loudly rather than being silently dropped.
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((dirent) => dirent.isFile() && dirent.name.endsWith('.js'))
    .map((dirent) => dirent.name)
    .sort()
    .map((name) => path.join(dir, name));
};

/**
 * Build the ordered list of config files for a config type: the deprecated
 * single base file first, then the directory files
 * alphabetically. Optionally logs a deprecation warning for the base file and
 * an info line per directory file.
 * @param {string} projectDir - Project directory path
 * @param {object} opts
 * @param {string} opts.baseFilename - Deprecated single base file (e.g. 'tasks.js')
 * @param {string} opts.subdir - Config subdirectory name, also used in log
 *   messages and the base.js hint (e.g. 'tasks')
 * @param {boolean} [opts.log=false] - Emit deprecation/info logs
 * @returns {string[]} Ordered absolute paths
 */
const collectConfigFiles = (projectDir, { baseFilename, subdir, log = false }) => {
  const files = [];
  const basePath = path.join(projectDir, baseFilename);
  if (fs.existsSync(basePath)) {
    if (log) {
      warn(`${baseFilename} is deprecated. Please move it to ${subdir}/base.js`);
    }
    files.push(basePath);
  }
  findConfigFiles(projectDir, subdir).forEach((filePath) => {
    if (log) {
      info(`Including ${subdir}: ${path.basename(filePath)}`);
    }
    files.push(filePath);
  });
  return files;
};

const findTargetsFiles = (projectDir) => findConfigFiles(projectDir, 'targets');

module.exports = {
  findConfigFiles,
  collectConfigFiles,
  findTargetsFiles,
};
