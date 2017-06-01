const fs = require('fs');
const warn = require('../lib/log').warn;

function read(path) {
  try {
    return fs.readFileSync(path, { encoding:'utf8' });
  } catch(e) {
    warn(`Error reading file: ${path}`);
    throw e;
  }
}

function readJson(path) {
  try {
    return JSON.parse(read(path));
  } catch(e) {
    warn(`Error parsing JSON in: ${path}`);
    throw e;
  }
}

function withoutExtension(fileName) {
  const extensionStart = fileName.lastIndexOf('.');
  return extensionStart === -1 ? fileName : fileName.substring(0, extensionStart);
}

module.exports = {
  exists: fs.existsSync,
  mkdir: path => { try { fs.mkdirSync(path); } catch(e) { /* yum yum */ } },
  read: read,
  readJson: readJson,
  readBinary: path => fs.readFileSync(path),
  readdir: fs.readdirSync,
  withoutExtension: withoutExtension,
  write: (path, content) => fs.writeFileSync(path, content, 'utf8'),
  writeBinary: (path, content) => fs.writeFileSync(path, content),
  writeJson: (path, json) => module.exports.write(path, JSON.stringify(json, null, 2) + '\n'),
};
