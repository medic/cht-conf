const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const checks = rewire('../../../src/lib/convert-forms/handle-field-path-checks');
const { createXformDoc, FORM_ID } = require('../../fn/convert-forms.utils');

describe('Handle field path checks', () => {
  const getXmlString = bindNodes => ({
    model: `
      <instance>
        <data id="${FORM_ID}" prefix="J1!${FORM_ID}!" >
          <inputs>
            <meta>
              <location>
                <lat/>
                <long/>
                <error/>
                <message/>
              </location>
            </meta>
            <user>
              <contact_id/>
              <facility_id/>
              <name/>
            </user>
          </inputs>
        </data>
      </instance>
      ${bindNodes.join('\n')}
    `,
    body: `
      <group appearance="hidden" ref="/data/inputs">
        <group ref="/data/inputs/user">
          <input ref="/data/inputs/user/contact_id">
            <label>NO_LABEL</label>
          </input>
          <input ref="/data/inputs/user/facility_id">
            <label>NO_LABEL</label>
          </input>
          <input ref="/data/inputs/user/name">
            <label>NO_LABEL</label>
          </input>
        </group>
      </group>`
  });

  let bindNodes;
  let xml;
  let props;
  let info;
  let warn;
  beforeEach(() => {
    bindNodes = [
      '<bind nodeset="/data/inputs/user/contact_id" type="string"/>'
    ];
    xml = createXformDoc(getXmlString(bindNodes));

    props = { 'some_prop': 'some_value' };

    info = sinon.spy(checks.__get__('info'));
    checks.__set__('info', info);
    warn = sinon.spy(checks.__get__('warn'));
    checks.__set__('warn', warn);
  });
  afterEach(sinon.restore);

  it('should use DEFAULT when no "field_path_linting" config is being supplied', () => {
    const processPropData = sinon.spy(checks.__get__('processPropData'));
    checks.__set__('processPropData', processPropData);
    props = null;
    expect(() => checks.checkFieldPaths(xml, props)).to.not.throw();
    expect(info.callCount).to.be.equal(2);
    expect(warn.callCount).to.be.equal(0);
    expect(processPropData.calledOnce).to.be.true;
    expect(processPropData.calledWith(null)).to.be.true;
    expect(processPropData.returned({ 
      warnLength: 100, 
      errorLength: 138,
      ignoreSet: new Set(),
      reservedSet: new Set() 
    })).to.be.true;
  });

  it('should pick up var config & if object is empty, use defaults', () => {
    props = {};
    expect(() => checks.checkFieldPaths(xml, props)).to.not.throw();
    expect(info.callCount).to.be.equal(2);
    expect(info.args[0][0]).to.be.equal('No var restriction properties provided, using defaults: ', {
      'warn_length': 100,
      'error_length': 138
    });
    expect(info.args[1][0]).to.be.equal('If you would like to customize these checks,'+
      ' please create a properties JSON file with the structure:', {
      'warn_length': 'positive integer (optional, default: 100, disable by setting to 0)',
      'error_length': 'positive integer (optional, default: 138, disable by setting to 0)',
      'ignore_list': 'array of strings representing nodeset paths to ignore (optional)',
      'reserved_list': 'array of strings representing reserved keywords (optional)'
    });
  });

  it('should pick up var config & skip if warn and error is set to 0', () => {
    props = {
      warn_length: 0,
      error_length: 0
    };
    expect(() => checks.checkFieldPaths(xml, props)).to.not.throw();
    expect(info.calledOnce).to.be.true;
    expect(info.args[0][0]).to.be.equal(
      'Warn and error lengths and reserved list not provided. Skipping field path checks.'
    );
  });

  it('should throw if warn and error has the same value', () => {
    props = { 
      warn_length: 1,
      error_length: 1,
    };
    expect(() => checks.checkFieldPaths(xml, props)).to.throw(
      'The error length needs to be larger than the warn length.'
    );
  });

  it('should throw if the warn/error lengths contain invalid values', () => {
    props = { 
      warn_length: 0.3,
      error_length: '123',
    };
    expect(() => checks.checkFieldPaths(xml, props)).to.throw(
      '"warn_length" must be an integer'
    );
  });

  it('should correctly warn when warn value is <= var length', () => {
    props = {
      warn_length: 1
    };

    expect(() => checks.checkFieldPaths(xml, props)).to.not.throw();
    expect(info.callCount).to.be.equal(0);
    expect(warn.args[0][0]).to.be.equal('The following vars are longer than the acceptable var length (1):\n' +
      '/inputs/user/contact_id\n' +
      'Please consider simplifying nesting or removing verbosity.');
  });

  it('should correctly throw when error value is <= var length', () => {
    props = {
      error_length: 1,
      warn_length: 0
    };

    expect(() => checks.checkFieldPaths(xml, props)).to.throw(
      'The following vars are longer than the acceptable var length (1):\n' +
      '/inputs/user/contact_id\n' +
      'Please simplify nesting or remove verbosity.'
    );
  });

  it('should pass when error value is larger than variable length', () => {
    props = {
      warn_length: 23,
      error_length: 24
    };

    expect(() => checks.checkFieldPaths(xml, props)).to.not.throw();
    expect(info.callCount).to.be.equal(0);
    expect(warn.args[0][0]).to.be.equal(
      'The following vars are longer than the acceptable var length (23):\n' +
      '/inputs/user/contact_id\n' +
      'Please consider simplifying nesting or removing verbosity.'
    );
  });

  it('should pass when warn value is larger than variable length', () => {
    props = {
      warn_length: 29,
      error_length: 30
    };

    expect(() => checks.checkFieldPaths(xml, props)).to.not.throw();
    expect(info.callCount).to.be.equal(0);
    expect(warn.callCount).to.be.equal(0);
  });

  it('should pass when var is ignored despite provided error value', () => {
    props = {
      error_length: 23,
      warn_length: 0,
      ignore_list: ['/data/inputs/user/contact_id']
    };

    bindNodes.push(
      '<bind nodeset="/data/inputs/user/name" type="string"/>'
    );
    xml = createXformDoc(getXmlString(bindNodes));

    expect(() => checks.checkFieldPaths(xml, props)).to.not.throw();
    expect(info.callCount).to.be.equal(0);
    expect(warn.callCount).to.be.equal(0);
  });

  it('should not throw when ignored item does not exist in xml', () => {
    props = {
      error_length: 0,
      warn_length: 0,
      ignore_list: ['123']
    };

    expect(() => checks.checkFieldPaths(xml, props)).to.not.throw();
    expect(info.callCount).to.be.equal(1);
    expect(warn.callCount).to.be.equal(0);
  });

  it('should throw when reserved item exists in xml', () => {
    props = {
      error_length: 30,
      warn_length: 0,
      reserved_list: ['/inputs/user/name']
    };

    bindNodes.push(
      '<bind nodeset="/data/inputs/user/name" type="string"/>'
    );
    xml = createXformDoc(getXmlString(bindNodes));

    expect(() => checks.checkFieldPaths(xml, props)).to.throw(
      'The following reserved entries were found in the form:\n' +
      '/inputs/user/name\n' +
      'Please remove or rename as appropriate.'
    );
    expect(info.callCount).to.be.equal(0);
    expect(warn.callCount).to.be.equal(0);
  });

  it('should throw when ignore list contains invalid entry', () => {
    props = {
      error_length: 30,
      warn_length: 0,
      ignore_list: ['/data/inputs/user/"name`'],
    };

    bindNodes.push(
      '<bind nodeset="/data/inputs/user/name" type="string"/>'
    );
    xml = createXformDoc(getXmlString(bindNodes));

    expect(() => checks.checkFieldPaths(xml, props)).to.throw(
      'The following ignored entries are invalid:\n' +
      '/data/inputs/user/"name`\n' + 
      'Please fix or remove where appropriate.'
    );
    expect(info.callCount).to.be.equal(0);
    expect(warn.callCount).to.be.equal(0);
  });

  it('should throw when reserved list contains invalid entry', () => {
    props = {
      error_length: 30,
      warn_length: 0,
      reserved_list: ['/data/inputs/user/"name`'],
    };

    bindNodes.push(
      '<bind nodeset="/data/inputs/user/name" type="string"/>'
    );
    xml = createXformDoc(getXmlString(bindNodes));

    expect(() => checks.checkFieldPaths(xml, props)).to.throw(
      'The following reserved entries are invalid:\n' +
      '/data/inputs/user/"name`\n' + 
      'Please fix or remove where appropriate.'
    );
    expect(info.callCount).to.be.equal(0);
    expect(warn.callCount).to.be.equal(0);
  });

  it('should throw when reserved item is also in the ignore list', () => {
    props = {
      error_length: 30,
      warn_length: 0,
      ignore_list: ['/data/inputs/user/name'],
      reserved_list: ['/data/inputs/user/name']
    };

    bindNodes.push(
      '<bind nodeset="/data/inputs/user/name" type="string"/>'
    );
    xml = createXformDoc(getXmlString(bindNodes));

    expect(() => checks.checkFieldPaths(xml, props)).to.throw(
      'Overlap between reserved and ignore lists:\n' +
      '/data/inputs/user/name\n' + 
      'Please remove where appropriate.'
    );
    expect(info.callCount).to.be.equal(0);
    expect(warn.callCount).to.be.equal(0);
  });
});
