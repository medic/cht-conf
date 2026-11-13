const { expect } = require('chai');
const { DOMParser } = require('@xmldom/xmldom');
const deprecatedTelType = require('../../../../src/lib/validation/form/deprecated-tel-type');

const domParser = new DOMParser();

// Simple XML helper - only focuses on what we need to test: bind elements with type attributes
const getXml = ({ phoneType = 'string', altPhoneType = 'string', nameType = 'string' }) => `
<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml">
  <h:head>
    <h:title>Test Form</h:title>
    <model>
      <instance>
        <data>
          <phone/>
          <phone_alternate/>
          <name/>
        </data>
      </instance>
      <bind nodeset="/data/phone" type="${phoneType}" />
      <bind nodeset="/data/phone_alternate" type="${altPhoneType}" />
      <bind nodeset="/data/name" type="${nameType}" />
    </model>
  </h:head>
  <h:body>
    <input ref="/data/phone">
      <label>Phone</label>
    </input>
    <input ref="/data/phone_alternate">
      <label>Alt Phone</label>
    </input>
    <input ref="/data/name">
      <label>Name</label>
    </input>
  </h:body>
</h:html>`;

const LATEST_VERSION = '999.99.99';

const getXmlDoc = (types = {}) => domParser.parseFromString(getXml(types));
const xformPath = '/my/form/path/form.xml';

const assertEmpty = (output) => {
  expect(output.warnings).is.empty;
  expect(output.errors).is.empty;
};

describe('deprecated-tel-type', () => {
  it('resolves OK when no tel fields', () => {
    return deprecatedTelType
      .execute({xformPath, xmlDoc: getXmlDoc(), apiVersion: LATEST_VERSION})
      .then(output => assertEmpty(output));
  });

  it('resolves OK when no API version', () =>{
    const types = {
      phoneType: 'tel',
      altPhoneType: 'tel',
      nameType: 'string'
    };
    return deprecatedTelType
      .execute({xformPath, xmlDoc: getXmlDoc(types)})
      .then(output => assertEmpty(output));
  });

  it('resolves OK when API version < 4.11.0', () =>{
    const types = {
      phoneType: 'tel',
      altPhoneType: 'tel',
      nameType: 'string'
    };
    return deprecatedTelType
      .execute({xformPath, xmlDoc: getXmlDoc(types), apiVersion: '4.10.9'})
      .then(output => assertEmpty(output));
  });

  it('returns warning for tel fields', () =>{
    const types = {
      phoneType: 'tel',
      altPhoneType: 'tel',
      nameType: 'string'
    };
    return deprecatedTelType
      .execute({xformPath, xmlDoc: getXmlDoc(types), apiVersion: LATEST_VERSION})
      .then(output => {
        expect(output.warnings[0]).to.equal(`Form at /my/form/path/form.xml contains the following phone number fields with the deprecated 'tel' type [/data/phone, /data/phone_alternate]. Follow the documentation to update these fields to the supported type:\nhttps://docs.communityhealthtoolkit.org/building/forms/app/#phone-number-input`);
      });
  });

  it('ignores non-tel fields', () =>{
    const types = {
      phoneType: 'tel',
      altPhoneType: 'string',
      nameType: 'string'
    };
    return deprecatedTelType
      .execute({xformPath, xmlDoc: getXmlDoc(types), apiVersion: LATEST_VERSION})
      .then(output => {
        expect(output.warnings[0]).to.equal(`Form at /my/form/path/form.xml contains the following phone number fields with the deprecated 'tel' type [/data/phone]. Follow the documentation to update these fields to the supported type:\nhttps://docs.communityhealthtoolkit.org/building/forms/app/#phone-number-input`);
      });
  });
});


