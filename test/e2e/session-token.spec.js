const { expect } = require('chai');
const rpn = require('request-promise-native');
const fs = require('fs-extra');
const path = require('path');
const PouchDB = require('pouchdb-core');
const { getProjectUrl } = require('./cht-docker-utils');
const {
  cleanupProject,
  initProject,
  getProjectDirectory, runChtConf,
} = require('./cht-conf-utils');

const COUCH_URL_PATTERN = /^(?<prefix>https?:\/\/)(?<user>[^:]+):(?<password>[^@]+)@(?<rootUrl>.*)$/;

const projectPath = getProjectDirectory();

const createProjectPath = async () => {
  await initProject();

  const docs = [
    { _id: 'one', name: 'Document One' },
    { _id: 'two', name: 'Document Two' },
  ];

  const jsonDocsPath = `${projectPath}/json_docs`;
  fs.ensureDirSync(`${projectPath}/json_docs`);

  docs.forEach(doc => {
    fs.writeJsonSync(path.join(jsonDocsPath, `${doc._id}.doc.json`), doc);
  });
};

describe('session-token', () => {
  let authenticatedUrl;
  let unauthenticatedUrl;
  let sessionToken;
  const action = 'upload-docs --force';

  const initializeDatabase = () => {
    PouchDB.plugin(require('pouchdb-adapter-http'));
    PouchDB.plugin(require('pouchdb-mapreduce'));
  };

  const getSessionToken = async (name, password) => {
    const options = {
      method: 'POST',
      uri: `${unauthenticatedUrl}/_session`,
      body: {
        name,
        password,
      },
      resolveWithFullResponse: true,
      json: true
    };
  
    try {
      const response = await rpn(options);
      const setCookieHeader = response.headers['set-cookie'];
      // Extract the session token from the set-cookie header
      const sessionCookie = setCookieHeader.find(cookie => cookie.startsWith('AuthSession='));
      return sessionCookie.split(';')[0].split('=')[1];
    } catch (error) {
      throw new Error(`Failed to get session token: ${error.message}`);
    }
  };

  before(async () => {
    await createProjectPath();
    initializeDatabase();
    authenticatedUrl = await getProjectUrl();
    const { prefix, user, password, rootUrl } = authenticatedUrl.match(COUCH_URL_PATTERN).groups;
    unauthenticatedUrl = `${prefix}${rootUrl}`;
    sessionToken = await getSessionToken(user, password);
  });

  after(cleanupProject);

  it('should handle authentication with session token', async () => {
    const stdout = await runChtConf(action, { url: unauthenticatedUrl, sessionToken });
    expect(stdout).to.contain('INFO upload-docs complete.');
  });

  it('should handle authentication with basic authentication', async () => {
    const stdout = await runChtConf(action, { url: authenticatedUrl });
    expect(stdout).to.contain('INFO upload-docs complete.');
  });

  it('should fail with incorrect session token', async () => {
    const incorrectToken = 'incorrect-token';
    const promiseToExecute = runChtConf(action, { url: unauthenticatedUrl, sessionToken: incorrectToken });
    await expect(promiseToExecute)
      .to.be.rejected
      .and.eventually.have.property('message')
      // Bad Request: Malformed AuthSession cookie
      .that.contains('INFO Error: Received error code 400');
  });
});
