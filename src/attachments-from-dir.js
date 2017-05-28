const fs = require('./sync-fs');

module.exports = (dir, ...ignore) => {
  const attachments = {};
  fs.readdir(dir)
    .filter(name => !ignore || !ignore.includes(name))
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
