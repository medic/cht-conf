const api = require('../api-stub');
const assert = require('chai').assert;
const fs = require('../../src/lib/sync-fs');
const readline = require('readline-sync');
const warnUploadOverwrite = require('../../src/lib/warn-upload-overwrite');

describe('prompts when attempting to overwrite', () => {
  beforeEach(api.start);
  afterEach(api.stop);

  it('throws an error when no local revs exists and the user aborts the overwrite', () => {
    readline.keyInYN = () => false;

    return warnUploadOverwrite.preUpload('/tmp', api.db, {})
    .catch(e => {
      assert.equal('configuration modified', e.message);
    });
  });

  it('shows diff when local rev is different from remote rev and the user requests a diff', () => {
    const originalLog = console.log;
    const calls = [];
    console.log = (...args) => {
      calls.push(args);
      originalLog(...args);
    };

    readline.keyInYN = () => true;
    readline.keyInSelect = () => 2;
    api.db.get = () => {
      const remoteDoc = { _rev: 'x' };
      return remoteDoc;
    };
    fs.read = () => '{"x/m":"y"}';
    const localDoc = { _rev: 'y' };
    const couchUrl = 'http://x/m';

    return warnUploadOverwrite.preUpload('/tmp', api.db, localDoc, couchUrl)
    .then(() => {
      assert.equal(calls.length, 1);
      assert.equal(calls[0][0], ' {\n\u001b[31m-  _rev: "x"\u001b[39m\n\u001b[32m+  _rev: "y"\u001b[39m\n }\n');
    });
  });

  it('aborts when local rev is different from remote rev and the user requests an abort', () => {
    readline.keyInYN = () => true;
    readline.keyInSelect = () => 3;
    api.db.get = () => {
      const remoteDoc = { _rev: 'x' };
      return remoteDoc;
    };
    fs.read = () => '{"x/m":"y"}';
    const localDoc = { _rev: 'y' };
    const couchUrl = 'http://x/m';

    return warnUploadOverwrite.preUpload('/tmp', api.db, localDoc, couchUrl)
    .catch(e => {
      assert.equal('configuration modified', e.message);
    });
  });

  it('removes username and passoword from couchUrl before writing', () => {
    api.db.get = () => {
      const remoteDoc = { _rev: 'y-23' };
      return remoteDoc;
    };
    const calls = [];
    fs.write = (...args) => {
      calls.push(args);
    };
    fs.exists = () => true;
    fs.read = () => '{"y/m":"a-12"}';
    const localDoc = { _id: 'x' };
    const couchUrl = 'http://username:password@x/m';

    return warnUploadOverwrite.postUpload('/tmp', api.db, localDoc, couchUrl)
    .then(() => {console.log(calls);
      assert.equal(calls.length, 1);
      assert.equal(calls[0][1], '{"y/m":"a-12","x/m":"y-23"}');
    });
  });
});