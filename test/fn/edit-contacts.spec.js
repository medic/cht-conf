const { expect, assert } = require('chai');
const rewire = require('rewire');
const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-memory'));
const fs = require('../../src/lib/sync-fs');
const environment = require('../../src/lib/environment');
const sinon = require('sinon');
const userPrompt = require('../../src/lib/user-prompt');

let pouch, editContactsModule;

// specifying directory paths to use
const editContactsPath = `data/edit-contacts`;
const saveDocsDir = `${editContactsPath}/json_docs`;
const expectedDocsDirNested = `${editContactsPath}/expected-json_docs/nested-columns`;
const expectedDocsDirOneCol = `${editContactsPath}/expected-json_docs/one-column`;
const expectedDocsDirAllCols = `${editContactsPath}/expected-json_docs/all-columns`;
const expectedDocsMultipleCsv = `${editContactsPath}/expected-json_docs/multiple-csv-columns`;
const expectedDocsUsersCsv = `${editContactsPath}/expected-json_docs/user-columns`;
const editedJsonDocs = `edited-json-docs`;
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

const compareDocuments = (expectedDocsDir) => {
      fs.recurseFiles(expectedDocsDir)
      .map(file => fs.path.basename(file))
      .forEach(file => {
        const expected  = fs.readJson(`${expectedDocsDir}/${file}`);
        const generated = fs.readJson(`${saveDocsDir}/${file}`);
        delete generated._rev;
        expect(expected).to.deep.eq(generated);
      });
};

