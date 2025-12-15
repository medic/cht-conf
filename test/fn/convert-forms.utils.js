const { expect, assert }  = require('chai');
const sinon = require('sinon');

const environment = require('../../src/lib/environment');
const fs = require('../../src/lib/sync-fs');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');

const FORM_ID = 'abc';
const parser = new DOMParser();
const serializer = new XMLSerializer();

const createXformString = ({
  itext = '',
  primaryInstance = '',
  model = `
    <itext>
      ${itext}
    </itext>
    <instance>
      <data id="${FORM_ID}">
        ${primaryInstance}
      </data>
    </instance>
  `,
  body = ''
}) => `
  <?xml version="1.0"?>
  <h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    <h:head>
      <model>
        ${model}
      </model>
    </h:head>
    <h:body>
      ${body}
    </h:body>
  </h:html>
`;

const createXformDoc = (opts) => parser.parseFromString(createXformString(opts), 'text/xml');
const serializeToString = (doc) => serializer.serializeToString(doc);

module.exports = {
  FORM_ID,
  createXformString,
  createXformDoc,
  serializeToString,
  testFor: (testName, type) => {

    const convertForms = require(`../../src/fn/convert-${type}-forms`);
    describe(testName, function () {

      this.timeout(30000); // allow time for form conversion

      const projectDir = `data/${testName}`;

      // recursively copy forms and expected XML to temp directory, and create
      // tests dynamically

      const expectedDir = `${projectDir}/forms/${type}/expected`;

      fs.recurseFiles(expectedDir).forEach(expectedXml => {

        const generatedXml = expectedXml.replace('/expected/', '/');

        it(`should generate ${generatedXml} as expected`, () => {
          assert.ok(fs.exists(generatedXml), `Missing generated XML file: ${generatedXml}`);
          expect(fs.read(generatedXml)).xml.to.equal(fs.read(expectedXml));
        });

      });

      before(() => {
        sinon.stub(environment, 'pathToProject').get(() => projectDir);
        sinon.stub(environment, 'extraArgs').get(() => undefined);
        return convertForms.execute();
      });

    });

  },
};
