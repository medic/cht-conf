const { expect, assert } = require('chai');
const rewire = require('rewire');
const toDocs = require('../../src/fn/csv-to-docs');
const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-memory'));
const fs = require('../../src/lib/sync-fs');
const editContactsModule = rewire('../../src/fn/edit-contacts');
const processDocs = editContactsModule.__get__('processDocs');
const environment = require('../../src/lib/environment');
const sinon = require('sinon');

const pouch = new PouchDB('edit-contacts', { adapter: 'memory' });

// specifying directory paths to use
const editContactsPath = `data/edit-contacts/documents`;
const csvDir = `${editContactsPath}/csv`;
const saveDocsDir = `${editContactsPath}/json_docs`;
const expectedDocsDir = `${editContactsPath}/expected-json_docs`;
const filesToUpload = fs.recurseFiles(`${editContactsPath}/server-contact_docs`).filter(name => name.endsWith('.json'));
const saveJsonDoc = doc => fs.write(`${saveDocsDir}/${doc._id}.doc.json`, toDocs.toSafeJson(doc) + '\n');
const countFilesInDir = path => fs.fs.readdirSync(path).length;
const csvFiles = ['contact.csv'];


const docs = filesToUpload
  .map(file => {
    const doc = fs.readJson(file);
    return doc;
  });

const uploadDocuments = (docs) => {
  return pouch.bulkDocs(docs);
};

const fetchDocuments = () => {
  return pouch.allDocs({include_docs: true});
};

const processDocuments = (docType, csv, contactDocs, args) => {
  return processDocs(docType, csv, contactDocs, args);
};

describe('edit-contacts', function() {

  before(async () => {
    await uploadDocuments(docs);
    sinon.stub(environment, 'pathToProject').get(() => editContactsPath);
    const pouchDb = sinon.stub();
    pouchDb.returns(pouch);
    editContactsModule.__set__('pouch', pouchDb);
    editContactsModule.__set__('args', {
      colNames: '',
      csvFiles: 'contact.csv',
      docDirectoryPath: 'json_docs',
      force: false,
    });
  });

  after(async () => pouch.destroy());

  it(`should do top to down test well`, async function(){

    await editContactsModule.execute();
     
    assert.equal(countFilesInDir(saveDocsDir),
                countFilesInDir(expectedDocsDir),
                `Different number of files in ${saveDocsDir} and ${expectedDocsDir}.`);

    fs.recurseFiles(expectedDocsDir)
      .map(file => fs.path.basename(file))
      .forEach(file => {
        const expected  = fs.readJson(`${expectedDocsDir}/${file}`);
        const generated = fs.readJson(`${saveDocsDir}/${file}`);
        delete generated._rev;
        expect(generated).to.deep.eq(expected);
      });
  });

  it(`should process csv and edit the associated docs well`, async function() {
    
    const csvFilesFiltered = csvFiles.map(fileName => `${csvDir}/${fileName}`)
      .filter(name => name.endsWith('.csv'));
      
    for (const csv of csvFilesFiltered) {
      const docs = await fetchDocuments();
      
      const parsedDocuments = docs.rows.reduce((agg, curr) => Object.assign(agg, { [curr.doc._id]: curr.doc }), {});

      // Calling processDocs in edit-contacts to test if it edits documents well.
      const result = processDocuments('contact', csv, parsedDocuments, {colNames: ''});

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
    }
  });
});