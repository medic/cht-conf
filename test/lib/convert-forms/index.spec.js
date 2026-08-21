const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const fs = require('../../../src/lib/sync-fs');
const nodeFs = require('node:fs');
const path = require('path');
const log = require('../../../src/lib/log');
const { LEVEL_NONE } = log;
const { createXformString, FORM_ID } = require('../../fn/convert-forms.utils');
const convertForms = rewire('./../../../src/lib/convert-forms');

const XLS2XFORM = path.join(__dirname, '..', '..', '..', 'bin', 'xls2xform-medic');

const createXform = ({ formId = FORM_ID, primaryInstance = '', itext, body = '<group ref="/data/init"/>' } = {}) => {
  const itextSection = itext ? `<itext>${itext}</itext>` : '';
  return createXformString({
    model: `${itextSection}<instance><data id="${formId}">${primaryInstance}</data></instance>`,
    body,
  });
};

const formIdFromSwpPath = (swpPath) => swpPath.match(/([^/]+)\.xml\.swp$/)[1];

describe('convert-forms', () => {
  let mockExec;
  beforeEach(() => {
    mockExec = sinon.stub();
    convertForms.__set__('warn', sinon.stub(log, 'warn'));
    convertForms.__set__('exec', mockExec);
    convertForms.__set__('getPropsData', sinon.stub());

    sinon.stub(fs, 'readdir').returns(['a.xml', 'b.xlsx', 'c.xlsx']);
    sinon.stub(fs, 'exists').returns(true);
    sinon.stub(fs, 'readJson').returns({});
    sinon.stub(fs, 'read').callsFake(swpPath => createXform({ formId: formIdFromSwpPath(swpPath) }));
    sinon.stub(fs, 'write');
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

  describe('fixing the xml', () => {
    const swpPath = `./path/forms/app/${FORM_ID}.xml.swp`;

    beforeEach(() => {
      fs.readdir.returns([`${FORM_ID}.xlsx`]);
      mockExec.resolves(JSON.stringify({ code: 100 }));
    });

    const convertForm = async (xform = createXform(), options) => {
      fs.read.returns(xform);

      await convertForms.execute('./path', 'app', options);

      expect(fs.read.args).to.deep.equal([[swpPath]]);
      expect(fs.write.args).to.have.lengthOf(1);
      expect(fs.write.args[0][0]).to.equal(swpPath);
      return fs.write.args[0][1];
    };

    it('formats the xml and writes it to the swp file', async () => {
      const primaryInstance = '<init><name/></init><contact><parent/></contact>';

      const xml = await convertForm(createXform({ primaryInstance }));

      expect(xml).xml.to.equal(createXform({ primaryInstance }));
      expect(nodeFs.renameSync.args).to.deep.equal([[swpPath, `./path/forms/app/${FORM_ID}.xml`]]);
    });

    it('adds the meta section to the inputs group', async () => {
      const xml = await convertForm(createXform({ primaryInstance: '<inputs><source/></inputs>' }));

      expect(xml).xml.to.equal(createXform({
        primaryInstance: `
          <inputs>
            <meta>
              <location>
                <lat/>
                <long/>
                <error/>
                <message/>
              </location>
            </meta>
            <source/>
          </inputs>
        `
      }));
    });

    it('removes the default language when converting for enketo', async () => {
      const translation = '<text id="a"><value>Hello</value></text>';

      const xml = await convertForm(
        createXform({ itext: `<translation lang="en" default="true()">${translation}</translation>` }),
        { enketo: true }
      );

      expect(xml).xml.to.equal(createXform({ itext: `<translation lang="en">${translation}</translation>` }));
    });

    it('keeps the default language when not converting for enketo', async () => {
      const itext = '<translation lang="en" default="true()"><text id="a"><value>Hello</value></text></translation>';

      const xml = await convertForm(createXform({ itext }));

      expect(xml).xml.to.equal(createXform({ itext }));
    });

    it('tags the hidden fields listed in the properties json', async () => {
      fs.readJson.returns({ hidden_fields: ['name', 'age'] });

      const xml = await convertForm(createXform({ primaryInstance: '<name/><age/><other/>' }));

      expect(xml).xml.to.equal(createXform({
        primaryInstance: '<name tag="hidden"/><age tag="hidden"/><other/>'
      }));
      expect(fs.readJson.args).to.deep.equal([[`./path/forms/app/${FORM_ID}.properties.json`]]);
    });

    it('warns when the form uses the deprecated repeat-relevant', async () => {
      await convertForm(createXform({ body: '<group ref="/data/init" appearance="repeat-relevant"/>' }));

      expect(log.warn.args).to.deep.equal([[
        'From webapp version 2.14.0, repeat-relevant is no longer required.  ' +
        'See https://github.com/medic/cht-core/issues/3449 for more info.'
      ]]);
    });

    it('domTransformer is applied to the parsed document', async () => {
      const domTransformer = sinon.stub().callsFake((xmlDoc) => {
        const init = xmlDoc.getElementsByTagName('init')[0];
        const contact = xmlDoc.getElementsByTagName('contact')[0];
        init.appendChild(contact);
      });

      const xml = await convertForm(
        createXform({ primaryInstance: '<init><name/></init><contact><parent/></contact>' }),
        { domTransformer }
      );

      expect(xml).xml.to.equal(createXform({
        primaryInstance: '<init><name/><contact><parent/></contact></init>'
      }));
      expect(domTransformer.calledOnce).to.be.true;
      const [xmlDoc, calledPath] = domTransformer.args[0];
      expect(xmlDoc.documentElement.nodeName).to.equal('h:html');
      expect(calledPath).to.equal(swpPath);
    });
  });
});
