const assert = require('chai').assert;
const fs = require('../../src/lib/sync-fs');
const path = require('path');
const warn = require('../../src/lib/log').warn;

const PROPERTIES_JSON = /\.properties.json/;
const XLS = /\.xlsx$/;
const XML = /\.xml$/;


module.exports = {
  testFor: type => {

    const convertForms = require(`../../src/fn/convert-${type}-forms`);

    describe(`convert-${type}-forms`, function() {

      this.timeout(30000); // allow time for form conversion

      const projectDir = 'build/test';

      // recursively copy forms and expected XML to temp directory, and create
      // tests dynamically

      const srcDir = `test/data/fn/convert-${type}-forms`;
      const formsDir = `${projectDir}/forms/${type}`;

      fs.mkdir(formsDir);

      fs.recurseFiles(srcDir)
        .forEach(file => {
          let targetName = path.basename(file);

          if(XML.test(file)) {

            const srcXml = `${formsDir}/${targetName}`;
            targetName += '.expected';

            it(`should convert ${srcXml} as expected`, () => {

              const expectedXml = `${srcXml}.expected`;
              assert.ok(fs.exists(expectedXml), `Missing expected XML file: ${expectedXml}`);
              assert.equal(fs.read(srcXml), fs.read(expectedXml), `Content of ${srcXml} was not as expected.`);

            });

          } else if(!XLS.test(file) && !PROPERTIES_JSON.test(file)) {
            warn(`Ignoring unexpected file type: ${file}`);
          }

          fs.copy(file, `${formsDir}/${targetName}`);
        });

      before(() => convertForms(projectDir));

    });

  },
};
