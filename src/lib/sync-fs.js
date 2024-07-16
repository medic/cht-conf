const { parse: csvParse } = require('csv-parse/sync');
const fs = require('fs');
const mkdirp = require('mkdirp').sync;
const os = require('os');
const path = require('path');
const trace = require('../lib/log').trace;
const userPrompt = require('../lib/user-prompt');
const warn = require('../lib/log').warn;

function read(path) {
  try {
    return fs.readFileSync(path, { encoding:'utf8' });
  } catch(e) {
    warn(`Error reading file: ${path}`);
    throw e;
  }
}

function readCsv(path) {
  const raw = csvParse(read(path));
  if(!raw.length) return { cols:[], rows:[] };
  return {
    cols: raw[0],
    rows: raw.slice(1),
  };
}

function readJson(path) {
  try {
    return JSON.parse(read(path));
  } catch(e) {
    warn(`Error parsing JSON in: ${path}`);
    throw e;
  }
}

function dirs(dir) {
  return fs
      .readdirSync(dir)
      .filter(file => fs
          .statSync(path.join(dir, file))
          .isDirectory());
}

function recurseFiles(dir, files) {
  if(!files) files = [];

  fs.readdirSync(dir)
    .filter(name => !name.startsWith('.'))
    .forEach(name => {
      const f = path.join(dir, name);
      try {
        const stat = fs.statSync(f);

        if(stat.isDirectory()) recurseFiles(f, files);
        else files.push(f);
      } catch(e) {
        if(e.code === 'ENOENT') trace('Ignoring file (err ENOENT - may be a symlink):', f);
        else throw e;
      }
    });

  return files;
}

function extension(fileName) {
  const extensionStart = fileName.lastIndexOf('.');
  return extensionStart === -1 ?
      fileName :
      fileName.substring(extensionStart+1);
}

function withoutExtension(fileName) {
  const extensionStart = fileName.lastIndexOf('.');
  return extensionStart === -1 ? fileName : fileName.substring(0, extensionStart);
}

function copy(from, to, { overwrite=true }={}) {
  if (overwrite || !fs.existsSync(to)) {
    fs.copyFileSync(from, to);
  }
}

function isDirectoryEmpty(dir) {
  return !fs.readdirSync(dir).length;
}

function warnIfDirectoryIsNotEmpty(dir, warningMsg) {
  if (!isDirectoryEmpty(dir)) {
    warn(warningMsg);

    if (!userPrompt.keyInYN('Are you sure you want to continue?')) {
      throw new Error('User aborted execution.');
    }
  }
}

module.exports = {
  copy,
  dirs,
  exists: fs.existsSync,
  extension,
  fs,
  isDirectoryEmpty,
  mkdir: path => { try { mkdirp(path); } catch(e) { warn(e); } },
  mkdtemp: () => fs.mkdtempSync(`${os.tmpdir()}/cht-conf`),
  path,
  posixPath: p => p.split(path.sep).join('/'),
  read,
  readBinary: path => fs.readFileSync(path),
  readCsv,
  readJson,
  recurseFiles,
  deleteFilesInFolder: folderPath => recurseFiles(folderPath).forEach(filePath => fs.unlinkSync(filePath)),
  readdir: fs.readdirSync,
  statSync: fs.statSync,
  warnIfDirectoryIsNotEmpty,
  withoutExtension,
  write: (path, data, options = 'utf8') => fs.writeFileSync(path, data, options),
  writeBinary: (path, content) => fs.writeFileSync(path, content),
  writeJson: (path, json) => module.exports.write(path, JSON.stringify(json, null, 2) + '\n'),
};
