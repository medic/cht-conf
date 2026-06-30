const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

/**
 * Build `require("<absolute path>")` statements for a list of files.
 * JSON.stringify keeps the paths safe inside generated source (Windows
 * backslashes, special characters).
 * @param {string[]} paths - Absolute file paths to require
 * @returns {string[]} require() statement strings
 */
const requireStatements = (paths) => paths.map(p => `require(${JSON.stringify(p)})`);

/**
 * Write a generated webpack entry to a unique temp directory so concurrent
 * compiles (parallel CI, monorepos) never clobber each other's entry file.
 * @param {string} prefix - Temp directory name prefix (e.g. 'nools')
 * @param {string} content - Entry file source
 * @returns {string} Path to the written entry file
 */
const writeEntry = (prefix, content) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
  const entryPath = path.join(dir, 'lib.js');
  fs.writeFileSync(entryPath, content);
  return entryPath;
};

module.exports = { requireStatements, writeEntry };
