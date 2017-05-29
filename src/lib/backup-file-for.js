const fs = require('./sync-fs');

module.exports = (project, originalFileName) => {
  const dir = `${project}/backups`;
  fs.mkdir(dir);
  return `${dir}/${originalFileName}.${Date.now()}.bak`;
};
