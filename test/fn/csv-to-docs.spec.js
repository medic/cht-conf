const assert = require('chai').assert;
const fs = require('../../src/lib/sync-fs');
const ncp = require('ncp');

const csvToDocs = require('../../src/fn/csv-to-docs');

describe('csv-to-docs', function() {

  it('should convert demo files to expected JSON', function(done) {
    this.timeout(30000); // allow time for slow things

    // given
    const srcDir = `test/data/csv-to-docs`;
    const testDir = `build/test/csv-to-docs`;
    fs.mkdir(testDir);

    ncp(srcDir, testDir, function(err) {
      if(err) done(err);

      // when
      csvToDocs(testDir, 'http://admin:pass@localhost:5988/medic')
        .then(() => {
          const generatedDocsDir = `${testDir}/json_docs`;
          const expectedDocsDir  = `${testDir}/expected-json_docs`;

          // then
          assert.equal(countFilesInDir(generatedDocsDir),
                       countFilesInDir(expectedDocsDir ),
                       `Different number of files in ${generatedDocsDir} and ${expectedDocsDir}.`);

          fs.recurseFiles(expectedDocsDir)
            .map(file => fs.path.basename(file))
            .forEach(file => {
              const expected  = fs.read(`${expectedDocsDir}/${file}`);
              const generated = fs.read(`${generatedDocsDir}/${file}`);

              // and
              assert.equal(generated, expected);
            });

          done();
        })
        .catch(done);

    });

  });

});

const countFilesInDir = path => fs.fs.readdirSync(path).length;
