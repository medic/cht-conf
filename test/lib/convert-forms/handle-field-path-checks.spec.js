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
  let warn;
  let err;
  beforeEach(() => {
    bindNodes = [
      '<bind nodeset="/data/inputs/user/contact_id" type="string"/>'
    ];
    xml = createXformDoc(getXmlString(bindNodes));

    props = { 'some_prop': 'some_value' };

    warn = sinon.spy(checks.__get__('warn'));
    checks.__set__('warn', warn);
    err = sinon.spy(checks.__get__('err'));
    checks.__set__('err', err);
  });
  afterEach(sinon.restore);

  it('should pick up var config object is empty and throw error', () => {
    props = {};
    expect(() => checks.checkFieldPaths(xml, props)).to.throw('Unable to run field path checks');
    expect(err.calledOnce).to.be.true;
    expect(err.args[0][0]).to.be.equal('If you would like to customize these checks,'+  
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
  });

  it('should throw if warn and error has the same value', () => {
    props = { 
      warn_length: 1,
      error_length: 1,
    };
    expect(() => checks.checkFieldPaths(xml, props)).to.throw(
      '"warn_length" must be less than ref:error_length'
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
    expect(warn.callCount).to.be.equal(0);
  });

  it('should not throw when ignored item does not exist in xml', () => {
    props = {
      error_length: 0,
      warn_length: 0,
      ignore_list: ['123']
    };

    expect(() => checks.checkFieldPaths(xml, props)).to.not.throw();
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
      '"ignore_list[0]" with value "/data/inputs/user/"name`" matches the inverted pattern: /[`\'"]/'
    );
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
      '"reserved_list[0]" with value "/data/inputs/user/"name`" matches the inverted pattern: /[`\'"]/'
    );
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
    expect(warn.callCount).to.be.equal(0);
  });
});
