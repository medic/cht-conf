const { expect } = require('chai');
const sinon = require('sinon');
const log = require('../../src/lib/log'); // Import the log module directly

describe('forms with large attachments', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('falls back to uploading attachments separately when doc is too large', async () => {
    const largeAttachment = {
      data: Buffer.alloc(340 * 1024 * 1024),
      content_type: 'image/png'
    };

    const doc = {
      _id: 'form:large',
      someField: 'test data',
      _attachments: {
        'large.png': largeAttachment,
        'form.xml': { data: Buffer.from('xml content'), content_type: 'application/xml' }
      }
    };

    const fakeDb = {
      get: sinon.stub()
        .onCall(0).resolves({ _id: 'form:large', _rev: '1-abc' }) // upsertDoc
        .onCall(1).resolves({ _id: 'form:large', _rev: '1-abc' }) // handleLargeDocument
        .onCall(2).resolves({ _id: 'form:large', _rev: '2-def' }), // addDocAttachment for large.png

      put: sinon.stub()
        .onFirstCall().rejects({ status: 413, message: 'Document too large' })
        .onSecondCall().resolves({ id: 'form:large', rev: '2-def', ok: true }),

      putAttachment: sinon.stub().resolves({ id: 'form:large', rev: '3-ghi', ok: true })
    };

    const uploadFn = require('../../src/lib/insert-or-replace');
    const result = await uploadFn(fakeDb, doc);

    // Verify the flow
    expect(fakeDb.get.calledThrice).to.be.true;
    expect(fakeDb.put.calledTwice).to.be.true;
    expect(fakeDb.putAttachment.calledOnce).to.be.true;

    // Verify first put() call included all attachments and proper _rev
    const firstPutCall = fakeDb.put.firstCall.args[0];
    expect(firstPutCall._id).to.equal('form:large');
    expect(firstPutCall._rev).to.equal('1-abc');
    expect(firstPutCall._attachments).to.exist;
    expect(firstPutCall._attachments['large.png']).to.equal(largeAttachment);
    expect(firstPutCall._attachments['form.xml']).to.exist;

    // Verify second put() call (fallback) included only functional attachments
    const secondPutCall = fakeDb.put.secondCall.args[0];
    expect(secondPutCall._id).to.equal('form:large');
    expect(secondPutCall._rev).to.equal('1-abc');
    expect(secondPutCall.someField).to.equal('test data');
    expect(secondPutCall._attachments).to.deep.equal({
      'form.xml': { data: Buffer.from('xml content'), content_type: 'application/xml' }
    });

    // Verify putAttachment was called with correct parameters for media attachment
    const putAttachmentArgs = fakeDb.putAttachment.firstCall.args;
    expect(putAttachmentArgs[0]).to.equal('form:large');
    expect(putAttachmentArgs[1]).to.equal('large.png');
    expect(putAttachmentArgs[2]).to.equal('2-def');
    expect(putAttachmentArgs[3]).to.equal(largeAttachment.data);
    expect(putAttachmentArgs[4]).to.equal('image/png');

    // Verify the final result
    expect(result).to.deep.equal({ id: 'form:large', rev: '2-def', ok: true });
  });

  it('handles multiple attachments when document is too large', async () => {
    const attachment1 = { data: Buffer.alloc(1024), content_type: 'image/png' };
    const attachment2 = { data: Buffer.alloc(2048), content_type: 'image/jpeg' };
    const functionalAttachment = { data: Buffer.from('html content'), content_type: 'text/html' };

    const doc = {
      _id: 'form:multi-attach',
      _attachments: {
        'image1.png': attachment1,
        'image2.jpg': attachment2,
        'form.html': functionalAttachment
      }
    };

    const fakeDb = {
      get: sinon.stub()
        .onCall(0).resolves({ _id: 'form:multi-attach', _rev: '1-abc' }) // upsertDoc
        .onCall(1).resolves({ _id: 'form:multi-attach', _rev: '1-abc' }) // handleLargeDocument
        .onCall(2).resolves({ _id: 'form:multi-attach', _rev: '2-def' }) // addDocAttachment for image1.png
        .onCall(3).resolves({ _id: 'form:multi-attach', _rev: '3-ghi' }), // addDocAttachment for image2.jpg

      put: sinon.stub()
        .onFirstCall().rejects({ status: 413 })
        .onSecondCall().resolves({ id: 'form:multi-attach', rev: '2-def', ok: true }),

      putAttachment: sinon.stub()
        .onFirstCall().resolves({ id: 'form:multi-attach', rev: '3-ghi', ok: true })
        .onSecondCall().resolves({ id: 'form:multi-attach', rev: '4-jkl', ok: true })
    };

    const uploadFn = require('../../src/lib/insert-or-replace');
    await uploadFn(fakeDb, doc);

    expect(fakeDb.get.callCount).to.equal(4);
    expect(fakeDb.put.calledTwice).to.be.true;
    expect(fakeDb.putAttachment.calledTwice).to.be.true;

    // Verify second put() call included only functional attachments
    const secondPutCall = fakeDb.put.secondCall.args[0];
    expect(secondPutCall._attachments).to.deep.equal({
      'form.html': functionalAttachment
    });

    // Verify first attachment
    const firstAttachmentArgs = fakeDb.putAttachment.firstCall.args;
    expect(firstAttachmentArgs[0]).to.equal('form:multi-attach');
    expect(firstAttachmentArgs[1]).to.equal('image1.png');
    expect(firstAttachmentArgs[2]).to.equal('2-def');
    expect(firstAttachmentArgs[3]).to.equal(attachment1.data);
    expect(firstAttachmentArgs[4]).to.equal('image/png');

    // Verify second attachment uses updated rev
    const secondAttachmentArgs = fakeDb.putAttachment.secondCall.args;
    expect(secondAttachmentArgs[0]).to.equal('form:multi-attach');
    expect(secondAttachmentArgs[1]).to.equal('image2.jpg');
    expect(secondAttachmentArgs[2]).to.equal('3-ghi');
    expect(secondAttachmentArgs[3]).to.equal(attachment2.data);
    expect(secondAttachmentArgs[4]).to.equal('image/jpeg');
  });

  it('handles conflicts when adding attachments separately', async () => {
    const attachment = { data: Buffer.alloc(1024), content_type: 'image/png' };

    const doc = {
      _id: 'form:conflict',
      _attachments: { 'test.png': attachment }
    };

    const fakeDb = {
      get: sinon.stub()
        .onCall(0).resolves({ _id: 'form:conflict', _rev: '1-abc' }) // upsertDoc
        .onCall(1).resolves({ _id: 'form:conflict', _rev: '1-abc' }) // handleLargeDocument
        .onCall(2).resolves({ _id: 'form:conflict', _rev: '2-def' }) // First addDocAttachment
        .onCall(3).resolves({ _id: 'form:conflict', _rev: '2-updated' }), // Retry addDocAttachment

      put: sinon.stub()
        .onFirstCall().rejects({ status: 413 })
        .onSecondCall().resolves({ id: 'form:conflict', rev: '2-def', ok: true }),

      putAttachment: sinon.stub()
        .onFirstCall().rejects({ status: 409, message: 'Document update conflict' })
        .onSecondCall().resolves({ id: 'form:conflict', rev: '3-final', ok: true })
    };

    const uploadFn = require('../../src/lib/insert-or-replace');
    await uploadFn(fakeDb, doc);

    expect(fakeDb.get.callCount).to.equal(4);
    expect(fakeDb.put.calledTwice).to.be.true;
    expect(fakeDb.putAttachment.calledTwice).to.be.true;

    // Verify retry used updated rev
    const retryAttachmentArgs = fakeDb.putAttachment.secondCall.args;
    expect(retryAttachmentArgs[2]).to.equal('2-updated');
  });

  it('creates a new document when it does not exist', async () => {
    const doc = {
      _id: 'new-doc',
      someField: 'test data',
      // no _rev
    };

    const fakeDb = {
      get: sinon.stub()
        .rejects({ status: 404 }), // Document does not exist
      put: sinon.stub()
        .resolves({ id: 'new-doc', rev: '1-newrev', ok: true }),
    };

    const uploadFn = require('../../src/lib/insert-or-replace');
    const result = await uploadFn(fakeDb, doc);

    // get() called once to check existence
    expect(fakeDb.get.calledOnce).to.be.true;
    expect(fakeDb.get.firstCall.args[0]).to.equal('new-doc');

    // put() called once to create new doc
    expect(fakeDb.put.calledOnce).to.be.true;
    const putArg = fakeDb.put.firstCall.args[0];

    expect(putArg._id).to.equal('new-doc');
    expect(putArg._rev).to.be.undefined;
    expect(putArg.someField).to.equal('test data');

    // Result matches put() return value
    expect(result).to.deep.equal({ id: 'new-doc', rev: '1-newrev', ok: true });
  });

  it('skips invalid media attachments and logs warning', async () => {
    const validAttachment = { data: Buffer.alloc(1024), content_type: 'image/png' };
    const invalidAttachment = { content_type: 'image/jpeg' }; // Missing data

    const doc = {
      _id: 'form:invalid-attach',
      _attachments: {
        'valid.png': validAttachment,
        'invalid.jpg': invalidAttachment,
        'form.xml': { data: Buffer.from('xml content'), content_type: 'application/xml' }
      }
    };

    const fakeDb = {
      get: sinon.stub()
        .onCall(0).resolves({ _id: 'form:invalid-attach', _rev: '1-abc' }) // upsertDoc
        .onCall(1).resolves({ _id: 'form:invalid-attach', _rev: '1-abc' }) // handleLargeDocument
        .onCall(2).resolves({ _id: 'form:invalid-attach', _rev: '2-def' }), // addDocAttachment for valid.png

      put: sinon.stub()
        .onFirstCall().rejects({ status: 413 })
        .onSecondCall().resolves({ id: 'form:invalid-attach', rev: '2-def', ok: true }),

      putAttachment: sinon.stub()
        .resolves({ id: 'form:invalid-attach', rev: '3-ghi', ok: true })
    };

    const logWarnSpy = sinon.spy(log, 'warn');
    const uploadFn = require('../../src/lib/insert-or-replace');
    await uploadFn(fakeDb, doc);

    expect(fakeDb.get.callCount).to.equal(3);
    expect(fakeDb.put.calledTwice).to.be.true;
    expect(fakeDb.putAttachment.calledOnce).to.be.true;

    // Verify second put() call included only functional attachments
    const secondPutCall = fakeDb.put.secondCall.args[0];
    expect(secondPutCall._attachments).to.deep.equal({
      'form.xml': { data: Buffer.from('xml content'), content_type: 'application/xml' }
    });

    // Verify only valid attachment was processed
    const putAttachmentArgs = fakeDb.putAttachment.firstCall.args;
    expect(putAttachmentArgs[1]).to.equal('valid.png');
    expect(putAttachmentArgs[2]).to.equal('2-def');
    expect(putAttachmentArgs[3]).to.equal(validAttachment.data);
    expect(putAttachmentArgs[4]).to.equal('image/png');

    // Verify warning was logged for invalid attachment
    expect(logWarnSpy.calledOnce).to.be.true;
    expect(logWarnSpy.calledWith(
      'Skipping invalid attachment invalid.jpg for form:invalid-attach: missing data'
    )).to.be.true;

    logWarnSpy.restore();
  });

  it('removes empty _attachments property when no functional attachments exist', async () => {
    const attachment = { data: Buffer.alloc(1024), content_type: 'image/png' };

    const doc = {
      _id: 'form:no-functional',
      _attachments: { 'image.png': attachment }
    };

    const fakeDb = {
      get: sinon.stub()
        .onCall(0).resolves({ _id: 'form:no-functional', _rev: '1-abc' }) // upsertDoc
        .onCall(1).resolves({ _id: 'form:no-functional', _rev: '1-abc' }) // handleLargeDocument
        .onCall(2).resolves({ _id: 'form:no-functional', _rev: '2-def' }), // addDocAttachment

      put: sinon.stub()
        .onFirstCall().rejects({ status: 413 })
        .onSecondCall().resolves({ id: 'form:no-functional', rev: '2-def', ok: true }),

      putAttachment: sinon.stub()
        .resolves({ id: 'form:no-functional', rev: '3-ghi', ok: true })
    };

    const uploadFn = require('../../src/lib/insert-or-replace');
    await uploadFn(fakeDb, doc);

    expect(fakeDb.get.callCount).to.equal(3);
    expect(fakeDb.put.calledTwice).to.be.true;
    expect(fakeDb.putAttachment.calledOnce).to.be.true;

    // Verify second put() call removed _attachments
    const secondPutCall = fakeDb.put.secondCall.args[0];
    expect(secondPutCall._attachments).to.be.undefined;

    // Verify attachment was processed
    const putAttachmentArgs = fakeDb.putAttachment.firstCall.args;
    expect(putAttachmentArgs[1]).to.equal('image.png');
    expect(putAttachmentArgs[2]).to.equal('2-def');
  });
});
