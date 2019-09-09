const { expect } = require('chai');
const rewire = require('rewire');
const sinon = require('sinon');

const api = require('../api-stub');
const uploadDocs = rewire('../../src/fn/upload-docs');
uploadDocs.__set__('readline', { keyInYN: () => true });

describe('upload-docs', function() {
  let fs;

  beforeEach(() => {
    api.start();
    fs = {
      exists: () => true,
      recurseFiles: () => ['one.doc.json', 'two.doc.json', 'three.doc.json'],
      writeJson: () => {},
      readJson: name => ({ _id: name.substring(0, name.length - '.doc.json'.length) }),
    };
    uploadDocs.__set__('fs', fs);
  });
  afterEach(api.stop);

  it('should upload docs to pouch', async () => {
    await assertDbEmpty();
    await uploadDocs('', api.repository);
    const res = await api.db.allDocs();

    expect(res.rows.map(doc => doc.id)).to.deep.eq(['one', 'three', 'two']);
  });

  it('do nothing if there are no docs to upload', async () => {
    await assertDbEmpty();
    
    const pouch = sinon.stub();
    fs.recurseFiles = () => [];
    return uploadDocs.__with__({ fs, pouch })(async () => {
      await uploadDocs('', api.repository);
      expect(pouch.called).to.be.false;
    });
  });

  it('throw if doc id differs from filename', async () => {
    await assertDbEmpty();
    const pouch = sinon.stub();
    fs.recurseFiles = () => [`1.doc.json`];
    fs.readJson = () => ({ _id: 'not_1' });

    return uploadDocs.__with__({ fs, pouch })(async () => {
      try {
        await uploadDocs('', api.repository);
        expect.fail('should throw');
      } catch (err) {
        expect(err.message).to.include('expected _id is');
      }
    });
  });

  it('should retry in batches', async () => {
    const bulkDocs = sinon.stub()
      .onCall(0).throws({ error: 'timeout' })
      .returns(Promise.resolve([{}]));
    fs.recurseFiles = () => new Array(10).fill('').map((x, i) => `${i}.doc.json`);
    sinon.useFakeTimers(0);
    
    const imported_date = new Date(0).toISOString();
    api.db.bulkDocs = bulkDocs;
    return uploadDocs.__with__({
      INITIAL_BATCH_SIZE: 4,
      fs,
    })(async () => {
      await uploadDocs('', api.repository);
      expect(bulkDocs.callCount).to.eq(1 + 10 / 2);

      // first failed batch of 4
      expect(bulkDocs.args[0][0]).to.deep.eq([
        { _id: '0', imported_date },
        { _id: '1', imported_date },
        { _id: '2', imported_date },
        { _id: '3', imported_date }
      ]);

      // retry batch of 2
      expect(bulkDocs.args[1][0]).to.deep.eq([
        { _id: '0', imported_date },
        { _id: '1', imported_date },
      ]);

      // move on to next with batch size 2
      expect(bulkDocs.args[2][0]).to.deep.eq([
        { _id: '2', imported_date },
        { _id: '3', imported_date  },
      ]);
    });
  });

});

async function assertDbEmpty() {
  const res = await api.db.allDocs();
  expect(res.rows).to.be.empty;
}