describe('edit-contacts', function() {

  beforeEach(async () => {
    editContactsModule = rewire('../../src/fn/edit-contacts');
    pouch = new PouchDB('edit-contacts', { adapter: 'memory' });
    await uploadDocuments(docs);
    sinon.stub(environment, 'pathToProject').get(() => editContactsPath);
    const pouchDb = sinon.stub();
    pouchDb.returns(pouch);
    editContactsModule.__set__('pouch', pouchDb);
    sinon.stub(environment, 'force').get(() => false);
  });

  afterEach(async () => {
    pouch.destroy();
    fs.deleteFilesInFolder(saveDocsDir);
    sinon.restore();
  });

  it(`should do a top-down test well and add all available columns to the docs since they are not specified`, async function(){
    sinon.stub(environment, 'force').get(() => false);
    sinon.stub(environment, 'extraArgs').get(() => undefined);
    await editContactsModule.execute();
    assert.equal(countFilesInDir(saveDocsDir),
                countFilesInDir(expectedDocsDirAllCols),
                `Different number of files in ${saveDocsDir} and ${expectedDocsDirAllCols}.`);
    compareDocuments(expectedDocsDirAllCols);
  }); 

  it(`should only process listed files`, async function(){

    sinon.stub(environment, 'extraArgs').get(() => ['--files=contact.csv,contact.two.csv,users.csv']);

    await editContactsModule.execute();
    assert.equal(countFilesInDir(saveDocsDir),
                countFilesInDir(expectedDocsMultipleCsv),
                `Different number of files in ${saveDocsDir} and ${expectedDocsMultipleCsv}.`);
    compareDocuments(expectedDocsMultipleCsv);
  });

  it(`should only add specified column names to the json docs`, async function(){

    sinon.stub(environment, 'extraArgs').get(() => ['--columns=is_in_emnch', '--files=contact.csv']);

    await editContactsModule.execute();

    assert.equal(countFilesInDir(saveDocsDir),
                countFilesInDir(expectedDocsDirOneCol),
                `Different number of files in ${saveDocsDir} and ${expectedDocsDirOneCol}.`);
    compareDocuments(expectedDocsDirOneCol);
  });
  
  it(`should add nested columns to the json docs perfectly`, async function(){

    sinon.stub(environment, 'extraArgs').get(() => ['--files=contact.nested.csv']);

    await editContactsModule.execute();

    assert.equal(countFilesInDir(saveDocsDir),
                countFilesInDir(expectedDocsDirNested),
                `Different number of files in ${saveDocsDir} and ${expectedDocsDirOneCol}.`);
    compareDocuments(expectedDocsDirNested);
  });

  it(`should add nested columns to the json docs perfectly`, async function(){

    sinon.stub(environment, 'extraArgs').get(() => ['--files=contact.nested.csv','--columns=is_pilot.rbf.place,weird_property,another_property']);

    await editContactsModule.execute();

    assert.equal(countFilesInDir(saveDocsDir),
                countFilesInDir(expectedDocsDirNested),
                `Different number of files in ${saveDocsDir} and ${expectedDocsDirOneCol}.`);
    compareDocuments(expectedDocsDirNested);
  });


  it(`should fail when wrong column names are provided`, async function(){

    sinon.stub(environment, 'extraArgs').get(() => ['--columns=enmch', '--files=contact.csv']);
    
    try {
      await editContactsModule.execute();
      assert.fail('should throw an error when wrong column names are provided');
    } catch (err) {
      expect(err.message).to.be.equal('The column name(s) specified do not exist.');
    }
  }); 

  it(`should fail when protected column names are provided`, async function(){

    sinon.stub(environment, 'extraArgs').get(() => ['--columns=parent', '--files=contact.test.csv']);
    
    try {
      await editContactsModule.execute();
      assert.fail('should throw an error when protected names are provided');
    } catch (err) {
      expect(err.message).to.include('this property name is protected.');
    }
  });  

  it(`should fail when DB doesn't contain the requested _id's`, async function(){
    
    sinon.stub(environment, 'extraArgs').get(() => ['--files=contact.wrong.id.csv']);

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

    sinon.stub(environment, 'extraArgs').get(() => ['--files=contact.protected.type.csv']);
   
    try {
      await editContactsModule.execute();
      assert.fail('should throw an error when document is not a contact');
    } catch (err) {
      expect(err.message).to.include('cannot be edited');
    }
  });

  it(`should add all columns when editing user docs`, async function(){

    sinon.stub(environment, 'extraArgs').get(() => ['--files=users.csv']);


    await editContactsModule.execute();
    assert.equal(countFilesInDir(saveDocsDir),
                countFilesInDir(expectedDocsUsersCsv),
                `Different number of files in ${saveDocsDir} and ${expectedDocsUsersCsv}.`);
    compareDocuments(expectedDocsUsersCsv);
    
  }); 

  it(`should fail when wrong column names are provided when editing user docs`, async function(){

    sinon.stub(environment, 'extraArgs').get(() => ['--columns=enmch', '--files=users.csv']);
    
    try {
      await editContactsModule.execute();
      assert.fail('should throw an error when wrong column names are provided');
    } catch (err) {
      expect(err.message).to.be.equal('The column name(s) specified do not exist.');
    }
  });

  it('should load documents from provided directory if relevant argument is passed', async () => {
    const db = sinon.stub(pouch, 'allDocs');
    sinon
      .stub(environment,'extraArgs')
      .get(() => ['--columns=type', '--files=contact.type.csv', '--updateOfflineDocs', `--docDirectoryPath=${editedJsonDocs}`]);
    await editContactsModule.execute();

    expect(fs.readJson(`${editContactsPath}/${editedJsonDocs}/09efb53f-9cd8-524c-9dfd-f62c242f1817.doc.json`)).to.deep.equal(
      {
        type: 'health_center',
        name: 'carla olamide',
        is_in_emnch: false,
        rbf: true,
        _id: '09efb53f-9cd8-524c-9dfd-f62c242f1817'
      }
    );
    expect(fs.readJson(`${editContactsPath}/${editedJsonDocs}/7ac33d1f-10d8-5198-b39d-9d61595292f6.doc.json`)).to.deep.equal(
      {
        type: 'person',
        name: 'kelly adisa',
        is_in_emnch: true,
        rbf: false,
        _id: '7ac33d1f-10d8-5198-b39d-9d61595292f6'
      }
    );
    expect(db.callCount).to.equal(0);
  });

  it('should load documents from db if not found in directory', async () => {
    const db = sinon
      .stub(pouch, 'allDocs')
      .resolves({
        rows: [
          {
            id: '0ebca32d-c1b7-5522-94a3-97dd8b3df146',
            key: '0ebca32d-c1b7-5522-94a3-97dd8b3df146',
            value: { rev: '1-ccec0024d98011c6d33c223ba389b1da' },
            doc: {
              type: 'person',
              name: 'janie',
              _id: '0ebca32d-c1b7-5522-94a3-97dd8b3df146',
              _rev: '1-ccec0024d98011c6d33c223ba389b1da'
            }
          }
        ]
    });
    sinon
      .stub(environment,'extraArgs')
      .get(() => ['--columns=is_in_emnch,rbf', '--files=contact.csv', '--updateOfflineDocs', `--docDirectoryPath=${editedJsonDocs}`]);
    await editContactsModule.execute();

    expect(db.callCount).to.equal(1);
    expect(db.args[0][0]).to.deep.equal({
      keys: [ '0ebca32d-c1b7-5522-94a3-97dd8b3df146' ],
      include_docs: true
    });  
    expect(fs.readJson(`${editContactsPath}/${editedJsonDocs}/7ac33d1f-10d8-5198-b39d-9d61595292f6.doc.json`)).to.deep.equal(
      {
        type: 'person',
        name: 'kelly adisa',
        is_in_emnch: false,
        rbf: false,
        _id: '7ac33d1f-10d8-5198-b39d-9d61595292f6'
      }
    );
    expect(fs.readJson(`${editContactsPath}/${editedJsonDocs}/0ebca32d-c1b7-5522-94a3-97dd8b3df146.doc.json`)).to.deep.equal(
      {
        type: 'person',
        name: 'janie',
        is_in_emnch: true,
        rbf: false,
        _id: '0ebca32d-c1b7-5522-94a3-97dd8b3df146',
        _rev: '1-ccec0024d98011c6d33c223ba389b1da'
      }
    );
    expect(fs.readJson(`${editContactsPath}/${editedJsonDocs}/09efb53f-9cd8-524c-9dfd-f62c242f1817.doc.json`)).to.deep.equal(
      {
        type: 'health_center',
        name: 'carla olamide',
        is_in_emnch: false,
        rbf: true,
        _id: '09efb53f-9cd8-524c-9dfd-f62c242f1817'
      }
    );
  });

  it('should prompt a user if they will ovewrite files in a directory if they have not passed the updateOfflineDocs flag', async () => {
    const prompt = sinon
      .stub(userPrompt, 'keyInSelect')
      .returns(0);
    sinon
      .stub(environment, 'extraArgs')
      .get(() => ['--columns=type', '--files=contact.type.csv', `--docDirectoryPath=${editedJsonDocs}`]);
    await editContactsModule.execute();

    expect(prompt.callCount).to.equal(2);
  });

  it('should not prompt a user again if they choose to ovewrite all files', async () => {
    const prompt = sinon.stub(userPrompt, 'keyInSelect').returns(1);
    sinon
      .stub(environment, 'extraArgs')
      .get(() => ['--columns=type', '--files=contact.type.csv', `--docDirectoryPath=${editedJsonDocs}`]);
    await editContactsModule.execute();

    expect(prompt.callCount).to.equal(1);
  });

  it('should throw an error and exit if a user chooses not to overwrite files', async () => {
    sinon
      .stub(userPrompt, 'keyInSelect')
      .returns(2);
    sinon
      .stub(environment,'extraArgs')
      .get(() => ['--columns=type', '--files=contact.type.csv', `--docDirectoryPath=${editedJsonDocs}`]);
    try {
      await editContactsModule.execute();
      assert.fail('should throw an error a user chooses not to overwrite files');
    } catch (err) {
      expect(err.message).to.be.equal('User canceled the action.');
    }
  });

  it('should not prompt a user if the force flag is passed', async () => {
    sinon.stub(environment, 'force').get(() => true);
    const prompt = sinon
      .stub(userPrompt, 'keyInSelect')
      .returns(1);
    sinon
      .stub(environment, 'extraArgs')
      .get(() => ['--columns=type', '--files=contact.type.csv', `--docDirectoryPath=${editedJsonDocs}`]);
    await editContactsModule.execute();

    expect(prompt.callCount).to.equal(0);
  });

  it('should throw an error if fetching docs from the db fails', async () => {
    sinon
      .stub(pouch, 'allDocs')
      .throws(new Error('db fetching failed'));
    sinon
      .stub(environment,'extraArgs')
      .get(() => ['--columns=is_in_emnch,rbf', '--files=contact.fail.fetch.csv', '--updateOfflineDocs', `--docDirectoryPath=${editedJsonDocs}`]);
    try {
      await editContactsModule.execute();
      assert.fail('should throw an error when fetching from the db fails');
    } catch (err) {
      expect(err.message).to.be.equal('db fetching failed');
    }
  });

  it('should throw an error if saving a JSON doc fails', async () => {
    sinon
      .stub(fs, 'write')
      .throws(new Error('failed to write file'));
    sinon
      .stub(environment,'extraArgs')
      .get(() => ['--columns=is_in_emnch,rbf', '--files=contact.csv', '--updateOfflineDocs=true', `--docDirectoryPath=${editedJsonDocs}`]);
    try {
      await editContactsModule.execute();
      assert.fail('should throw an error saving a JSON doc fails');
    } catch (err) {
      expect(err.message).to.be.equal('failed to write file');
    }
  });
 
});
