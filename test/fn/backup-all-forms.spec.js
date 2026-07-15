const { expect } = require('chai');
const path = require('path');
const rewire = require('rewire');
const sinon = require('sinon');

describe('backup-all-forms', () => {
  let backupAllForms;
  let db;
  let fsStub;

  beforeEach(() => {
    backupAllForms = rewire('../../src/fn/backup-all-forms');

    db = { get: sinon.stub() };

    fsStub = {
      mkdir: sinon.stub(),
      writeJson: sinon.stub(),
      writeBinary: sinon.stub(),
      path,
    };

    backupAllForms.__set__('pouch', () => db);
    backupAllForms.__set__('backupFileFor', () => '/tmp/backups/forms.bak');
    backupAllForms.__set__('fs', fsStub);
    backupAllForms.__set__('log', () => {});
    backupAllForms.__set__('environment', { pathToProject: '.' });
  });

  afterEach(() => sinon.restore());

  it('backs up attachments when present', async () => {
    backupAllForms.__set__('formsList', () => Promise.resolve({ rows: [{ id: 'form:with-attachments' }] }));
    db.get.resolves({
      _id: 'form:with-attachments',
      context: { person: true },
      _attachments: {
        'xml': { data: Buffer.from('<xml/>') },
      },
    });

    await backupAllForms.execute();

    expect(fsStub.writeBinary).to.have.been.calledOnce;
    expect(fsStub.writeBinary.firstCall.args[0]).to.equal('/tmp/backups/forms.bak/form_with-attachments/xml');
  });

  it('#830 - does not throw when a form has no _attachments', async () => {
    backupAllForms.__set__('formsList', () => Promise.resolve({ rows: [{ id: 'form:no-attachments' }] }));
    db.get.resolves({ _id: 'form:no-attachments', context: { person: true } });

    await backupAllForms.execute();

    expect(fsStub.writeJson).to.have.been.calledOnceWithExactly(
      '/tmp/backups/forms.bak/form_no-attachments/context.json',
      { person: true },
    );
    expect(fsStub.writeBinary).to.not.have.been.called;
  });

});
