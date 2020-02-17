const { expect, assert } = require('chai');
const rewire = require('rewire');
const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-memory'));
const fs = require('../../src/lib/sync-fs');
const editContactsModule = rewire('../../src/fn/edit-contacts');
const environment = require('../../src/lib/environment');
const sinon = require('sinon');

let pouch;

// specifying directory paths to use
const editContactsPath = `data/edit-contacts`;
const saveDocsDir = `${editContactsPath}/json_docs`;
const expectedDocsDirAllCols = `${editContactsPath}/expected-json_docs/all-columns`;
const filesToUpload = fs.recurseFiles(`${editContactsPath}/server-contact_docs`).filter(name => name.endsWith('.json'));
const countFilesInDir = path => fs.fs.readdirSync(path).length;

const docs = filesToUpload
  .map(file => {
    const doc = fs.readJson(file);
    return doc;
  });

const uploadDocuments = (docs) => {
  return pouch.bulkDocs(docs);
};

function compareDocuments(expectedDocsDir){
  fs.recurseFiles(expectedDocsDir)
      .map(file => fs.path.basename(file))
      .forEach(file => {
        const expected  = fs.readJson(`${expectedDocsDir}/${file}`);
        const generated = fs.readJson(`${saveDocsDir}/${file}`);
        delete generated._rev;
        expect(expected).to.deep.eq(generated);
      });
}

describe('edit-contacts', function() {

  beforeEach(async () => {
    pouch = new PouchDB('edit-contacts', { adapter: 'memory' });
    await uploadDocuments(docs);
    sinon.stub(environment, 'pathToProject').get(() => editContactsPath);
    const pouchDb = sinon.stub();
    pouchDb.returns(pouch);
    editContactsModule.__set__('pouch', pouchDb);
  });

  afterEach(async () => {
    pouch.destroy();
    fs.deleteFilesInFolder(saveDocsDir);
  });

  it(`should do a top-down test well and add all available columns to the docs since they are not specified`, async function(){

    await editContactsModule.execute();
    assert.equal(countFilesInDir(saveDocsDir),
                countFilesInDir(expectedDocsDirAllCols),
                `Different number of files in ${saveDocsDir} and ${expectedDocsDirAllCols}.`);
    compareDocuments(expectedDocsDirAllCols);
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

    const parseResult = {
      colNames: ['parent'],
      csvFiles: ['contact.test.csv'],
      docDirectoryPath: 'json_docs',
      force: false,
    };
    const extraArgs = sinon.stub();
    extraArgs.returns(parseResult);
    editContactsModule.__set__('parseExtraArgs', extraArgs);
    
    try {
      await editContactsModule.execute();
      assert.fail('should throw an error when protected names are provided');
    } catch (err) {
      expect(err.message).to.include('this property name is protected.');
    }
  }); 

  it(`should fail when DB doesn't contain the requested _id's`, async function(){
    
    const getIDs = sinon.stub();
    getIDs.returns(['wrongDocumentID']);
    editContactsModule.__set__('getIDs', getIDs);
    try {
      await editContactsModule.execute();
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
    const getIDs = sinon.stub();
    getIDs.returns(['documentID']);
    editContactsModule.__set__('getIDs', getIDs);
    
    try {
      await editContactsModule.execute();
      assert.fail('should throw an error when document is not a contact');
    } catch (err) {
      expect(err.message).to.include('cannot be edited');
    }
  });
});