const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const repositoryFactory = rewire('../../src/lib/repository-factory');

describe('repository factory', () => {
  let serverRepo, archiveRepo, error, readline;
  beforeEach(() => {
    serverRepo = sinon.stub();
    archiveRepo = sinon.stub().returns({});
    error = sinon.stub();
    readline = {
      question: sinon.stub().throws('unexpected'),
      keyInYN: sinon.stub().throws('unexpected'),
    };

    repositoryFactory.__set__('ServerRepository', serverRepo);
    repositoryFactory.__set__('ArchiveRepository', archiveRepo);
    repositoryFactory.__set__('error', error);
    repositoryFactory.__set__('readline', readline);
  });
  
  it('multiple destinations yields error', () => {
    const actual = repositoryFactory({ local: true, instance: 'demo' });
    expect(error.args[0][0]).to.include('one of these');
    expect(actual).to.eq(false);
  });

  it('no destination yields error', () => {
    const actual = repositoryFactory({});
    expect(error.args[0][0]).to.include('one of these');
    expect(actual).to.eq(false);
  });
  
  it('--archive', () => {
    const cmdArgs = { archive: true };
    repositoryFactory(cmdArgs);
    expect(archiveRepo.callCount).to.eq(1);
    expect(archiveRepo.args[0][0]).to.eq(cmdArgs);
  });

  describe('--local', () => {
    it('no environment variable has a default', () => {
      repositoryFactory({ local: true });
      expect(serverRepo.callCount).to.eq(1);
      expect(serverRepo.args[0]).to.deep.eq(['http://admin:pass@localhost:5988/medic']);
    });
    
    it('use environment variable', () => {
      repositoryFactory({ local: true }, { COUCH_URL: 'http://user:pwd@localhost:5984/db' });
      expect(serverRepo.callCount).to.eq(1);
      expect(serverRepo.args[0]).to.deep.eq(['http://user:pwd@localhost:5988/medic']);
    });

    it('warn if environment variable targets remote', () => {
      const actual = repositoryFactory({ local: true }, { COUCH_URL: 'http://user:pwd@remote:5984/db' });
      expect(error.args[0][0]).to.include('remote');
      expect(actual).to.eq(false);
    });
  });

  describe('--instance', () => {
    it('with default user', () => {
      readline.question.returns('entered');
      repositoryFactory({ instance: 'inst' });
      expect(serverRepo.callCount).to.eq(1);
      expect(serverRepo.args[0]).to.deep.eq(['https://admin:entered@inst.medicmobile.org/medic']);
    });

    it('with --user', () => {
      readline.question.returns('entered');
      repositoryFactory({ instance: 'inst', user: 'user' });
      expect(serverRepo.callCount).to.eq(1);
      expect(serverRepo.args[0]).to.deep.eq(['https://user:entered@inst.medicmobile.org/medic']);
    });

    it('non-matching instance warning', () => {
      readline.question.returns('entered');
      readline.keyInYN.returns(false);
      const actual = repositoryFactory({ instance: 'something.app' });
      expect(readline.keyInYN.callCount).to.eq(1);
      expect(actual).to.eq(false);
    });
  });

  describe('--url', () => {
    it('basic', () => {
      repositoryFactory({ url: 'https://admin:pwd@url.medicmobile.org/' });
      expect(serverRepo.callCount).to.eq(1);
      expect(serverRepo.args[0]).to.deep.eq(['https://admin:pwd@url.medicmobile.org/medic']);
    });

    it('non-matching instance warning', () => {
      readline.keyInYN.returns(true);
      repositoryFactory({ url: 'https://admin:pwd@url.app.medicmobile.org/' });
      expect(serverRepo.callCount).to.eq(1);
      expect(readline.keyInYN.callCount).to.eq(1);
      expect(serverRepo.args[0]).to.deep.eq(['https://admin:pwd@url.app.medicmobile.org/medic']);
    });
  });

  describe('parseLocalUrl', () => {
    const parseLocalUrl = repositoryFactory.__get__('parseLocalUrl');
    it('basic', () =>
      expect(parseLocalUrl('http://admin:pass@localhost:5988/medic').href).to.eq('http://admin:pass@localhost:5988/'));
    
    it('updates port', () =>
      expect(parseLocalUrl('http://admin:pass@localhost:5984/medic').href).to.eq('http://admin:pass@localhost:5988/'));

    it('ignores path', () =>
      expect(parseLocalUrl('http://admin:pass@localhost:5984/foo').href).to.eq('http://admin:pass@localhost:5988/'));
  });
});