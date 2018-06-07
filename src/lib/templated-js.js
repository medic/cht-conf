const fs = require('../lib/sync-fs');

const fromFile = (projectDir, rootFile) => fromString(projectDir, fs.read(rootFile));
const fromString = (projectDir, rootText) =>
    rootText.replace(/__include_inline__\('\s*([^_]*)'\s*\);/g, (_, includedFile) =>
        fs.read(`${projectDir}/${includedFile}`));

module.exports = { fromFile, fromString };
