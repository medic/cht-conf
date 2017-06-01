const attachmentFromFile = require('./attachment-from-file');
const fs = require('./sync-fs');
const warn = require('./log').warn;

module.exports = dir => {
  if(!fs.exists(dir)) return warn('Cannot build list of attachments from non-existent dir:', dir);

  const attachments = {};
  fs.readdir(dir)
    .forEach(fileName => {
      const filePath = `${dir}/${fileName}`;
      attachments[fileName] = attachmentFromFile(filePath);
    });
  return attachments;
};
