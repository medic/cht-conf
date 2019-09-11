const assert = require('chai').assert;
const fs = require('../../src/lib/sync-fs');


module.exports = {
  testFor: (testName, type) => {

    const convertForms = require(`../../src/fn/convert-${type}-forms`);

    describe(testName, function() {

      this.timeout(30000); // allow time for form conversion

      const projectDir = `data/${testName}`;

      // recursively copy forms and expected XML to temp directory, and create
      // tests dynamically

      const expectedDir = `${projectDir}/forms/${type}/expected`;

      fs.recurseFiles(expectedDir).forEach(expectedXml => {

        const generatedXml = expectedXml.replace('/expected/', '/');

        it(`should generate ${generatedXml} as expected`, () => {
          assert.ok(fs.exists(generatedXml), `Missing generated XML file: ${generatedXml}`);
          assert.equal(fs.read(generatedXml), fs.read(expectedXml), `Content of ${generatedXml} was not as expected.`);
        });

      });

      before(() => convertForms(projectDir));

    });

  },
};
