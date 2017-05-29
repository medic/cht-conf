const fs = require('fs');

module.exports = {
  exists: fs.existsSync,
  mkdir: path => { try { fs.mkdirSync(path); } catch(e) { /* yum yum */ } },
  read: path => fs.readFileSync(path, { encoding:'utf8' }),
  readJson: path => JSON.parse(module.exports.read(path)),
  readBinary: path => fs.readFileSync(path),
  readdir: fs.readdirSync,
  write: (path, content) => fs.writeFileSync(path, content, 'utf8'),
  writeBinary: (path, content) => fs.writeFileSync(path, content),
  writeJson: (path, json) => module.exports.write(path, JSON.stringify(json, null, 2) + '\n'),
};
