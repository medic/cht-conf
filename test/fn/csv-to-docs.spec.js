const { expect } = require('chai');
const sinon = require('sinon');

const csvToDocs = require('../../src/fn/csv-to-docs');
const environment = require('../../src/lib/environment');
const fs = require('../../src/lib/sync-fs');

let clock;

describe('csv-to-docs', function() {
  this.timeout(30000); // allow time for slow things
  
  beforeEach(function () {
    clock = sinon.useFakeTimers();
    csvToDocs.setNOW(new Date().getTime());
  });

  afterEach(function () {
    clock.restore();
    sinon.restore();
  });

  const testDir = `data/csv-to-docs`;

  fs.dirs(testDir)
    .forEach(dir => {

      it(`should convert demo files in ${dir} to expected JSON`, function(done) {
        // given
        dir = `${testDir}/${dir}`;
        sinon.stub(environment, 'pathToProject').get(() => dir);
        const warnIfDirectoryIsNotEmptySpy = sinon.spy(fs, 'warnIfDirectoryIsNotEmpty');
        const warningMsg = `There are already docs in ${dir}.
          New json files will be created along side these existing docs.`;

        // when
        csvToDocs.execute()
          .then(() => {
            const generatedDocsDir = `${dir}/json_docs`;
            const expectedDocsDir  = `${dir}/expected-json_docs`;

            // then
            expect(countFilesInDir(generatedDocsDir)).to.equal(
              countFilesInDir(expectedDocsDir ),
              `Different number of files in ${generatedDocsDir} and ${expectedDocsDir}.`
            );

            fs.recurseFiles(expectedDocsDir)
              .map(file => fs.path.basename(file))
              .forEach(file => {
                const expected  = fs.read(`${expectedDocsDir}/${file}`);
                const generated = fs.read(`${generatedDocsDir}/${file}`);

                // and
                expect(generated).to.equal(expected, `Different contents for "${file}"`);
              });
          })
          .then(done)
          .catch(done);

        expect(warnIfDirectoryIsNotEmptySpy.calledOnceWith(dir, warningMsg));
        expect(warnIfDirectoryIsNotEmptySpy.threw('User aborted execution.')).to.be.false;
      });

    });

});

const countFilesInDir = path => fs.fs.readdirSync(path).length;
