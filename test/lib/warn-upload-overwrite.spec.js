const api = require('../api-stub');
const assert = require('chai').assert;
const fs = require('../../src/lib/sync-fs');
const readline = require('readline-sync');
const warnUploadOverwrite = require('../../src/lib/warn-upload-overwrite');
const log = require('../../src/lib/log');

describe('prompts when attempting to overwrite (by rev)', () => {
  beforeEach(api.start);
  afterEach(api.stop);

  it('throws an error when no local revs exists and the user aborts the overwrite', () => {
    readline.keyInYN = () => false;

    return warnUploadOverwrite.preUploadByRev('/tmp', api.db, {})
    .catch(e => {
      assert.equal('configuration modified', e.message);
    });
  });

  it('shows diff when local rev is different from remote rev and the user requests a diff', () => {
    const calls = [];
    log.info = (...args) => {
      calls.push(args);
    };

    readline.keyInYN = () => true;
    readline.keyInSelect = () => 2;
    api.db.get = () => {
      const remoteDoc = { _rev: 'x' };
      return remoteDoc;
    };
    fs.read = () => '{"localhost/medic":"y"}';
    const localDoc = { _rev: 'y' };

    return warnUploadOverwrite.preUploadByRev('/tmp', api.db, localDoc)
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
    fs.read = () => '{"localhost/medic":"y"}';
    const localDoc = { _rev: 'y' };

    return warnUploadOverwrite.preUploadByRev('/tmp', api.db, localDoc)
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

    return warnUploadOverwrite.postUploadByRev('/tmp', api.db, localDoc)
    .then(() => {
      assert.equal(calls.length, 1);
      assert.equal(calls[0][1], '{"y/m":"a-12","localhost/medic":"y-23"}');
    });
  });
});

describe('prompts when attempting to overwrite (by xml)', () => {
  beforeEach(api.start);
  afterEach(api.stop);

  it('shows diff when local xml is different from remote xml and the user requests a diff', () => {
    const calls = [];
    log.info = (...args) => {
      calls.push(args);
    };

    readline.keyInYN = () => true;
    readline.keyInSelect = () => 2;
    api.db.getAttachment = () => Buffer.from('<?xml version="1.0"?><y />', 'utf8');
    fs.read = () => '{"localhost/medic":"y"}';
    const localXml = '<?xml version="1.0"?><x />';

    return warnUploadOverwrite.preUploadByXml(api.db, 'x', localXml)
    .then(() => {
      assert.equal(calls.length, 1);
      assert.equal(calls[0][0], '/\n\tExpected element \'x\' instead of \'y\'');
    });
  });

  it('aborts when local xml is different from remote xml and the user requests an abort', () => {
    readline.keyInYN = () => true;
    readline.keyInSelect = () => 3;
    api.db.getAttachment = () => Buffer.from('<?xml version="1.0"?><y />', 'utf8');
    fs.read = () => '{"localhost/medic":"y"}';
    const localXml = '<?xml version="1.0"?><x />';

    return warnUploadOverwrite.preUploadByRev(api.db, 'x', localXml)
    .catch(e => {
      assert.equal('configuration modified', e.message);
    });
  });

});