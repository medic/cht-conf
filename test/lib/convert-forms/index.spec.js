const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const fs = require('../../../src/lib/sync-fs');
const path = require('path');
const log = require('../../../src/lib/log');
const { LEVEL_NONE } = log;
const convertForms = rewire('./../../../src/lib/convert-forms');

const XLS2XFORM = path.join(__dirname, '..', '..', '..', 'bin', 'xls2xform-medic');

describe('convert-forms', () => {
  let mockExec;
  beforeEach(() => {
    mockExec = sinon.stub();
    sinon.stub(log, 'warn');
    convertForms.__set__('exec', mockExec);
    convertForms.__set__('fixXml', sinon.stub());
    convertForms.__set__('getHiddenFields', sinon.stub());

    sinon.stub(fs, 'readdir').returns(['a.xml', 'b.xlsx', 'c.xlsx']);
    sinon.stub(fs, 'exists').returns(true);
    sinon.stub(fs, 'readJson').returns({});
  });
  afterEach(sinon.restore);

  describe('pyxform execution fails', () => {
    const message = 'Python is not installed.';
    [
      new Error(message),
      { message },
      message
    ].forEach(error => {
      it('throws error with error message', async () => {
        mockExec.returns(Promise.reject(error));

        await expect(convertForms.execute('./path', 'app')).to.be.rejectedWith(
          `There was a problem executing xls2xform. Make sure you have Python 3.10+ installed.\n${message}`
        );
      });
    });

    it('throws error with empty string', () => async () => {
      mockExec.returns(Promise.reject(''));

      await expect(convertForms.execute('./path', 'app')).to.be.rejectedWith(
        `There was a problem executing xls2xform. Make sure you have Python 3.10+ installed.\n`
      );
    });

    it('throws error with empty object', () => async () => {
      mockExec.returns(Promise.reject({}));

      await expect(convertForms.execute('./path', 'app')).to.be.rejectedWith(
        `There was a problem executing xls2xform. Make sure you have Python 3.10+ installed.\n{}`
      );
    });
  });

  describe('pyxform execution completes', () => {
    it('succeeds when OK status code', () => async () => {
      mockExec.returns(Promise.resolve(JSON.stringify({ code: 100 })));

      await convertForms.execute('./path', 'app');

      expect(mockExec.args).to.deep.equal([
        [[XLS2XFORM, '--skip_validate', '--json', './path/forms/app/b.xlsx', './path/forms/app/b.xml'], LEVEL_NONE],
        [[XLS2XFORM, '--skip_validate', '--json', './path/forms/app/c.xlsx', './path/forms/app/c.xml'], LEVEL_NONE]
      ]);
    });

    it('prints warnings before succeeding', () => async () => {
      const warnings = ['Warning 1', 'Warning 2'];
      mockExec.returns(Promise.resolve(JSON.stringify({ code: 101, warnings })));

      await convertForms.execute('./path', 'app');

      expect(mockExec.args).to.deep.equal([
        [[XLS2XFORM, '--skip_validate', '--json', './path/forms/app/b.xlsx', './path/forms/app/b.xml'], LEVEL_NONE],
        [[XLS2XFORM, '--skip_validate', '--json', './path/forms/app/c.xlsx', './path/forms/app/c.xml'], LEVEL_NONE]
      ]);
      expect(log.warn.args).to.deep.equal([
        ['Converted b.xlsx with warnings:'],
        ...warnings.map(w => [w]),
        ['Converted c.xlsx with warnings:'],
        ...warnings.map(w => [w])
      ]);
    });

    it('throws error when xls2xform reports an error', () => async () => {
      const message = 'There has been a problem trying to replace ${doesNOtExist} with ' +
        'the XPath to the survey element named \'doesNOtExist\'. There is no survey element with this name.';
      mockExec.returns(Promise.resolve(JSON.stringify({ code: 999, message })));

      await expect(convertForms.execute('./path', 'app')).to.be.rejectedWith(
        `Could not convert b.xlsx: ${message}`
      );
    });

    it('throws custom error when xls2xform reports an empty group', () => async () => {
      const message = '\'NoneType\' object is not iterable';
      mockExec.returns(Promise.resolve(JSON.stringify({ message })));

      await expect(convertForms.execute('./path', 'app')).to.be.rejectedWith(
        'Could not convert b.xlsx: Check the form for an empty group or repeat.'
      );
    });

    it('warns of any additional messages included in log', () => async () => {
      const msg0 = 'UserWarning: Data Validation extension is not supported and will be removed';
      const msg1 = 'warn(msg)';
      mockExec.returns(Promise.resolve(`
        ${msg0}
        ${msg1}
        ${JSON.stringify({ code: 100 })}
      `));

      await convertForms.execute('./path', 'app');

      expect(mockExec.args).to.deep.equal([
        [[XLS2XFORM, '--skip_validate', '--json', './path/forms/app/b.xlsx', './path/forms/app/b.xml'], LEVEL_NONE],
        [[XLS2XFORM, '--skip_validate', '--json', './path/forms/app/c.xlsx', './path/forms/app/c.xml'], LEVEL_NONE]
      ]);
      expect(log.warn.args).to.deep.equal([[msg0], [msg1], [msg0], [msg1]]);
    });
  });

  describe('filtering', () => {
    beforeEach(() => mockExec.resolves(JSON.stringify({ code: 100 })));

    it('filter matches one form only', () => async () => {
      await convertForms.execute('./path', 'app', { forms: ['c'] });
      expect(mockExec).calledOnceWithExactly(
        [XLS2XFORM, '--skip_validate', '--json', './path/forms/app/c.xlsx', './path/forms/app/c.xml'], LEVEL_NONE
      );
    });

    it('filter matches no forms', () => async () => {
      await convertForms.execute('./path', 'app', { forms: ['z'] });
      expect(mockExec).to.not.have.been.called;
    });

    it('--debug does not filter', () => async () => {
      await convertForms.execute('./path', 'app', { forms: ['--debug'] });
      expect(mockExec.args).to.deep.equal([
        [[XLS2XFORM, '--skip_validate', '--json', './path/forms/app/b.xlsx', './path/forms/app/b.xml'], LEVEL_NONE],
        [[XLS2XFORM, '--skip_validate', '--json', './path/forms/app/c.xlsx', './path/forms/app/c.xml'], LEVEL_NONE]
      ]);
    });

    it('escape whitespaces in path and convert forms', () => async () => {
      await convertForms.execute('./path with space', 'app');
      expect(mockExec.args).to.deep.equal([
        [[
          XLS2XFORM,
          '--skip_validate',
          '--json',
          './path\\ with\\ space/forms/app/b.xlsx',
          './path\\ with\\ space/forms/app/b.xml'
        ], LEVEL_NONE],
        [[
          XLS2XFORM,
          '--skip_validate',
          '--json',
          './path\\ with\\ space/forms/app/c.xlsx',
          './path\\ with\\ space/forms/app/c.xml'
        ], LEVEL_NONE]
      ]);
    });
  });
});
