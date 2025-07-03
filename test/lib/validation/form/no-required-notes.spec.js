const { expect } = require('chai');
const { DOMParser } = require('@xmldom/xmldom');
const noRequiredNotes = require('../../../../src/lib/validation/form/no-required-notes');

const domParser = new DOMParser();

const getXml = (bindData = '') => `
<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <h:title>Test</h:title>
    <model>
      <instance>
        <data id="ABC" version="2015-06-05">
          <name>Harambe</name>
          <age/>
          <address>
            <street-nbr/>
          </address>
          <summary>
            <summary_title>Summary</summary_title>
            <details/>
          </summary>
        </data>
      </instance>
      <instance id="contact-summary"/>
      ${bindData}
      <meta>
        <instanceID/>
      </meta>
    </model>
  </h:head>
  <h:body>
    <input ref="/data/name">
      <label>What is the name?</label>
    </input>
    <input ref="/data/age">
      <label>What is the age?</label>
    </input>
  </h:body>
</h:html>`;

const createBindData = fields => fields
  .map(({ name, type, calculate, readonly, required }) => {
    const calc = calculate ? `calculate="${calculate}"` : '';
    const read = readonly ? `readonly="${readonly}"` : '';
    const req = required ? `required="${required}"` : '';
    return `<bind nodeset="${name}" type="${type}" ${calc} ${read} ${req}/>`;
  })
  .join('');

const getXmlDoc = (fields, instance) => domParser.parseFromString(getXml(createBindData(fields), instance));
const xformPath = '/my/form/path/form.xml';

const assertEmpty = (output) => {
  expect(output.warnings).is.empty;
  expect(output.errors, output.errors).is.empty;
};

const getExpectedErrorMsg = requiredNotes => {
  return `Form at ${xformPath} contains the following note fields with 'required' ` + 
    `expressions: [${requiredNotes.join(', ')}]`;
};

describe('no-required-notes', () => {
  it('resolves OK for form with no notes', () => {
    return noRequiredNotes.execute({ xformPath, xmlDoc: getXmlDoc([]) })
      .then(output => assertEmpty(output));
  });

  it('resolves OK for note that is not required', () => {
    const fields = [{
      name: '/data/name',
      type: 'string',
      readonly: 'true()',
      required: 'false()'
    }, {
      name: '/data/address/street-nbr',
      type: 'string',
      readonly: 'true()'
    }];
    return noRequiredNotes.execute({ xformPath, xmlDoc: getXmlDoc(fields) })
      .then(output => assertEmpty(output));
  });

  it('resolves OK for calculate that is required', () => {
    const fields = [{
      name: '/data/name',
      type: 'string',
      calculate: 'concat("Hello", "World")',
      readonly: 'true()',
      required: 'true()'
    }];
    return noRequiredNotes.execute({ xformPath, xmlDoc: getXmlDoc(fields) })
      .then(output => assertEmpty(output));
  });

  it('resolves OK for string question that is not readonly', () => {
    const fields = [{
      name: '/data/name',
      type: 'string',
      readonly: 'false()',
      required: 'true()'
    }, {
      name: '/data/address/street-nbr',
      type: 'string',
      readonly: 'false()'
    }];
    return noRequiredNotes.execute({ xformPath, xmlDoc: getXmlDoc(fields) })
      .then(output => assertEmpty(output));
  });

  it('resolves OK for non-string question', () => {
    const fields = [{
      name: '/data/age',
      type: 'int',
      readonly: 'true()',
      required: 'true()'
    }];
    return noRequiredNotes.execute({ xformPath, xmlDoc: getXmlDoc(fields) })
      .then(output => assertEmpty(output));
  });

  it('returns errors for required notes', () => {
    const fields = [{
      name: '/data/name',
      type: 'string',
      readonly: 'true()',
      required: 'true()'
    }, {
      name: '/data/address/street-nbr',
      type: 'string',
      readonly: 'true()',
      calculate: '',
      required: '/data/age > 5'
    }];
    return noRequiredNotes.execute({ xformPath, xmlDoc: getXmlDoc(fields) })
      .then(output => {
        expect(output.warnings).is.empty;
        expect(output.errors).to.deep.equal([getExpectedErrorMsg(fields.map(f => f.name))]);
      });
  });
});
