const fs = require('fs');
const warn = require('../lib/log').warn;

module.exports = {
  exists: fs.existsSync,
  mkdir: path => { try { fs.mkdirSync(path); } catch(e) { /* yum yum */ } },
  read: path => {
    try {
      return fs.readFileSync(path, { encoding:'utf8' });
    } catch(e) {
      warn(`Error reading file: ${path}`);
      throw e;
    }
  },
  readJson: path => {
    try {
      return JSON.parse(module.exports.read(path));
    } catch(e) {
      warn(`Error parsing JSON in: ${path}`);
      throw e;
    }
  },
  readBinary: path => fs.readFileSync(path),
  readdir: fs.readdirSync,
  withoutExtension: fileName => {
    const extensionStart = fileName.lastIndexOf('.');
    return extensionStart === -1 ? fileName : fileName.substring(0, extensionStart);
  },
  write: (path, content) => fs.writeFileSync(path, content, 'utf8'),
  writeBinary: (path, content) => fs.writeFileSync(path, content),
  writeJson: (path, json) => module.exports.write(path, JSON.stringify(json, null, 2) + '\n'),
};
