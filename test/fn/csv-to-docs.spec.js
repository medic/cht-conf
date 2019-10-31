const { assert } = require('chai');
const sinon = require('sinon');

const csvToDocs = require('../../src/fn/csv-to-docs');
const environment = require('../../src/lib/environment');
const fs = require('../../src/lib/sync-fs');

describe('csv-to-docs', function() {
  this.timeout(30000); // allow time for slow things

  const testDir = `data/csv-to-docs`;

  fs.dirs(testDir)
    .forEach(dir => {

      it(`should convert demo files in ${dir} to expected JSON`, function(done) {
        // given
        dir = `${testDir}/${dir}`;
        sinon.stub(environment, 'pathToProject').get(() => dir);

        // when
        csvToDocs()
          .then(() => {
            const generatedDocsDir = `${dir}/json_docs`;
            const expectedDocsDir  = `${dir}/expected-json_docs`;

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
          })
          .then(done)
          .catch(done);

      });

  });

});

const countFilesInDir = path => fs.fs.readdirSync(path).length;
