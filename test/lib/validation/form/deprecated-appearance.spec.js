const { expect } = require('chai');
const { DOMParser } = require('@xmldom/xmldom');
const deprecatedAppearance = require('../../../../src/lib/validation/form/deprecated-appearance');

const domParser = new DOMParser();

const getXml = ({ name = '', age = '', address = '', streetNbr = '', city = '' }) => `
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
            <city/>
            <appearance/>
          </address>
        </data>
      </instance>
      <bind nodeset="/data/name" type="string" />   
      <meta>
        <instanceID/>
      </meta>
    </model>
  </h:head>
  <h:body>
    <input ref="/data/name" appearance="${name}">
      <label>What is the name?</label>
    </input>
    <input ref="/data/age" appearance="${age}">
      <label>What is the age?</label>
    </input>
    <group ref="/data/address" appearance="${address}">
        <input appearance="${streetNbr}" ref="/data/address/street-nbr">
          <label>What is the address?</label>
        </input>
        <input appearance="${city}" ref="/data/address/city">
          <label>What is the city?</label>
        </input>
        <input ref="/data/address/appearance">
          <label>What is the appearance?</label>
        </input>
      </group>
  </h:body>
</h:html>`;

const getXmlDoc = (appearances = {}) => domParser.parseFromString(getXml(appearances));
const xformPath = '/my/form/path/form.xml';

const assertEmpty = (output) => {
  expect(output.warnings).is.empty;
  expect(output.errors, output.errors).is.empty;
};

const LATEST_VERSION = '999.99.99';
const ERROR_HEADER = `Form at ${xformPath} contains fields with the deprecated \`horizontal\`/\`compact\` appearance. ` +
  'These have been deprecated in favor of the `columns` appearance. Please update the following fields:';

describe('deprecated-appearance', () => {
  it(`resolves OK for form with no appearances`, () => {
    return deprecatedAppearance
      .execute({ xformPath, xmlDoc: getXmlDoc(), apiVersion: LATEST_VERSION })
      .then(output => assertEmpty(output));
  });

  it(`resolves OK for form with valid appearances`, () => {
    const appearances = {
      name: 'hidden',
      age: 'columns',
      address: 'field-list',
      streetNbr: 'columns-pack no-buttons',
      city: 'columns-10'
    };
    return deprecatedAppearance
      .execute({ xformPath, xmlDoc: getXmlDoc(appearances), apiVersion: LATEST_VERSION })
      .then(output => assertEmpty(output));
  });

  it(`returns errors for deprecated appearances`, () => {
    const appearances = {
      name: 'horizontal',
      age: 'horizontal-compact',
      address: 'compact',
      streetNbr: 'compact-1',
      city: 'compact-10'
    };
    return deprecatedAppearance
      .execute({ xformPath, xmlDoc: getXmlDoc(appearances), apiVersion: LATEST_VERSION })
      .then(output => {
        expect(output.errors).is.empty;
        expect(output.warnings).to.have.length(6);
        expect(output.warnings[0]).to.equal(ERROR_HEADER);
        expect(output.warnings[1]).to.equal(`  - /data/name: replace [horizontal] with [columns]`);
        expect(output.warnings[2]).to.equal(`  - /data/age: replace [horizontal-compact] with [columns-pack]`);
        expect(output.warnings[3]).to.equal(`  - /data/address: replace [compact] with [columns-pack no-buttons]`);
        expect(output.warnings[4]).to.equal(`  - /data/address/street-nbr: replace [compact-1] with [columns-1 no-buttons]`);
        expect(output.warnings[5]).to.equal(`  - /data/address/city: replace [compact-10] with [columns-10 no-buttons]`);
      });
  });

  it(`returns errors for deprecated appearances when mixed with other appearances`, () => {
    const appearances = {
      name: 'h1 horizontal',
      age: 'horizontal-compact compact-1',
      address: 'field-list compact db-object',
      streetNbr: 'compact-1 hidden',
      city: 'compact-10 compact-9 compact-8 compact-7'
    };
    return deprecatedAppearance
      .execute({ xformPath, xmlDoc: getXmlDoc(appearances), apiVersion: LATEST_VERSION })
      .then(output => {
        expect(output.errors).is.empty;
        expect(output.warnings).to.have.length(6);
        expect(output.warnings[0]).to.equal(ERROR_HEADER);
        expect(output.warnings[1]).to.equal(`  - /data/name: replace [horizontal] with [columns]`);
        expect(output.warnings[2]).to.equal(`  - /data/age: replace [horizontal-compact] with [columns-pack]`);
        expect(output.warnings[3]).to.equal(`  - /data/address: replace [compact] with [columns-pack no-buttons]`);
        expect(output.warnings[4]).to.equal(`  - /data/address/street-nbr: replace [compact-1] with [columns-1 no-buttons]`);
        expect(output.warnings[5]).to.equal(`  - /data/address/city: replace [compact-10] with [columns-10 no-buttons]`);
      });
  });

  it(`resolves OK for deprecated appearances when no api version is available`, () => {
    const appearances = {
      name: 'horizontal',
      age: 'horizontal-compact',
      address: 'compact',
      streetNbr: 'compact-1',
      city: 'compact-10'
    };
    return deprecatedAppearance
      .execute({ xformPath, xmlDoc: getXmlDoc(appearances) })
      .then(output => assertEmpty(output));
  });

  [
    ['horizontal', '3.15.0'],
    ['horizontal-compact', '3.15.0'],
    ['compact', '3.15.0'],
    ['compact-1', '3.15.0'],
  ].forEach(([appearance, apiVersion]) => {
    it(`resolves OK for deprecated [${appearance}] appearance when api version is [${apiVersion}]`, () => {
      const appearances = {
        name: appearance
      };
      return deprecatedAppearance
        .execute({ xformPath, xmlDoc: getXmlDoc(appearances), apiVersion })
        .then(output => assertEmpty(output));
    });
  });

  [
    ['horizontal', '4.0.0', 'columns'],
    ['horizontal-compact', '4.0.0', 'columns-pack'],
    ['compact', '4.0.0', 'columns-pack no-buttons'],
    ['compact-1', '4.0.0', 'columns-1 no-buttons'],
  ].forEach(([appearance, apiVersion, replacement]) => {
    it(`returns error for deprecated [${appearance}] appearance when api version is [${apiVersion}]`, () => {
      const appearances = {
        name: appearance
      };
      return deprecatedAppearance
        .execute({ xformPath, xmlDoc: getXmlDoc(appearances), apiVersion })
        .then(output => {
          expect(output.errors).is.empty;
          expect(output.warnings).to.have.length(2);
          expect(output.warnings[0]).to.equal(ERROR_HEADER);
          expect(output.warnings[1]).to.equal(`  - /data/name: replace [${appearance}] with [${replacement}]`);
        });
    });
  });
});
