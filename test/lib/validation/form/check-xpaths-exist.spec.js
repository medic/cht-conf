const { expect } = require('chai');
const { DOMParser } = require('@xmldom/xmldom');
const checkXPathsExist = require('../../../../src/lib/validation/form/check-xpaths-exist');

const domParser = new DOMParser();

const getXml = (bindData = '', instanceTag = 'instance') => `
<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <h:title>Test</h:title>
    <model>
      <${instanceTag}>
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
      </${instanceTag}>
      <${instanceTag} id="contact-summary"/>
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
  .map(({ name, type, calculate, constraint, readonly, relevant, required }) => {
    const calc = calculate ? `calculate="${calculate}"` : '';
    const cons = constraint ? `constraint="${constraint}"` : '';
    const read = readonly ? `readonly="${readonly}"` : '';
    const rel = relevant ? `relevant="${relevant}"` : '';
    const req = required ? `required="${required}"` : '';
    return `<bind nodeset="${name}" type="${type}" ${calc} ${cons} ${read} ${rel} ${req}/>`;
  })
  .join('');

const getXmlDoc = (fields, instance) => domParser.parseFromString(getXml(createBindData(fields), instance));
const xformPath = '/my/form/path/form.xml';

const assertEmpty = (output) => {
  expect(output.warnings).is.empty;
  expect(output.errors, output.errors).is.empty;
};

const ERROR_HEADER = `Form at ${xformPath} contains invalid XPath expressions `
  + '(absolute or relative paths that refer to a non-existant node):';

describe('check-xpaths-exist', () => {
  [
    'calculate',
    'constraint',
    'readonly',
    'relevant',
    'required'
  ].forEach((attribute) => {
    it(`resolves OK for ${attribute} with valid XPath`, () => {
      const fields = [{ name: '/data/summary/details', type: 'string', [attribute]: '/data/summary/summary_title' }];
      return checkXPathsExist.execute({ xformPath, xmlDoc: getXmlDoc(fields) })
        .then(output => assertEmpty(output));
    });

    it(`resolves OK for ${attribute} with invalid complex XPath`, () => {
      const fields = [{
        name: '/data/summary/details',
        type: 'string',
        [attribute]: '/characters/character[@greeting = $greeting]'
      }];
      return checkXPathsExist.execute({ xformPath, xmlDoc: getXmlDoc(fields) })
        .then(output => assertEmpty(output));
    });

    it(`returns error for ${attribute} with invalid simple XPath`, () => {
      const fields = [{ name: '/data/summary/details', type: 'string', [attribute]: '/data/summary/invalid' }];
      return checkXPathsExist.execute({ xformPath, xmlDoc: getXmlDoc(fields) })
        .then(output => {
          expect(output.warnings).is.empty;

          const expectedErrors = [
            ERROR_HEADER,
            `  - ${attribute} for /data/summary/details contains [/data/summary/invalid]`
          ];
          expect(output.errors).to.deep.equal(expectedErrors);
        });
    });
  });

  [
    '/data',
    '/data/name',
    '../summary_title',
    '../../name',
    '../../address/street-nbr',
    '../../address/../../data',
    `concat(/data/name, 'ebmarah', ../../name)`,
    '0 and explode(/data) + explode(explode(explode(1, 2, 3, explode(), ../../name)))',
    /* eslint-disable max-len */
    `format-date-time(
      if(selected(../summary_title, 'method_lmp'), ../../address/street-nbr,
      if(selected(../summary_title, 'approx_weeks'), date-time(floor(decimal-date-time(today())) - (../../address/street-nbr * 7)),
      if(selected(../summary_title, 'approx_months'), date-time(floor(decimal-date-time(today())) - round(../../address/street-nbr * 30.5)),
      if(selected(/data/summary/summary_title, 'method_edd'), date-time(decimal-date-time(/data/name) - 280), '')
      ))), &quot;%Y-%m-%d&quot;)`
    /* eslint-enable max-len */
  ].forEach(xpath => {
    it(`resolves OK for valid XPath(s) [${xpath}]`, () => {
      const fields = [{ name: '/data/summary/details', type: 'string', calculate: xpath }];
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
    `instance('contact-summary')/context/pregnancy_uuid`,
    `instance(&quot;contact-summary&quot;)/context/pregnancy_uuid`,
    'https://www.google.com/',
    'www.google.com/hello/world',
    `'File Path: /Users/joe/Desktop/myfile.txt is invalid'`,
    '&quot;File Path: /Users/joe/Desktop/myfile.txt is invalid&quot;',
    `/data/name = '/Users/joe/Desktop/myfile.txt'`,
    `/data/name = &quot;/Users/joe/Desktop/myfile.txt&quot;`,
    // Known limitation where the apostrophe in "Joe's" causes the XPath to be ignored.
    `concat(/Users/joe/Desktop/myfile.txt, &quot;Joe's File&quot;)`,
    `concat(&quot;/Users/joe/Desktop/myfile.txt&quot;, &quot;Joe's File&quot;)`,
    `concat('/Users/joe/Desktop/myfile.txt', 'Joe&quot;s File')`,
    `concat(&quot;/Users/joe/Desktop/myfile.txt&quot;, &quot;Joe's File&quot;)`,
    '10/2'
  ].forEach(xpath => {
    it(`resolves OK for invalid complex XPath(s) [${xpath}]`, () => {
      const fields = [{ name: '/data/summary/details', type: 'string', calculate: xpath }];
      return checkXPathsExist.execute({ xformPath, xmlDoc: getXmlDoc(fields) })
        .then(output => assertEmpty(output));
    });
  });

  [
    { expression: '/invalid', invalidXPaths: ['/invalid'] },
    { expression: '/data/invalid', invalidXPaths: ['/data/invalid'] },
    { expression: '../invalid', invalidXPaths: ['../invalid'] },
    { expression: '../../invalid', invalidXPaths: ['../../invalid'] },
    { expression: '../../address/invalid', invalidXPaths: ['../../address/invalid'] },
    { expression: '../../address/../../invalid', invalidXPaths: ['../../address/../../invalid'] },
    {
      expression: `concat(/data/invalid, ../summary_title, ../../invalid)`,
      invalidXPaths: ['/data/invalid', '../../invalid']
    },
    {
      expression: '0 and explode(/data) + explode(explode(explode(1, /invalid, 3, explode(), ../../name)))',
      invalidXPaths: ['/invalid']
    },
    {
      /* eslint-disable max-len */
      expression: `format-date-time(
          if(selected(../invalid, 'method_lmp'), ../../address/street-nbr,
          if(selected(../invalid, 'approx_weeks'), date-time(floor(decimal-date-time(today())) - (../../address/street-nbr * 7)),
          if(selected(../invalid, 'approx_months'), date-time(floor(decimal-date-time(today())) - round(../../address/street-nbr * 30.5)),
          if(selected(/data/summary/invalid, 'method_edd'), date-time(decimal-date-time(/data/name) - 280), '')
          ))), &quot;%Y-%m-%d&quot;)`,
      /* eslint-enable max-len */
      invalidXPaths: ['../invalid', '../invalid', '../invalid', '/data/summary/invalid']
    },
    { expression: 'concat(&quot;hello&quot;, /invalid, &quot;world&quot;)', invalidXPaths: ['/invalid'] },
    { expression: `concat('hello', /invalid, 'world')`, invalidXPaths: ['/invalid'] },
    { expression: `concat('hello', /invalid, &quot;world&quot;)`, invalidXPaths: ['/invalid'] },
    { expression: `instance()/context/pregnancy_uuid`, invalidXPaths: ['/context/pregnancy_uuid'] },
    // The following two are the only known "false-positive" cases where an error is reported when it should not be.
    // They are sufficiently rare edge cases that it should not be a problem. Additionally, the only thing needed to
    // fix these cases is for the string literal containing the XPath to be quoted with the same quote character as
    // the other string literal that follows. So, even if a form hits this case, it can be mitigated easily.
    {
      expression: `concat(&quot;/Users/joe/Desktop/myfile.txt&quot;, 'Joe&quot;s File')`,
      invalidXPaths: ['/Users/joe/Desktop/myfile.txt']
    },
    {
      expression: `concat('/Users/joe/Desktop/myfile.txt', &quot;Joe's File&quot;)`,
      invalidXPaths: ['/Users/joe/Desktop/myfile.txt']
    },
  ].forEach(({ expression, invalidXPaths }) => {
    it(`returns error(s) for invalid simple XPath(s) [${expression}]`, () => {
      const fields = [{ name: '/data/summary/details', type: 'string', calculate: expression }];
      return checkXPathsExist.execute({ xformPath, xmlDoc: getXmlDoc(fields) })
        .then(output => {
          expect(output.warnings).is.empty;
          const expectedErrors = [
            ERROR_HEADER, `  - calculate for /data/summary/details contains [${invalidXPaths.join(', ')}]`
          ];
          expect(output.errors).to.deep.equal(expectedErrors);
        });
    });
  });

  it(`returns errors for invalid simple XPaths on multiple fields`, () => {
    const fields = [
      {
        name: '/data/summary/details',
        type: 'string',
        calculate: `concat(/data/invalid, ../summary_title, ../../invalid)`
      },
      {
        name: '/data/summary/summary_title',
        type: 'string',
        calculate: '/calculate/name',
        constraint: '/constraint/name',
        readonly: '/readonly/name',
        relevant: '/relevant/name',
        required: '/required/name',
      },
      {
        name: '/data/age',
        type: 'string',
        calculate: '/data',
        constraint: '/data/name',
        readonly: 'concat(/data/readonly, ../readonly, ../../readonly)',
        relevant: '/data/summary',
        required: 'concat(/data/required, ../required, ../../required)',
      },
    ];
    return checkXPathsExist.execute({ xformPath, xmlDoc: getXmlDoc(fields) })
      .then(output => {
        expect(output.warnings).is.empty;
        const expectedErrors = [
          ERROR_HEADER,
          `  - calculate for /data/summary/details contains [/data/invalid, ../../invalid]`,
          `  - calculate for /data/summary/summary_title contains [/calculate/name]`,
          `  - constraint for /data/summary/summary_title contains [/constraint/name]`,
          `  - readonly for /data/summary/summary_title contains [/readonly/name]`,
          `  - relevant for /data/summary/summary_title contains [/relevant/name]`,
          `  - required for /data/summary/summary_title contains [/required/name]`,
          `  - readonly for /data/age contains [/data/readonly, ../readonly, ../../readonly]`,
          `  - required for /data/age contains [/data/required, ../required, ../../required]`,
        ];
        expect(output.errors).to.deep.equal(expectedErrors);
      });
  });

  it(`resolves OK for empty bind attributes`, () => {
    const fields = [{
      name: '/data/age',
      type: 'string',
      calculate: ' ',
      constraint: '  ',
      readonly: '   ',
      relevant: '     ',
      required: '      ',
    }];
    return checkXPathsExist.execute({ xformPath, xmlDoc: getXmlDoc(fields) })
      .then(output => assertEmpty(output));
  });

  it(`returns an error for a form without an instance`, () => {
    return checkXPathsExist.execute({ xformPath, xmlDoc: getXmlDoc([], 'not-instance') })
      .then(output => {
        expect(output.warnings).is.empty;
        const expectedErrors = [
          `Error encountered while validating XPaths in form at ${xformPath}: No instance found in form XML.`
        ];
        expect(output.errors).to.deep.equal(expectedErrors);
      });
  });

  it(`returns an error for a bind node with a nodeset that does not exist in the model`, () => {
    const fields = [{ name: '/data/summary/invalid', type: 'string', calculate: '../../name' }];
    return checkXPathsExist.execute({ xformPath, xmlDoc: getXmlDoc(fields) })
      .then(output => {
        expect(output.warnings).is.empty;
        const expectedErrors = [
          `Error encountered while validating XPaths in form at ${xformPath}: `
          + 'Could not find model node referenced by bind nodeset: /data/summary/invalid'
        ];
        expect(output.errors).to.deep.equal(expectedErrors);
      });
  });
});
