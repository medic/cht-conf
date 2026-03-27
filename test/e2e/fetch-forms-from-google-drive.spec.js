const { expect } = require('chai');
const fs = require('node:fs');
const {
  cleanupProject,
  initProject,
  runChtConf,
  getProjectDirectory
} = require('./cht-conf-utils');
const path = require('path');

const FORMS = {
  'app/death_report.xlsx': '1azFHCMTMehxuSg_LWOgsJZxrJo0yhseLp9FK4gTT38M',
  'contact/person-create.xlsx': '1VhOPphx4IXyZiGbcevVZwvsvap8WPKHmUjOp8NuWJW8'
};

/**
 * Running this test locally requires OAuth desktop client credentials for a Google Cloud Project.
 * https://docs.communityhealthtoolkit.org/apps/guides/forms/google-drive/
 * Once you have created the OAuth client, configure the following environment variables in your current shell:
 * `CI=true`, `GOOGLE_REDIRECT_URI=http://localhost`, and `GOOGLE_CLIENT_ID=<client_id from OAuth client>`,
 * `GOOGLE_CLIENT_SECRET=<>`. Next, generate a `.gdrive.session.json` file with a valid access token by manually
 * running `cht fetch-forms-from-google-drive`. Copy the `.gdrive.session.json` file to the root of the cht-conf repo.
 * Then you should be able to successfully run `npm test-e2e`.
 *
 * On CI, this test runs with a configured Service Account by preemptively getting an access token and setting it in
 * the `.gdrive.session.json` file. Unfortunately, this means these tests cannot cover the login portion of the
 * functionality, but it does to cover the actual fetching and file writing logic.
 */
describe('fetch-forms-from-google-drive', () => {
  before(initProject);
  after(cleanupProject);

  it('downloads configured forms from Google Drive', async () => {
    const projectDir = getProjectDirectory();
    await fs.promises.writeFile(
      path.join(projectDir, 'forms-on-google-drive.json'),
      JSON.stringify(FORMS, null, 2),
    );

    const sessionJsonSrcPath = path.resolve(__dirname, '../../.gdrive.session.json');
    const sessionJsonDestPath = path.resolve(projectDir, '.gdrive.session.json');
    await fs.promises.copyFile(sessionJsonSrcPath, sessionJsonDestPath);

    await runChtConf('fetch-forms-from-google-drive');

    const formFilePaths = Object
      .keys(FORMS)
      .map(formPath => path.join(projectDir, 'forms', formPath));
    formFilePaths.forEach(formPath => {
      expect(fs.existsSync(formPath)).to.be.true;
    });
  });
});
