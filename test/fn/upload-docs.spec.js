const rewire = require('rewire');
const sinon = require('sinon');

const apiStub = require('../api-stub');
const environment = require('../../src/lib/environment');
const uploadDocs = rewire('../../src/fn/upload-docs');
const userPrompt = rewire('../../src/lib/user-prompt');

const { assert, expect } = require('chai');
const readLine = { keyInYN: () => true };
userPrompt.__set__('readline', readLine);
uploadDocs.__set__('userPrompt', userPrompt);

let fs;
let expectedDocs;

const API_VERSION_RESPONSE = { status: 200, body: { version: '4.10.0' }};

describe('upload-docs', function() {
  beforeEach(() => {
    sinon.stub(environment, 'isArchiveMode').get(() => false);
    sinon.stub(environment, 'extraArgs').get(() => undefined);
    sinon.stub(environment, 'pathToProject').get(() => '.');
    sinon.stub(environment, 'force').get(() => false);
    apiStub.start();
    expectedDocs = [
      { _id: 'one' },
      { _id: 'two' },
      { _id: 'three' },
    ];
    fs = {
      exists: () => true,
      recurseFiles: () => expectedDocs.map(doc => `${doc._id}.doc.json`),
      writeJson: () => {},
      readJson: name => {
        const id = name.substring(0, name.length - '.doc.json'.length);
        return expectedDocs.find(doc => doc._id === id);
      },
    };
    uploadDocs.__set__('fs', fs);
  });
  afterEach(() => {
    sinon.restore();
    return apiStub.stop();
  });

  it('should upload docs to pouch', async () => {
    await assertDbEmpty();
    await uploadDocs.execute();
    const res = await apiStub.db.allDocs();

    expect(res.rows.map(doc => doc.id)).to.deep.eq(['one', 'three', 'two']);
  });

  it('do nothing if there are no docs to upload', async () => {
    await assertDbEmpty();

    const pouch = sinon.stub();
    fs.recurseFiles = () => [];
    return uploadDocs.__with__({ fs, pouch })(async () => {
      await uploadDocs.execute();
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
        await uploadDocs.execute();
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
    expectedDocs = new Array(10).fill('').map((x, i) => ({ _id: i.toString() }));
    const clock = sinon.useFakeTimers(0);
    const imported_date = new Date().toISOString();
    return uploadDocs.__with__({
      INITIAL_BATCH_SIZE: 4,
      Date,
      fs,
      pouch: () => ({ bulkDocs }),
    })(async () => {
      await uploadDocs.execute();
      expect(bulkDocs.callCount).to.eq(6);

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

      clock.restore();
    });
  });

  it('should throw if user denies the warning', async () => {
    userPrompt.__set__('readline', { keyInYN: () => false });
    const actual = uploadDocs.execute();
    await expect(actual).to.eventually.be.rejectedWith('User aborted execution.');
  });

  it('should not throw if force is set', async () => {
    userPrompt.__set__('environment', { force: () => true });
    await assertDbEmpty();
    sinon.stub(process, 'exit');
    await uploadDocs.execute();
    const res = await apiStub.db.allDocs();
    expect(res.rows.map(doc => doc.id)).to.deep.eq(['one', 'three', 'two']);
  });
  
  describe('--disable-users', () => {
    beforeEach(async () => {
      sinon.stub(environment, 'extraArgs').get(() => ['--disable-users']);
      await assertDbEmpty();
    });

    const twoPlaces = [
      { _id: 'one' },
      { _id: 'two' },
    ];

    it('user with single place gets deleted', async () => {
      await setupDeletedFacilities('one');
      setupApiResponses(1, [{ id: 'org.couchdb.user:user1', username: 'user1', place: [{ _id: 'one' }] }]);

      await uploadDocs.execute();
      const res = await apiStub.db.allDocs();
      expect(res.rows.map(doc => doc.id)).to.deep.eq(['three', 'two']);

      assert.deepEqual(apiStub.requestLog(), [
        { method: 'GET', url: '/api/deploy-info', body: {} },
        { method: 'GET', url: '/api/v2/users?facility_id=one', body: {} },
        { method: 'DELETE', url: '/api/v1/users/user1', body: {} },
      ]);
    });

    it('user with single place gets deleted (old core api format)', async () => {
      await setupDeletedFacilities('one');
      setupApiResponses(1, [{ id: 'org.couchdb.user:user1', username: 'user1', place: { _id: 'one' } }]);

      await uploadDocs.execute();
      const res = await apiStub.db.allDocs();
      expect(res.rows.map(doc => doc.id)).to.deep.eq(['three', 'two']);

      assert.deepEqual(apiStub.requestLog(), [
        { method: 'GET', url: '/api/deploy-info', body: {} },
        { method: 'GET', url: '/api/v2/users?facility_id=one', body: {} },
        { method: 'DELETE', url: '/api/v1/users/user1', body: {} },
      ]);
    });

    it('users associated with docs without truthy deleteUser attribute are not deleted', async () => {
      const writtenDoc = await apiStub.db.put({ _id: 'one' });

      const oneDoc = expectedDocs[0];
      oneDoc._rev = writtenDoc.rev;
      oneDoc._deleted = true;

      await uploadDocs.execute();
      const res = await apiStub.db.allDocs();
      expect(res.rows.map(doc => doc.id)).to.deep.eq(['three', 'two']);
      assert.deepEqual(apiStub.requestLog(), []);
    });

    it('user with multiple places gets updated', async () => {
      await setupDeletedFacilities('one');
      setupApiResponses(1, [{ id: 'org.couchdb.user:user1', username: 'user1', place: twoPlaces }]);

      await uploadDocs.execute();
      const res = await apiStub.db.allDocs();
      expect(res.rows.map(doc => doc.id)).to.deep.eq(['three', 'two']);

      const expectedBody = {
        username: 'user1',
        place: [ 'two' ],
      };
      assert.deepEqual(apiStub.requestLog(), [
        { method: 'GET', url: '/api/deploy-info', body: {} },
        { method: 'GET', url: '/api/v2/users?facility_id=one', body: {} },
        { method: 'POST', url: '/api/v1/users/user1', body: expectedBody },
      ]);
    });

    it('user with multiple places gets deleted', async () => {
      await setupDeletedFacilities('one', 'two');
      const user1Doc = { id: 'org.couchdb.user:user1', username: 'user1', place: twoPlaces };
      setupApiResponses(1, [user1Doc], [user1Doc]);

      await uploadDocs.execute();
      const res = await apiStub.db.allDocs();
      expect(res.rows.map(doc => doc.id)).to.deep.eq(['three']);

      assert.deepEqual(apiStub.requestLog(), [
        { method: 'GET', url: '/api/deploy-info', body: {} },
        { method: 'GET', url: '/api/v2/users?facility_id=one', body: {} },
        { method: 'GET', url: '/api/v2/users?facility_id=two', body: {} },
        { method: 'DELETE', url: '/api/v1/users/user1', body: {} },
      ]);
    });

    it('one user disabled and one updated when single place has multiple users', async () => {
      await setupDeletedFacilities('one');
      setupApiResponses(2, [
        { id: 'org.couchdb.user:user1', username: 'user1', place: [{ _id: 'one' }] },
        { id: 'org.couchdb.user:user2', username: 'user2', place: twoPlaces }
      ]);

      await uploadDocs.execute();
      const res = await apiStub.db.allDocs();
      expect(res.rows.map(doc => doc.id)).to.deep.eq(['three', 'two']);

      const expectedUser2 = {
        username: 'user2',
        place: ['two'],
      };
      assert.deepEqual(apiStub.requestLog(), [
        { method: 'GET', url: '/api/deploy-info', body: {} },
        { method: 'GET', url: '/api/v2/users?facility_id=one', body: {} },
        { method: 'DELETE', url: '/api/v1/users/user1', body: {} },
        { method: 'POST', url: '/api/v1/users/user2', body: expectedUser2 },
      ]);
    });
  });
});

function setupApiResponses(writeCount, ...userDocResponseRows) {
  const responseBodies = userDocResponseRows.map(body => ({ body }));
  const writeResponses = new Array(writeCount).fill({ status: 200 });
  apiStub.giveResponses(
    API_VERSION_RESPONSE,
    ...responseBodies,
    ...writeResponses,
  );
}

async function setupDeletedFacilities(...docIds) {
  for (const id of docIds) {
    const writtenDoc = await apiStub.db.put({ _id: id });
    const expected = expectedDocs.find(doc => doc._id === id);
    expected._rev = writtenDoc.rev;
    expected._deleted = true;
    expected.cht_disable_linked_users = true;
  }
}

async function assertDbEmpty() {
  const res = await apiStub.db.allDocs();
  expect(res.rows).to.be.empty;
}
