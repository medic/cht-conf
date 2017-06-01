const attachmentFromFile = require('./attachment-from-file');
const fs = require('./sync-fs');
const path = require('path');
const warn = require('./log').warn;

module.exports = dir => {
  if(!fs.exists(dir)) return warn('Cannot build list of attachments from non-existent dir:', dir);

  const attachments = {};
  fs.recurseFiles(dir)
    .forEach(form => {
      attachments[path.relative(dir, form)] = attachmentFromFile(form);
    });
  return attachments;
};
