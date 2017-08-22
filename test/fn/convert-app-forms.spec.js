const assert = require('chai').assert;
const fs = require('../../src/lib/sync-fs');
const path = require('path');
const warn = require('../../src/lib/log').warn;

const convertAppForms = require('../../src/fn/convert-app-forms');

const PROPERTIES_JSON = /\.properties.json/;
const XLS = /\.xlsx$/;
const XML = /\.xml$/;

describe('convert-app-forms', () => {
  let projectDir;
  let testId = 0;

  beforeEach(() => {
    // recursively copy forms and expected XML to temp directory
    const srcDir = 'test/data/fn/convert-app-forms';
    projectDir = 'build/test/' + (++testId);
    const appFormsDir = `${projectDir}/forms/app`;

    fs.mkdir(appFormsDir);

    fs.recurseFiles(srcDir)
      .forEach(file => {
        let targetName = path.basename(file);

        if(XML.test(file)) targetName += '.expected';
        else if(!XLS.test(file) && !PROPERTIES_JSON.test(file))
          warn(`Ignoring unexpected file type: ${file}`);

        fs.copy(file, `${appFormsDir}/${targetName}`);
      });
  });

  it('should convert app forms in-line with examples', function() {
    // given
    this.timeout(30000);

    // when
    return convertAppForms(projectDir)

      // then
      .then(() => fs.recurseFiles(`${projectDir}/forms/app`)
        .filter(name => XML.test(name))
        .forEach(xml => {
          const expectedXml = `${xml}.expected`;
          assert.ok(fs.exists(expectedXml), `Missing expected XML file: ${xml}`);
          assert.equal(fs.read(xml), fs.read(expectedXml), `Content of ${xml} was not as expected.`);
        }));
  });
});
