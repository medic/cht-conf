const { expect } = require('chai');
const sinon = require('sinon');

describe('forms with large attachments', () => {

  it('falls back to uploading attachments separately when doc is too large', async () => {
    const largeAttachment = {
      data: Buffer.alloc(340 * 1024 * 1024), // 340MB
      content_type: 'image/png'
    };
   
    const doc = {
      _id: 'form:large',
      someField: 'test data',
      _attachments: {
        'large.png': largeAttachment
      }
    };

    const fakeDb = {
    // First get() call in upsertDoc - document exists
      get: sinon.stub()
        .onFirstCall().resolves({ _id: 'form:large', _rev: '1-abc' })
      // Second get() call in handleLargeDocument with {latest: true}
        .onSecondCall().resolves({ _id: 'form:large', _rev: '1-abc' }),
    
      // First put() call fails with 413, second put() (without attachments) succeeds
      put: sinon.stub()
        .onFirstCall().rejects({ status: 413, message: 'Document too large' })
        .onSecondCall().resolves({ id: 'form:large', rev: '2-def', ok: true }),
    
      // putAttachment succeeds
      putAttachment: sinon.stub().resolves({ id: 'form:large', rev: '3-ghi', ok: true })
    };

    const uploadFn = require('../../src/lib/insert-or-replace');
    const result = await uploadFn(fakeDb, doc);

    // Verify the flow
    expect(fakeDb.get.calledTwice).to.be.true;
    expect(fakeDb.put.calledTwice).to.be.true;
    expect(fakeDb.putAttachment.calledOnce).to.be.true;

    // Verify first put() call included attachments and proper _rev
    const firstPutCall = fakeDb.put.firstCall.args[0];
    expect(firstPutCall._id).to.equal('form:large');
    expect(firstPutCall._rev).to.equal('1-abc');
    expect(firstPutCall._attachments).to.exist;
    expect(firstPutCall._attachments['large.png']).to.equal(largeAttachment);

    // Verify second put() call (fallback) excluded attachments but kept other fields
    const secondPutCall = fakeDb.put.secondCall.args[0];
    expect(secondPutCall._id).to.equal('form:large');
    expect(secondPutCall._rev).to.equal('1-abc');
    expect(secondPutCall.someField).to.equal('test data');
    expect(secondPutCall._attachments).to.be.undefined;

    // Verify putAttachment was called with correct parameters
    const [id, name, rev, data, contentType] = fakeDb.putAttachment.firstCall.args;
    expect(id).to.equal('form:large');
    expect(name).to.equal('large.png');
    expect(rev).to.equal('2-def'); // Should use the rev from the second put() result
    expect(data).to.equal(largeAttachment.data);
    expect(contentType).to.equal('image/png');

    // Verify the final result
    expect(result).to.deep.equal({ id: 'form:large', rev: '2-def', ok: true });
  });

  // Additional test for multiple attachments
  it('handles multiple attachments when document is too large', async () => {
    const attachment1 = { data: Buffer.alloc(1024), content_type: 'image/png' };
    const attachment2 = { data: Buffer.alloc(2048), content_type: 'image/jpeg' };
   
    const doc = {
      _id: 'form:multi-attach',
      _attachments: {
        'image1.png': attachment1,
        'image2.jpg': attachment2
      }
    };

    const fakeDb = {
      get: sinon.stub()
        .onFirstCall().resolves({ _id: 'form:multi-attach', _rev: '1-abc' })
        .onSecondCall().resolves({ _id: 'form:multi-attach', _rev: '1-abc' }),
    
      put: sinon.stub()
        .onFirstCall().rejects({ status: 413 })
        .onSecondCall().resolves({ id: 'form:multi-attach', rev: '2-def', ok: true }),
    
      putAttachment: sinon.stub()
        .onFirstCall().resolves({ id: 'form:multi-attach', rev: '3-ghi', ok: true })
        .onSecondCall().resolves({ id: 'form:multi-attach', rev: '4-jkl', ok: true })
    };

    const uploadFn = require('../../src/lib/insert-or-replace');
    await uploadFn(fakeDb, doc);

    expect(fakeDb.putAttachment.calledTwice).to.be.true;
  
    // Verify first attachment
    const [id1, name1, rev1, data1, contentType1] = fakeDb.putAttachment.firstCall.args;
    expect(id1).to.equal('form:multi-attach');
    expect(name1).to.equal('image1.png');
    expect(rev1).to.equal('2-def');
    expect(contentType1).to.equal('image/png');
  
    // Verify second attachment uses updated rev
    const [id2, name2, rev2, data2, contentType2] = fakeDb.putAttachment.secondCall.args;
    expect(id2).to.equal('form:multi-attach');
    expect(name2).to.equal('image2.jpg');
    expect(rev2).to.equal('3-ghi'); // Updated rev from first attachment
    expect(contentType2).to.equal('image/jpeg');
  });

  // Test for attachment conflict handling
  it('handles conflicts when adding attachments separately', async () => {
    const attachment = { data: Buffer.alloc(1024), content_type: 'image/png' };
   
    const doc = {
      _id: 'form:conflict',
      _attachments: { 'test.png': attachment }
    };

    const fakeDb = {
      get: sinon.stub()
        .onCall(0).resolves({ _id: 'form:conflict', _rev: '1-abc' })
        .onCall(1).resolves({ _id: 'form:conflict', _rev: '1-abc' })
        .onCall(2).resolves({ _id: 'form:conflict', _rev: '2-updated' }), // For retry
    
      put: sinon.stub()
        .onFirstCall().rejects({ status: 413 })
        .onSecondCall().resolves({ id: 'form:conflict', rev: '2-def', ok: true }),
    
      putAttachment: sinon.stub()
        .onFirstCall().rejects({ status: 409, message: 'Document update conflict' })
        .onSecondCall().resolves({ id: 'form:conflict', rev: '3-final', ok: true })
    };

    const uploadFn = require('../../src/lib/insert-or-replace');
    await uploadFn(fakeDb, doc);

    expect(fakeDb.get.calledThrice).to.be.true;
    expect(fakeDb.putAttachment.calledTwice).to.be.true;
  
    // Verify retry used updated rev
    const [, , retryRev] = fakeDb.putAttachment.secondCall.args;
    expect(retryRev).to.equal('2-updated');
  });
});
