const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const convertForms = rewire('./../../src/lib/convert-forms');
const fs = require('../../../src/lib/sync-fs');
const path = require('path');

const XLS2XFORM = path.join(__dirname, '..', '..', 'src', 'bin', 'xls2xform-medic');

describe('convert-forms', () => {

  let mockExec;
  let withMocks;
  beforeEach(() => {
    mockExec = sinon.stub();
    withMocks = cb => convertForms.__with__({
      exec: mockExec,
      fixXml: sinon.stub(),
      getHiddenFields: sinon.stub(),
    })(cb);

    sinon.stub(fs, 'readdir').returns(['a.xml', 'b.xlsx', 'c.xlsx']);
    sinon.stub(fs, 'exists').returns(true);
    sinon.stub(fs, 'readJson').returns({});
  });
  afterEach(sinon.restore);

  it('fails if xls2xform cannot be executed', () => withMocks(async () => {
    mockExec.rejects(new Error('Python is not installed.'));

    await expect(convertForms.execute('./path', 'app')).to.be.rejectedWith(
      'There was a problem executing xls2xform.  Make sure you have Python 3.10+ installed.'
    );
  }));

  describe('filtering', () => {
    beforeEach(() => mockExec.resolves());

    it('convert one form', () => withMocks(async () => {
      await convertForms.execute('./path', 'app');
      expect(mockExec.args).to.deep.equal([
        [[XLS2XFORM, '--skip_validate', '--pretty_print', './path/forms/app/b.xlsx', './path/forms/app/b.xml']],
        [[XLS2XFORM, '--skip_validate', '--pretty_print', './path/forms/app/c.xlsx', './path/forms/app/c.xml']]
      ]);
    }));

    it('filter matches one form only', () => withMocks(async () => {
      await convertForms.execute('./path', 'app', { forms: ['c'] });
      expect(mockExec).calledOnceWithExactly(
        [XLS2XFORM, '--skip_validate', '--pretty_print', './path/forms/app/c.xlsx', './path/forms/app/c.xml']
      );
    }));

    it('filter matches no forms', () => withMocks(async () => {
      await convertForms.execute('./path', 'app', { forms: ['z'] });
      expect(mockExec).to.not.have.been.called;
    }));

    it('--debug does not filter', () => withMocks(async () => {
      await convertForms.execute('./path', 'app', { forms: ['--debug'] });
      expect(mockExec.args).to.deep.equal([
        [[XLS2XFORM, '--skip_validate', '--pretty_print', './path/forms/app/b.xlsx', './path/forms/app/b.xml']],
        [[XLS2XFORM, '--skip_validate', '--pretty_print', './path/forms/app/c.xlsx', './path/forms/app/c.xml']]
      ]);
    }));

    it('escape whitespaces in path and convert forms', () => withMocks(async () => {
      await convertForms.execute('./path with space', 'app');
      expect(mockExec.args).to.deep.equal([
        [[
          XLS2XFORM,
          '--skip_validate',
          '--pretty_print',
          './path\\ with\\ space/forms/app/b.xlsx', './path\\ with\\ space/forms/app/b.xml'
        ]],
        [[
          XLS2XFORM,
          '--skip_validate',
          '--pretty_print',
          './path\\ with\\ space/forms/app/c.xlsx',
          './path\\ with\\ space/forms/app/c.xml'
        ]]
      ]);
    }));
  });
});
