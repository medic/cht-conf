const api = require('../api-stub');
const assert = require('chai').assert;
const sinon = require('sinon');
const fs = require('../../src/lib/sync-fs');
const readline = require('readline-sync');
const warnUploadOverwrite = require('../../src/lib/warn-upload-overwrite');
const log = require('../../src/lib/log');

let calls;

describe('warn-upload-overwrite', () => {

  beforeEach(() => {
    calls = [];
    log.info = (...args) => {
      calls.push(args);
    };
    sinon.stub(fs, 'exists').returns(true);
    api.start();
  });

  afterEach(() => {
    sinon.restore();
    api.stop();
  });

  describe('prompts when attempting to overwrite (by rev)', () => {

    it('throws an error when no local revs exists and the user aborts the overwrite', () => {
      sinon.stub(readline, 'keyInYN').returns(false);
      return warnUploadOverwrite.preUploadByRev(api.db, {}).catch(e => {
        assert.equal('configuration modified', e.message);
      });
    });

    it('shows diff when local rev is different from remote rev and the user requests a diff', () => {
      sinon.stub(readline, 'keyInYN').returns(true);
      sinon.stub(readline, 'keyInSelect').returns(2);
      sinon.stub(api.db, 'get').resolves({ _rev: 'x' });
      sinon.stub(fs, 'read').returns(JSON.stringify({ a: { 'localhost/medic': 'y' }}));
      const localDoc = { _id: 'a', _rev: 'y' };
      return warnUploadOverwrite.preUploadByRev(api.db, localDoc).then(() => {
        assert.equal(calls.length, 1);
        assert.equal(calls[0][0], ' {\n\u001b[32m+  _id: "a"\u001b[39m\n\u001b[31m-  _rev: "x"\u001b[39m\n\u001b[32m+  _rev: "y"\u001b[39m\n }\n');
      });
    });

    it('aborts when local rev is different from remote rev and the user requests an abort', () => {
      sinon.stub(readline, 'keyInYN').returns(true);
      sinon.stub(readline, 'keyInSelect').returns(3);
      sinon.stub(api.db, 'get').resolves({ _rev: 'x' });
      sinon.stub(fs, 'read').returns(JSON.stringify({ a: { 'localhost/medic': 'y' }}));
      const localDoc = { _id: 'a', _rev: 'y' };
      return warnUploadOverwrite.preUploadByRev(api.db, localDoc).catch(e => {
        assert.equal('configuration modified', e.message);
      });
    });

    it('removes username and password from couchUrl before writing', () => {
      sinon.stub(api.db, 'get').resolves({ _rev: 'y-23' });
      const write = sinon.stub(fs, 'write').returns();
      sinon.stub(fs, 'read').returns(JSON.stringify({ a: { 'y/m': 'a-12' }}));
      const localDoc = { _id: 'a' };
      return warnUploadOverwrite.postUploadByRev(api.db, localDoc).then(() => {
        assert.equal(write.callCount, 1);
        assert.equal(write.args[0][1], '{"a":{"y/m":"a-12","localhost/medic":"y-23"}}');
      });
    });
  });

  describe('prompts when attempting to overwrite (by xml)', () => {

    it('shows diff when local xml is different from remote xml and the user requests a diff', () => {
      sinon.stub(readline, 'keyInYN').returns(true);
      sinon.stub(readline, 'keyInSelect').returns(2);
      sinon.stub(api.db, 'get').resolves({ _rev: 'x', _attachments: { xml: { digest: 'abc' } } });
      sinon.stub(api.db, 'getAttachment').resolves(Buffer.from('<?xml version="1.0"?><y />', 'utf8'));
      sinon.stub(fs, 'read').returns('{"x":{"localhost/medic":"y"}}');
      const localXml = '<?xml version="1.0"?><x />';
      const localDoc = { _id: 'x' };
      return warnUploadOverwrite.preUploadByXml(api.db, localDoc, localXml).then(() => {
        assert.equal(calls.length, 1);
        assert.equal(calls[0][0], '/\n\tExpected element \'x\' instead of \'y\'');
      });
    });

    it('aborts when local xml is different from remote xml and the user requests an abort', () => {
      sinon.stub(readline, 'keyInYN').returns(true);
      sinon.stub(readline, 'keyInSelect').returns(3);
      sinon.stub(api.db, 'get').resolves({ _rev: 'x', _attachments: { xml: { digest: 'abc' } } });
      sinon.stub(api.db, 'getAttachment').resolves(Buffer.from('<?xml version="1.0"?><y />', 'utf8'));
      sinon.stub(fs, 'read').returns('{"localhost/medic":"y"}');
      const localXml = '<?xml version="1.0"?><x />';
      const localDoc = { _id: 'x' };
      return warnUploadOverwrite.preUploadByXml(api.db, localDoc, localXml).catch(e => {
        assert.equal('configuration modified', e.message);
      });
    });

    it('uploads the local xml if remote xml does not exist', () => {
      let error = new Error('No attachment');
      error.status = 404;
      const getAttachment = sinon.stub(api.db, 'get').rejects(error);
      sinon.stub(fs, 'read').returns('{"localhost/medic":"y"}');
      const localXml = '<?xml version="1.0"?><x />';
      const localDoc = { _id: 'x' };
      return warnUploadOverwrite.preUploadByXml(api.db, localDoc, localXml).then(() => {
        assert(getAttachment.calledOnce);
      });
    });

  });

});
