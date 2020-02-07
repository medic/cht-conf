const { expect, assert } = require('chai');
const rewire = require('rewire');
const toDocs = require('../../src/fn/csv-to-docs');
const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-memory'));
const fs = require('../../src/lib/sync-fs');
const editContactsModule = rewire('../../src/fn/edit-contacts');
const processDocs = editContactsModule.__get__('processDocs');
const fetchDocumentList = editContactsModule.__get__('fetchDocumentList');
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

function compareDocuments(){
  fs.recurseFiles(expectedDocsDir)
      .map(file => fs.path.basename(file))
      .forEach(file => {
        const expected  = fs.readJson(`${expectedDocsDir}/${file}`);
        const generated = fs.readJson(`${saveDocsDir}/${file}`);
        delete generated._rev;
        expect(generated).to.deep.eq(expected);
      });
}

describe('edit-contacts', function() {

  before(async () => {
    await uploadDocuments(docs);
    sinon.stub(environment, 'pathToProject').get(() => editContactsPath);
    const pouchDb = sinon.stub();
    pouchDb.returns(pouch);
    editContactsModule.__set__('pouch', pouchDb);
  });

  after(async () => pouch.destroy());

  it(`should do a top-down test well`, async function(){

    await editContactsModule.execute();    
    assert.equal(countFilesInDir(saveDocsDir),
                countFilesInDir(expectedDocsDir),
                `Different number of files in ${saveDocsDir} and ${expectedDocsDir}.`);
    compareDocuments();
  }); 
  
  it(`should fail when wrong column names are provided`, async function(){

    const parseResult = {
      colNames: ['enmch'],
      csvFiles: ['contact.csv'],
      docDirectoryPath: 'json_docs',
      force: false,
    };
    const extraArgs = sinon.stub();
    extraArgs.returns(parseResult);
    editContactsModule.__set__('parseExtraArgs', extraArgs);
    
    try {
      await editContactsModule.execute();
      assert.fail('should throw an error when wrong column names are provided');
    } catch (err) {
      expect(err.message).to.be.equal('The column name(s) specified do not exist.');
    }
  }); 

  it(`should fail when protected column names are provided`, async function(){

    const docs = await fetchDocuments();
    const processCsv = editContactsModule.__get__('processCsv');
    
    try {
      processCsv('contact',['parent'],['0ebca32d-c1b7-5522-94a3-97dd8b3df146','parent_id'],0, [],docs);
      assert.fail('should throw an error when protected names are provided');
    } catch (err) {
      expect(err.message).to.include('this property name is protected.');
    }
  });

  it(`should fail when DB doesn't contain the requested _id's`, async function(){
    
    try {
      await fetchDocumentList(pouch,['wrongDocumentID']);
      assert.fail('should throw an error when requested ID cannot be found on the database');
    } catch (err) {
      expect(err.message).to.include('could not be found.');
    }
  });

  it(`should fail when document type is not a contact`, async function(){

    await pouch.put({
      _id: 'documentID',
      type: 'data_record'
    });
    
    try {
      await fetchDocumentList(pouch,['documentID']);
      assert.fail('should throw an error when document is not a contact');
    } catch (err) {
      expect(err.message).to.include('cannot be edited');
    }
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
      compareDocuments();
    }
  });
});