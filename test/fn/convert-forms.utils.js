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

      // recursively copy forms and expected XML to temp directory
      const srcDir = `test/data/fn/convert-${type}-forms`;
      const formsDir = `${projectDir}/forms/${type}`;

      fs.mkdir(formsDir);

      fs.recurseFiles(srcDir)
        .forEach(file => {
          let targetName = path.basename(file);

          if(XML.test(file)) targetName += '.expected';
          else if(!XLS.test(file) && !PROPERTIES_JSON.test(file))
            warn(`Ignoring unexpected file type: ${file}`);

          fs.copy(file, `${formsDir}/${targetName}`);
        });

      convertForms(projectDir)
        .then(() => {

          fs.recurseFiles(formsDir)
            .filter(name => XML.test(name))
            .forEach(xml => {

              it(`should convert ${xml} as expected`, () => {

                const expectedXml = `${xml}.expected`;
                assert.ok(fs.exists(expectedXml), `Missing expected XML file: ${xml}`);
                assert.equal(fs.read(xml), fs.read(expectedXml), `Content of ${xml} was not as expected.`);

              });
            });
          });

    });

  },
};
