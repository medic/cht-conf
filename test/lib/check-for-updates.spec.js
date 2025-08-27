const sinon = require('sinon');
const chai = require('chai');
const { expect } = chai;
const chaiAsPromised = require('chai-as-promised');
const request = require('request-promise-native');
const log = require('../../src/lib/log');
const current = require('../../package.json').version;
const checkForUpdates = require('../../src/lib/check-for-updates');

chai.use(chaiAsPromised);

describe('check-for-updates', () => {
  let requestStub;
  let warnSpy;
  let infoSpy;

  beforeEach(() => {
    requestStub = sinon.stub(request, 'get');
    warnSpy = sinon.spy(log, 'warn');
    infoSpy = sinon.spy(log, 'info');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should warn when a new version is available on a default (non-fatal) check', () => {
    const newerVersion = '99.0.0';
    const fakeResponse = JSON.stringify({ 'dist-tags': { latest: newerVersion } });
    requestStub.resolves(fakeResponse);

    return checkForUpdates({ nonFatal: true }).then(() => {
      expect(warnSpy.callCount).to.equal(1);
      expect(warnSpy.args[0][0]).to.include('New version available!');
    });
  });

  it('should throw an error when a new version is available on an explicit (fatal) check', () => {
    const newerVersion = '99.0.0';
    const fakeResponse = JSON.stringify({ 'dist-tags': { latest: newerVersion } });
    requestStub.resolves(fakeResponse);

    const promise = checkForUpdates({ nonFatal: false });
    return expect(promise).to.be.rejectedWith('You are not running the latest version of cht-conf!');
  });

  it('should inform the user when they are up-to-date on an explicit check', () => {
    const fakeResponse = JSON.stringify({ 'dist-tags': { latest: current } });
    requestStub.resolves(fakeResponse);

    return checkForUpdates({ nonFatal: false }).then(() => {
      expect(infoSpy.callCount).to.equal(1);
      expect(infoSpy.args[0][0]).to.include('You are already on the latest version');
    });
  });

  it('should warn but not throw an error on a network failure during a default (non-fatal) check', () => {
    requestStub.rejects(new Error('Network Error'));

    return checkForUpdates({ nonFatal: true }).then(() => {
      expect(warnSpy.callCount).to.equal(1);
      expect(warnSpy.args[0][0]).to.include('Could not check NPM for updates: Network Error');
    });
  });

  it('should throw an error on a network failure during an explicit check', () => {
    requestStub.rejects(new Error('Network Error'));

    const promise = checkForUpdates({ nonFatal: false });
    return expect(promise).to.be.rejectedWith('Network Error');
  });
});
