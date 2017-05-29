const fs = require('../lib/sync-fs');
const attachmentsFromDir = require('../lib/attachments-from-dir');
const warn = require('../cli/utils').warn;

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
        warn(`No form directory found corresponding to XML ${dir}/${name}`);
        return Promise.resolve();
      }

      const doc = { _id: `form:${name}`, type:'form' };

      const propertiesPath = `${dir}/${name}.properties.json`;
      if(fs.exists(propertiesPath)) {
        const properties = fs.readJson(propertiesPath);
        doc.context = properties.context;
        doc.icon = properties.icon;
        if(properties.internalId) {
          warn('DEPRECATED', 'Form:', name, 'Please do not manually set internalId in .properties.json for new projects.  Support for configuring this value will be dropped.  Please see https://github.com/medic/medic-webapp/issues/3342.');
          doc.internalId = properties.internalId;
        }
      }

      const xml = fs.read(`${formDir}/xml`);
      doc.title = xml.substring(xml.indexOf('<h:title>') + 9, xml.indexOf('</h:title>'));

      doc._attachments = attachmentsFromDir(formDir);

      return db.put(doc);
    }));
};
