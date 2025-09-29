const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');
const url = require('url');

const apiUrlLib = rewire('../../src/lib/get-api-url');
const userPrompt = rewire('../../src/lib/user-prompt');

describe('get-api-url', () => {
  let readline;
  beforeEach(() => {
    readline = {
      question: sinon.stub().throws('unexpected'),
      keyInYN: sinon.stub().throws('unexpected'),
    };
    userPrompt.__set__('readline', readline);
    apiUrlLib.__set__('userPrompt', userPrompt);
  });

  it('multiple destinations yields error', () => {
    const actual = () => apiUrlLib.getApiUrl({ local: true, instance: 'demo' });
    expect(actual).to.throw('One of these');
  });

  it('no destination yields error', () => {
    const actual = () => apiUrlLib.getApiUrl({});
    expect(actual).to.throw('One of these');
  });

  describe('--local', () => {
    it('no environment variable has a default', () => {
      const actual = apiUrlLib.getApiUrl({ local: true });
      expect(actual).to.deep.equal(new url.URL('http://admin:pass@localhost:5988/medic'));
    });

    it('use environment variable', () => {
      const actual = apiUrlLib.getApiUrl({ local: true }, { COUCH_URL: 'http://user:pwd@localhost:5984/db' });
      expect(actual).to.deep.equal(new url.URL('http://user:pwd@127.0.0.1:5988/medic'));
    });

    it('use environment variable 127.0.0.1', () => {
      const actual = apiUrlLib.getApiUrl({ local: true }, { COUCH_URL: 'http://user:pwd@127.0.0.1:5984/db' });
      expect(actual).to.deep.equal(new url.URL('http://user:pwd@127.0.0.1:5988/medic'));
    });

    it('warn if environment variable targets remote', () => {
      const actual = () => apiUrlLib.getApiUrl({ local: true }, { COUCH_URL: 'http://user:pwd@remote:5984/db' });
      expect(actual).to.throw('remote');
    });
  });

  describe('--instance', () => {
    it('with default user', () => {
      readline.question.returns('entered');
      const actual = apiUrlLib.getApiUrl({ instance: 'inst' });
      expect(actual).to.deep.equal(new url.URL('https://admin:entered@inst.medicmobile.org/medic'));
    });

    it('with --user', () => {
      readline.question.returns('entered');
      const actual = apiUrlLib.getApiUrl({ instance: 'inst', user: 'user' });
      expect(actual).to.deep.equal(new url.URL('https://user:entered@inst.medicmobile.org/medic'));
    });
  });

  describe('--url', () => {
    it('basic', () => {
      const actual = apiUrlLib.getApiUrl({ url: 'https://admin:pwd@url.medicmobile.org/' });
      expect(actual).to.deep.equal(new url.URL('https://admin:pwd@url.medicmobile.org/medic'));
    });
  });

  describe('parseLocalUrl', () => {
    const parseLocalUrl = apiUrlLib.__get__('parseLocalUrl');
    it('basic', () =>
      expect(parseLocalUrl('http://admin:pass@localhost:5988/medic').href).to.eq('http://admin:pass@127.0.0.1:5988/'));

    it('updates port', () =>
      expect(parseLocalUrl('http://admin:pass@localhost:5984/medic').href).to.eq('http://admin:pass@127.0.0.1:5988/'));

    it('ignores path', () =>
      expect(parseLocalUrl('http://admin:pass@localhost:5984/foo').href).to.eq('http://admin:pass@127.0.0.1:5988/'));
  });

  describe('isLocalhost', () => {
    it('should return true for localhost', () => {
      expect(apiUrlLib.isLocalhost(new url.URL('http://admin:pass@localhost/medic'))).to.be.true;
      expect(apiUrlLib.isLocalhost(new url.URL('http://admin:pass@localhost:5988/medic'))).to.be.true;
      expect(apiUrlLib.isLocalhost(new url.URL('https://admin:pass@localhost/medic'))).to.be.true;
      expect(apiUrlLib.isLocalhost(new url.URL('https://admin:pass@localhost/whatever'))).to.be.true;
    });

    it('should return true for 127.0.0.x', () => {
      expect(apiUrlLib.isLocalhost(new url.URL('http://admin:pass@127.0.0.1/medic'))).to.be.true;
      expect(apiUrlLib.isLocalhost(new url.URL('http://admin:pass@127.0.0.3/medic'))).to.be.true;
      expect(apiUrlLib.isLocalhost(new url.URL('http://admin:pass@127.0.0.1:5988/medic'))).to.be.true;
      expect(apiUrlLib.isLocalhost(new url.URL('http://admin:pass@127.0.0.13:5988/medic'))).to.be.true;
      expect(apiUrlLib.isLocalhost(new url.URL('https://admin:pass@127.0.0.1/medic'))).to.be.true;
      expect(apiUrlLib.isLocalhost(new url.URL('https://admin:pass@127.0.0.232/medic'))).to.be.true;
      expect(apiUrlLib.isLocalhost(new url.URL('https://admin:pass@127.0.0.22/whatever'))).to.be.true;
    });

    it('should return false for anything else', () => {
      expect(apiUrlLib.isLocalhost(new url.URL('http://admin:pass@host/medic'))).to.be.false;
      expect(apiUrlLib.isLocalhost(new url.URL('http://admin:pass@notlocalhost/medic'))).to.be.false;
      expect(apiUrlLib.isLocalhost(new url.URL('http://admin:pass@127.1.0.9/medic'))).to.be.false;
      expect(apiUrlLib.isLocalhost(new url.URL('http://admin:pass@192.168.1.0/medic'))).to.be.false;
    });
  });
});
