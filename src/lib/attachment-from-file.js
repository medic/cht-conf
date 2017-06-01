const fs = require('./sync-fs');

module.exports = path => {
  const data = fs.readBinary(path);
  const mime = mimeTypeFor(path);
  return {
    content_type: mime,
    data: new Buffer(data),
  };
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
