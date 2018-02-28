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
  const extension = fs.extension(fileName);

  switch(extension) {
    case 'json': return 'application/json';
    case 'png' : return 'image/png';
    case 'svg' : return 'image/svg+xml';
    case 'xml' : return 'application/xml';
    default: throw new Error(`Unrecongised file extension: ${extension} for file ${fileName}`);
  }
}
