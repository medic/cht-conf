const fs = require('./sync-fs');

const PouchDB = require('pouchdb');

module.exports = (project, couchUrl) => {
  const db = new PouchDB(couchUrl);

  const dir = `${project}/forms`;
  return Promise.all(fs.readdir(dir)
    .filter(name => name.endsWith('.xlsx'))
    .map(xls => {
      const name = xls.substring(0, xls.length - 5);
      const formDir = `${dir}/${name}`;

      if(!fs.exists(formDir)) {
        console.log(`No form directory found corresponding to XML ${dir}/${name}`);
        return Promise.resolve();
      }

      const doc = { _id: `form:${name}`, type:'form' };

      const propertiesPath = `${formDir}/properties.json`;
      if(fs.exists(propertiesPath)) {
        const properties = fs.readJson(propertiesPath);
        doc.context = properties.context;
        doc.icon = properties.icon;
      }

      const attachments = {};
      fs.readdir(`${formDir}`)
        .filter(name => name !== 'properties.json')
        .forEach(fileName => {
          const filePath = `${formDir}/${fileName}`;
          const data = fs.readBinary(filePath);
          const mime = mimeTypeFor(fileName);
          attachments[fileName] = {
            content_type: mime,
            data: new Buffer(data),
          };

          if(fileName === 'xml') {
            // FIXME this is not how to parse XML
            const xml = fs.read(filePath);
            const title = xml.substring(xml.indexOf('<h:title>') + 9, xml.indexOf('</h:title>'));
            doc.title = title;
          }
        });
      doc._attachments = attachments;

      return db.put(doc);
    }));
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
