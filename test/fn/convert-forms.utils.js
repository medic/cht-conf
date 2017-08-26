const assert = require('chai').assert;
const fs = require('../../src/lib/sync-fs');
const path = require('path');
const warn = require('../../src/lib/log').warn;


module.exports = {
  testFor: (testName, type) => {

    const convertForms = require(`../../src/fn/convert-${type}-forms`);

    describe(testName, function() {

      this.timeout(30000); // allow time for form conversion

      const projectDir = `build/test/${testName}`;

      // recursively copy forms and expected XML to temp directory, and create
      // tests dynamically

      const srcDir = `test/data/${testName}`;
      const targetDir = `${projectDir}/forms/${type}`;

      fs.mkdir(targetDir);

      fs.recurseFiles(srcDir)
        .forEach(file => {
          if(file.endsWith('.expected.xml')) {

            const expectedXml = file;
            const generatedXml = `${targetDir}/${path.basename(file, '.expected.xml')}.xml`;

            it(`should generate ${generatedXml} as expected`, () => {

              assert.ok(fs.exists(generatedXml), `Missing generated XML file: ${generatedXml}`);
              assert.equal(fs.read(generatedXml), fs.read(expectedXml), `Content of ${generatedXml} was not as expected.`);

            });

          } else if(file.endsWith('.xlsx') ||
              file.endsWith('.properties.json') ||
              path.basename(file) === 'place-types.json') {

            const targetName = path.basename(file);
            fs.copy(file, `${targetDir}/${targetName}`);
          } else {
            warn(`Ignoring unexpected file type: ${file}`);
          }

        });

      before(() => convertForms(projectDir));

    });

  },
};
