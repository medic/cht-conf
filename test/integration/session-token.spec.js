/* eslint-disable no-console */
const chai = require('chai');
const { exec } = require('child_process');
const rpn = require('request-promise-native');
const fs = require('fs-extra');
const path = require('path');
const PouchDB = require('pouchdb-core');

const { expect } = chai;
chai.use(require('chai-as-promised'));

const COUCHDB_USERNAME = 'admin';
const COUCHDB_PASSWORD = 'password';
const COUCHDB_URL = 'http://localhost:6984';

const projectPath = path.join(__dirname, '../test_project');

const createProjectPath = () => {
  fs.ensureDirSync(projectPath);
  fs.writeJsonSync(path.join(projectPath, 'package.json'), {
    name: 'test-project',
    version: '1.0.0',
    dependencies: {
      'cht-conf': 'latest'
    }
  });

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

const cleanProjectPath = () => {
  fs.removeSync(projectPath);
};

const runCliCommand = (command) => {
  return new Promise((resolve, reject) => {
    const cliPath = path.join(__dirname, '../../src/bin/index.js');
    exec(`node ${cliPath} ${command}`, { cwd: projectPath }, (error, stdout, stderr) => {
      if (error) {
        console.error(stderr);
        reject(new Error(stdout));
      } else {
        resolve(stdout);
      }
    });
  });
};

describe('integration/session-token', function() {
  this.timeout(15000);
  
  let sessionToken;
  const action = 'upload-docs --force';

  const initializeProject = async () => {
    await runCliCommand('initialise-project-layout');
  };

  const initializeDatabase = async () => {
    PouchDB.plugin(require('pouchdb-adapter-http'));
    PouchDB.plugin(require('pouchdb-mapreduce'));
    const pouchDb = new PouchDB(`${COUCHDB_URL}/medic`);

    await pouchDb.put({
      _id: '_design/medic',
      views: {}
    });
  };

  const createAdminUser = async () => {
    const pouchDb = new PouchDB(`${COUCHDB_URL}/_users`);
    const userDoc = {
      _id: `org.couchdb.user:${COUCHDB_USERNAME}`,
      name: COUCHDB_USERNAME,
      roles: ['_admin'],
      type: 'user',
      password: COUCHDB_PASSWORD
    };
    await pouchDb.put(userDoc);
  };

  const getSessionToken = async () => {
    const options = {
      method: 'POST',
      uri: 'http://localhost:6984/_session',
      body: {
        name: COUCHDB_USERNAME,
        password: COUCHDB_PASSWORD,
      },
      resolveWithFullResponse: true,
      json: true
    };
  
    try {
      const response = await rpn(options);
      const setCookieHeader = response.headers['set-cookie'];
      // Extract the session token from the set-cookie header
      const sessionCookie = setCookieHeader.find(cookie => cookie.startsWith('AuthSession='));
      const sessionToken = sessionCookie.split(';')[0].split('=')[1];
      return sessionToken;
    } catch (error) {
      throw new Error(`Failed to get session token: ${error.message}`);
    }
  };

  before(async () => {
    createProjectPath();
    await initializeDatabase();
    await initializeProject();
    await createAdminUser();
    sessionToken = await getSessionToken();
  });

  after(cleanProjectPath);

  it('should handle authentication with session token', async () => {
    const stdout = await runCliCommand(
      `--url=${COUCHDB_URL} --session-token=${sessionToken} ${action}`
    );
    expect(stdout).to.contain('INFO upload-docs complete.');
  });

  it('should handle authentication with basic authentication', async () => {
    const url = `http://${COUCHDB_USERNAME}:${COUCHDB_PASSWORD}@localhost:6984`;
    const stdout = await runCliCommand(
      `--url=${url} ${action}`
    );
    expect(stdout).to.contain('INFO upload-docs complete.');
  });

  it('should fail with incorrect session token', async () => {
    const incorrectToken = 'incorrect-token';
    const promiseToExecute = runCliCommand(
      `--url=${COUCHDB_URL} --session-token=${incorrectToken} ${action}`
    );
    await expect(promiseToExecute)
      .to.be.rejected
      .and.eventually.have.property('message')
      // Bad Request: Malformed AuthSession cookie
      .that.contains('INFO Error: Received error code 400');
  });
});
