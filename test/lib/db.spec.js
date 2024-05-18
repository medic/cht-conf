const { expect } = require('chai');
const { Headers } = require('cross-fetch');
const sinon = require('sinon');
const rewire = require('rewire');

const db = rewire('../../src/lib/db');
const environment = require('../../src/lib/environment');

describe('PouchDB', () => {
  describe('authentication with session cookie', () => {
    let sessionCookieAwareFetch;
    const sessionToken = 'sessionTokenValue';

    beforeEach(() => {
      sinon.stub(environment, 'isArchiveMode').get(() => false);
      sinon.stub(environment, 'sessionToken').get(() => sessionToken);
      sinon.stub(environment, 'apiUrl').get(() => 'http://example.com/db-name');

      sessionCookieAwareFetch = db.__get__('sessionCookieAwareFetch');
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should include session token in PouchDB fetch headers(Headers) if available', async () => {
      const fetch = sessionCookieAwareFetch();
      const options = { headers: new Headers() };

      await fetch('http://example.com/db-name', options);
      expect(options.headers.get('Cookie')).to.contains(sessionToken);
    });

    it('should include session token in PouchDB fetch headers(object) if available', async () => {
      const fetch = sessionCookieAwareFetch();
      const options = { headers: {} };

      await fetch('http://example.com/db-name', options);
      expect(options.headers.Cookie).to.contains(sessionToken);
    });

    it('should not include session token in PouchDB fetch headers if not available', async () => {
      sinon.stub(environment, 'sessionToken').get(() => undefined);

      const fetch = sessionCookieAwareFetch();
      const options = { headers: new Headers() };

      await fetch('http://example.com/db-name', options);
      expect(options.headers.get('Cookie')).to.be.empty;
    });
  });
});
