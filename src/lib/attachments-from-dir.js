const attachmentFromFile = require('./attachment-from-file');
const fs = require('./sync-fs');
const warn = require('./log').warn;

module.exports = dir => {
  if(!fs.exists(dir)) return warn('Cannot build list of attachments from non-existent dir:', dir);

  const attachments = {};
  fs.recurseFiles(dir)
    .forEach(form => {
      const attachmentPath = fs.posixPath(fs.path.relative(dir, form));
      attachments[attachmentPath] = attachmentFromFile(form);
    });
  return attachments;
};
