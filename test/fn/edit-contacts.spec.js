const { expect } = require('chai');
const rewire = require('rewire');
const { info } = require('../../src/lib/log');
const toDocs = require('../../src/fn/csv-to-docs');
const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-memory'));
const fs = require('../../src/lib/sync-fs');
const editContactsModule = rewire('../../src/fn/edit-contacts');
const processDocs = editContactsModule.__get__('processDocs');


const pouchDb = new PouchDB('edit-contacts', { adapter: 'memory' });

// specifying directory paths to use
const editContactsPath = `data/edit-contacts/documents`;
const csvDir = `${editContactsPath}/csv`;
const saveDocsDir = `${editContactsPath}/json_docs`;
const expectedDocsDir = `${editContactsPath}/expected-json_docs`;
const filesToUpload = fs.recurseFiles(`${editContactsPath}/server-contact_docs`).filter(name => name.endsWith('.json'));
const saveJsonDoc = doc => fs.write(`${saveDocsDir}/${doc._id}.doc.json`, toDocs.toSafeJson(doc) + '\n');
const csvFiles = ['contact.csv'];


const docs = filesToUpload
  .map(file => {
    const doc = fs.readJson(file);
    return doc;
  });

const uploadDocuments = async (docs) => {
  return await pouchDb.bulkDocs(docs);
};

const fetchDocuments = async () => {
  return await pouchDb.allDocs({include_docs: true, attachments: true}).then(JSON.stringify);
};

const processDocuments = async(docType, csv, contactDocs, args) => {
  return await processDocs(docType, csv, contactDocs, args);
};

uploadDocuments(docs)
 .then(() => {

  csvFiles.map(fileName => `${csvDir}/${fileName}`)
    .filter(name => name.endsWith('.csv'))
    .forEach(csv => {
        info('Processing CSV file::', csv, '…');
        fetchDocuments()
          .then( docs => {

            const jsonData = JSON.parse(docs);
            const parsedDocuments = jsonData.rows.reduce((agg, curr) => Object.assign(agg, { [curr.doc._id]: curr.doc }), {});

            // Calling processDocs in edit-contacts to test if it edits documents well.
            processDocuments('contact', csv, parsedDocuments, {colNames: ''})
              .then(function(result) {

                // Saving edited docs to disk 
                // then comparing between the expected JSON files and generated JSON files that have been processed using edit-contacts
                Object.values(result).map(saveJsonDoc);
                fs.recurseFiles(expectedDocsDir)
                    .map(file => fs.path.basename(file))
                    .forEach(file => {
                      const expected  = fs.readJson(`${expectedDocsDir}/${file}`);
                      const generated = fs.readJson(`${saveDocsDir}/${file}`);
                      delete generated._rev;
                      expect(generated).to.deep.eq(expected);
                });
              });
          }).catch(function(err) {
              throw err;
          });
    });
 });