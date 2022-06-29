const { expect } = require('chai');
const { DOMParser } = require('@xmldom/xmldom');
const checkXPathsExist = require('../../../../src/lib/validation/form/check-xpaths-exist');

const domParser = new DOMParser();

const getXml = (bindData = '') => `
<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <h:title>No Instance ID</h:title>
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

const createBindData = fields =>
  fields
    .map(({ name, type, calculate }) => {
      const calc = calculate ? `calculate="${calculate}"` : '';
      return `<bind nodeset="${name}" type="${type}" ${calc}/>`;
    })
    .join('');

const getXmlDoc = (fields) => domParser.parseFromString(getXml(createBindData(fields)));
const xformPath = '/my/form/path/form.xml';

const assertEmpty = (output) => {
  expect(output.warnings).is.empty;
  expect(output.errors, output.errors).is.empty;
};


describe('check-xpaths-exist', () => {
  [
    'calculate',
    'constraint',
    'readonly',
    'relevant',
    'required'
  ].forEach((attribute) => {
    [
      '/data',
      '/data/name',
      '/data/summary/summary_title',
      '../summary_title',
      '../../name',
      '../../address/street-nbr',
      '../../address/../../data',
      `concat(/data/name, 'ebmarah', ../../name)`,
      '0 and explode(/data) + explode(explode(explode(1, 2, 3, explode(), ../../name)))'
    ].forEach(xpath => {
      it(`resolves OK for ${attribute} with valid XPath(s) [${xpath}]`, () => {
        const fields = [ { name: '/data/summary/details', type: 'string', [attribute]: xpath } ];
        return checkXPathsExist.execute({ xformPath, xmlDoc: getXmlDoc(fields) })
          .then(output => assertEmpty(output));
      });
    });

    [
      `'coalesce(self::*, '../summary_title')'`,
      'child::*/attribute::*',
      'bookstore/*/title',
      'book/*/last-name',
      '*/*',
      '@*',
      '@my:*',
      'my:*',
      '/model/instance[1]/*//*[@template] | /model/instance[1]/*//*[@jr:template]',
      `/bk:books/bk:book[@name = 'Harry Potter and the Half-Blood Prince']/hp:characters`,
      '/bk:book/hp:characters',
      '/characters/character[@greeting = $greeting]',
      `/model/instance[1]/nested_repeats/kids/has_kids='2'`,
      '/data/p[2] * /data/p[3]',
      'ancestor-or-self::* /ancestor-or-self::*',
      'author',
      'first.name',
      '//author',
      'author/first-name',
      'bookstore//title',
      'bookstore//book/excerpt//emph',
      './/title',
      '@style',
      'price/@exchange',
    ].forEach(xpath => {
      it(`resolves OK for ${attribute} with invalid complex XPath(s) [${xpath}]`, () => {
        const fields = [ { name: '/data/summary/details', type: 'string', [attribute]: xpath } ];
        return checkXPathsExist.execute({ xformPath, xmlDoc: getXmlDoc(fields) })
          .then(output => assertEmpty(output));
      });
    });


  });
});

// TODO include test where calculate/etc exist  but are empty
