const fs = require('../lib/sync-fs');
const info = require('../lib/log').info;
const trace = require('../lib/log').trace;
const warn = require('../lib/log').warn;
const PouchDB = require('pouchdb');

const attachmentsFromDir = require('../lib/attachments-from-dir');
const insertOrReplace = require('../lib/insert-or-replace');

module.exports = (project, couchUrl) => {
  const db = new PouchDB(couchUrl);

  const formsDir = `${project}/forms`;
  return Promise.all(fs.readdir(formsDir)
    .filter(name => name.endsWith('.xlsx'))
    .map(xls => {
      const baseFileName = fs.withoutExtension(xls);
      const formDir = `${formsDir}/${baseFileName}`;
      const expectedId = baseFileName.replace(/-/g, ':');

      if(!fs.exists(formDir)) {
        warn(`No form directory found corresponding to XML ${formDir}`);
        return Promise.resolve();
      }

      const xml = fs.read(`${formDir}/xml`);

      const id = readIdFrom(xml);
      if(id !== expectedId) warn('DEPRECATED', 'Form:', xls, 'Bad ID set in XML.  Expected:', expectedId, 'but saw:', id, ' Support for setting these values differently will be dropped.  Please see https://github.com/medic/medic-webapp/issues/3342.');

      const doc = {
        _id: `form:${id}`,
        type: 'form',
        internalId: id,
        title: readTitleFrom(xml),
      };

      const propertiesPath = `${formsDir}/${baseFileName}.properties.json`;
      if(fs.exists(propertiesPath)) {
        const properties = fs.readJson(propertiesPath);
        doc.context = properties.context;
        doc.icon = properties.icon;
        if(properties.internalId) {
          warn('DEPRECATED', 'Form:', xls, 'Please do not manually set internalId in .properties.json for new projects.  Support for configuring this value will be dropped.  Please see https://github.com/medic/medic-webapp/issues/3342.');
          doc.internalId = properties.internalId;
        }
      }

      doc._attachments = attachmentsFromDir(formDir);

      return Promise.resolve()
        .then(() => trace('Uploading form', `${formsDir}/${xls}`, 'to', id))
        .then(() => insertOrReplace(db, doc))
        .then(() => info('Uploaded form', `${formsDir}/${xls}`, 'to', id));
    }));
};

// TODO this isn't really how to parse XML
const readTitleFrom = xml => xml.substring(xml.indexOf('<h:title>') + 9, xml.indexOf('</h:title>'));
const readIdFrom = xml =>
    xml.split('\n').join('')
        .match(/<model>.*<\/model>/)[0]
        .match(/<instance>.*<\/instance>/)[0]
        .match(/id="([^"]*)"/)[1];
