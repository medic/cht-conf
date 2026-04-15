const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const fs = require('../../../src/lib/sync-fs');
const nodeFs = require('node:fs');
const path = require('path');
const log = require('../../../src/lib/log');
const { LEVEL_NONE } = log;
const convertForms = rewire('./../../../src/lib/convert-forms');

const XLS2XFORM = path.join(__dirname, '..', '..', '..', 'bin', 'xls2xform-medic');

describe('convert-forms', () => {
  let mockExec;
  beforeEach(() => {
    mockExec = sinon.stub();
    convertForms.__set__('warn', sinon.stub(log, 'warn'));
    convertForms.__set__('exec', mockExec);
    convertForms.__set__('fixXml', sinon.stub());
    convertForms.__set__('getPropsData', sinon.stub());

    sinon.stub(fs, 'readdir').returns(['a.xml', 'b.xlsx', 'c.xlsx']);
    sinon.stub(fs, 'exists').returns(true);
    sinon.stub(fs, 'readJson').returns({});
    sinon.stub(nodeFs, 'rmSync');
    sinon.stub(nodeFs, 'renameSync');
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
        expect(nodeFs.rmSync.args).to.deep.equal([
          ['./path/forms/app/b.xml', { force: true }],
          ['./path/forms/app/b.xml.swp', { force: true }]
        ]);
      });
    });

    it('throws error with empty string', async () => {
      mockExec.returns(Promise.reject(''));

      await expect(convertForms.execute('./path', 'app')).to.be.rejectedWith(
        `There was a problem executing xls2xform. Make sure you have Python 3.10+ installed.\n`
      );
      expect(nodeFs.rmSync.args).to.deep.equal([
        ['./path/forms/app/b.xml', { force: true }],
        ['./path/forms/app/b.xml.swp', { force: true }]
      ]);
    });

    it('throws error with empty object', async () => {
      mockExec.returns(Promise.reject({}));

      await expect(convertForms.execute('./path', 'app')).to.be.rejectedWith(
        `There was a problem executing xls2xform. Make sure you have Python 3.10+ installed.\n{}`
      );
      expect(nodeFs.rmSync.args).to.deep.equal([
        ['./path/forms/app/b.xml', { force: true }],
        ['./path/forms/app/b.xml.swp', { force: true }]
      ]);
    });
  });

  describe('pyxform execution completes', () => {
    it('succeeds when OK status code', async () => {
      mockExec.returns(Promise.resolve(JSON.stringify({ code: 100 })));

      await convertForms.execute('./path', 'app');

      expect(mockExec.args).to.deep.equal([
        [[XLS2XFORM, '--skip_validate', '--json', './path/forms/app/b.xlsx', './path/forms/app/b.xml.swp'], LEVEL_NONE],
        [[XLS2XFORM, '--skip_validate', '--json', './path/forms/app/c.xlsx', './path/forms/app/c.xml.swp'], LEVEL_NONE]
      ]);
      expect(nodeFs.rmSync.args).to.deep.equal([
        ['./path/forms/app/b.xml', { force: true }],
        ['./path/forms/app/c.xml', { force: true }]
      ]);
      expect(nodeFs.renameSync.args).to.deep.equal([
        ['./path/forms/app/b.xml.swp', './path/forms/app/b.xml'],
        ['./path/forms/app/c.xml.swp', './path/forms/app/c.xml']
      ]);
    });

    it('prints warnings before succeeding', async () => {
      const warnings = ['Warning 1', 'Warning 2'];
      mockExec.returns(Promise.resolve(JSON.stringify({ code: 101, warnings })));

      await convertForms.execute('./path', 'app');

      expect(mockExec.args).to.deep.equal([
        [[XLS2XFORM, '--skip_validate', '--json', './path/forms/app/b.xlsx', './path/forms/app/b.xml.swp'], LEVEL_NONE],
        [[XLS2XFORM, '--skip_validate', '--json', './path/forms/app/c.xlsx', './path/forms/app/c.xml.swp'], LEVEL_NONE]
      ]);
      expect(log.warn.args).to.deep.equal([
        ['Converted b.xlsx with warnings:'],
        ...warnings.map(w => [w]),
        ['Converted c.xlsx with warnings:'],
        ...warnings.map(w => [w])
      ]);
      expect(nodeFs.rmSync.args).to.deep.equal([
        ['./path/forms/app/b.xml', { force: true }],
        ['./path/forms/app/c.xml', { force: true }]
      ]);
      expect(nodeFs.renameSync.args).to.deep.equal([
        ['./path/forms/app/b.xml.swp', './path/forms/app/b.xml'],
        ['./path/forms/app/c.xml.swp', './path/forms/app/c.xml']
      ]);
    });

    it('throws error when xls2xform reports an error', async () => {
      const message = 'There has been a problem trying to replace ${doesNOtExist} with ' +
        'the XPath to the survey element named \'doesNOtExist\'. There is no survey element with this name.';
      mockExec.returns(Promise.resolve(JSON.stringify({ code: 999, message })));

      await expect(convertForms.execute('./path', 'app')).to.be.rejectedWith(
        `Could not convert b.xlsx: ${message}`
      );
      expect(nodeFs.rmSync.args).to.deep.equal([
        ['./path/forms/app/b.xml', { force: true }],
        ['./path/forms/app/b.xml.swp', { force: true }]
      ]);
      expect(nodeFs.renameSync).to.not.have.been.called;
    });

    it('throws custom error when xls2xform reports an empty group', async () => {
      const message = '\'NoneType\' object is not iterable';
      mockExec.returns(Promise.resolve(JSON.stringify({ message })));

      await expect(convertForms.execute('./path', 'app')).to.be.rejectedWith(
        'Could not convert b.xlsx: Check the form for an empty group or repeat.'
      );
      expect(nodeFs.rmSync.args).to.deep.equal([
        ['./path/forms/app/b.xml', { force: true }],
        ['./path/forms/app/b.xml.swp', { force: true }]
      ]);
      expect(nodeFs.renameSync).to.not.have.been.called;
    });

    it('warns of any additional messages included in log', async () => {
      const msg0 = 'UserWarning: Data Validation extension is not supported and will be removed';
      const msg1 = 'warn(msg)';
      mockExec.returns(Promise.resolve(`
        ${msg0}
        ${msg1}
        ${JSON.stringify({ code: 100 })}
      `));

      await convertForms.execute('./path', 'app');

      expect(mockExec.args).to.deep.equal([
        [[XLS2XFORM, '--skip_validate', '--json', './path/forms/app/b.xlsx', './path/forms/app/b.xml.swp'], LEVEL_NONE],
        [[XLS2XFORM, '--skip_validate', '--json', './path/forms/app/c.xlsx', './path/forms/app/c.xml.swp'], LEVEL_NONE]
      ]);
      expect(log.warn.args).to.deep.equal([[msg0], [msg1], [msg0], [msg1]]);
      expect(nodeFs.rmSync.args).to.deep.equal([
        ['./path/forms/app/b.xml', { force: true }],
        ['./path/forms/app/c.xml', { force: true }]
      ]);
      expect(nodeFs.renameSync.args).to.deep.equal([
        ['./path/forms/app/b.xml.swp', './path/forms/app/b.xml'],
        ['./path/forms/app/c.xml.swp', './path/forms/app/c.xml']
      ]);
    });
  });

  describe('filtering', () => {
    beforeEach(() => mockExec.resolves(JSON.stringify({ code: 100 })));

    it('filter matches one form only', async () => {
      await convertForms.execute('./path', 'app', { forms: ['c'] });
      expect(mockExec).calledOnceWithExactly(
        [XLS2XFORM, '--skip_validate', '--json', './path/forms/app/c.xlsx', './path/forms/app/c.xml.swp'], LEVEL_NONE
      );
    });

    it('filter matches no forms', async () => {
      await convertForms.execute('./path', 'app', { forms: ['z'] });
      expect(mockExec).to.not.have.been.called;
    });

    it('--debug does not filter', async () => {
      await convertForms.execute('./path', 'app', { forms: ['--debug'] });
      expect(mockExec.args).to.deep.equal([
        [[XLS2XFORM, '--skip_validate', '--json', './path/forms/app/b.xlsx', './path/forms/app/b.xml.swp'], LEVEL_NONE],
        [[XLS2XFORM, '--skip_validate', '--json', './path/forms/app/c.xlsx', './path/forms/app/c.xml.swp'], LEVEL_NONE]
      ]);
    });

    it('escape whitespaces in path and convert forms', async () => {
      await convertForms.execute('./path with space', 'app');
      expect(mockExec.args).to.deep.equal([
        [[
          XLS2XFORM,
          '--skip_validate',
          '--json',
          './path\\ with\\ space/forms/app/b.xlsx',
          './path\\ with\\ space/forms/app/b.xml.swp'
        ], LEVEL_NONE],
        [[
          XLS2XFORM,
          '--skip_validate',
          '--json',
          './path\\ with\\ space/forms/app/c.xlsx',
          './path\\ with\\ space/forms/app/c.xml.swp'
        ], LEVEL_NONE]
      ]);
    });
  });

  describe('var checks', () => {
    const convertForms = rewire('./../../../src/lib/convert-forms');
    const { createXformString } = require('../../fn/convert-forms.utils');
    const FORM_ID = 'c';
    const getXmlString = () => ({
      model: `
        <instance>
          <data id="${FORM_ID}" prefix="J1!${FORM_ID}!" >
          </data>
        </instance>
      `
    });
    let getPropsData;
    let fixXml;
    let checkVars;
    
    beforeEach(() => {
      mockExec.resolves(JSON.stringify({ code: 100 }));

      getPropsData = sinon.stub().returns({
        var_restrictions: { some_prop: 'some_value' }
      });
      convertForms.__set__('getPropsData', getPropsData);

      const realCheckVars = convertForms.__get__('checkVars');
      checkVars = sinon.spy(realCheckVars);
      convertForms.__set__('checkVars', checkVars);

      const realFixXml = convertForms.__get__('fixXml');
      fixXml = sinon.spy(realFixXml);
      convertForms.__set__('fixXml', fixXml);

      convertForms.__set__('exec', mockExec);

      sinon.stub(fs, 'read').returns(createXformString(getXmlString()));
      sinon.stub(fs, 'write').returns(true);
    });
    afterEach(sinon.restore);

    it('should skip checkVars when no "var_restriction" config is being supplied', async () => {
      getPropsData = sinon.stub().returns({});
      convertForms.__set__('getPropsData', getPropsData);
      await expect(convertForms.execute('./path', 'app', { forms: [FORM_ID] })).to.be.fulfilled;
      
      expect(getPropsData.calledOnce).to.be.true;
      expect(getPropsData.args[0][0]).to.be.equal('./path/forms/app/c.properties.json');
      expect(fixXml.calledOnce).to.be.true;
      expect(fixXml.args[0][1]).to.be.deep.equal({});
      expect(checkVars.callCount).to.be.equal(0);
      expect(fs.write.calledOnce).to.be.true;
    });

    it('should pick up var config & call checkVars', async () => {
      await expect(convertForms.execute('./path', 'app', { forms: ['c'] })).to.be.fulfilled;

      expect(getPropsData.calledOnce).to.be.true;
      expect(getPropsData.args[0][0]).to.be.equal('./path/forms/app/c.properties.json');
      expect(fixXml.calledOnce).to.be.true;
      expect(fixXml.args[0][1]).to.be.deep.equal({ 'var_restrictions': { 'some_prop': 'some_value' } });
      expect(checkVars.calledOnce).to.be.true;
      expect(checkVars.args[0][1]).to.be.deep.equal({ 'some_prop': 'some_value' });
    });
  });
});
