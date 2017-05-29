const fs = require('./sync-fs');
const warn = require('./log').warn;

module.exports = dir => {
  if(!fs.exists(dir)) return warn('Cannot build list of attachments from non-existent dir:', dir);

  const attachments = {};
  fs.readdir(dir)
    .forEach(fileName => {
      const filePath = `${dir}/${fileName}`;
      const data = fs.readBinary(filePath);
      const mime = mimeTypeFor(fileName);
      attachments[fileName] = {
        content_type: mime,
        data: new Buffer(data),
      };
    });
  return attachments;
};

function mimeTypeFor(fileName) {
  const extensionStart = fileName.indexOf('.');
  const extension = extensionStart === -1 ?
      fileName :
      fileName.substring(extensionStart+1);

  switch(extension) {
    case 'json': return 'application/json';
    case 'png' : return 'image/png';
    case 'xml' : return 'application/xml';
    default: throw new Error(`Unrecongised file extension: ${extension}`);
  }
}
