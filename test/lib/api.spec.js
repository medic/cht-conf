const { assert, expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

let api = rewire('../../src/lib/api');
const environment = require('../../src/lib/environment');
const log = require('../../src/lib/log');

describe('api', () => {
  let mockRequest;
  beforeEach(() => {
    mockRequest = sinon.stub().resolves();
    api.__set__('request', mockRequest);
    sinon.stub(environment, 'apiUrl').get(() => 'http://example.com/db-name');
  });
  afterEach(() => {
    sinon.restore();
    api = rewire('../../src/lib/api');
  });

  it('defaults to live requests', async () => {
    sinon.stub(environment, 'isArchiveMode').get(() => false);
    await api().version();
    expect(mockRequest.callCount).to.eq(1);
  });

  describe('formsValidate', async () => {

    it('should fail if validate endpoint returns invalid JSON', async () => {
      sinon.stub(environment, 'isArchiveMode').get(() => false);
      mockRequest = sinon.stub().resolves('--NOT JSON--');
      api.__set__('request', mockRequest);
      try {
        await api().formsValidate('<xml></xml>');
        assert.fail('Expected assertion');
      } catch (e) {
        expect(e.message).to.eq(
          'Invalid JSON response validating XForm against the API: --NOT JSON--');
      }
    });

    it('should not fail if validate endpoint does not exist', async () => {
      sinon.stub(environment, 'isArchiveMode').get(() => false);
      mockRequest = sinon.stub().rejects({name: 'StatusCodeError', statusCode: 404});
      api.__set__('request', mockRequest);
      let result = await api().formsValidate('<xml></xml>');
      expect(result).to.deep.eq({ok: true, formsValidateEndpointFound: false});
      expect(mockRequest.callCount).to.eq(1);
      // second call
      result = await api().formsValidate('<xml>Another XML</xml>');
      expect(result).to.deep.eq({ok: true, formsValidateEndpointFound: false});
      expect(mockRequest.callCount).to.eq(1); // still HTTP client called only once
    });

    it('should not call API when --archive mode and response still ok', async () => {
      mockRequest = sinon.spy();
      api.__set__('request', mockRequest);
      api.__set__('environment', sinon.stub({ isArchiveMode: true }));
      let result = await api().formsValidate('<xml></xml>');
      expect(result).to.deep.eq({ok: true});
      expect(mockRequest.callCount).to.eq(0);
      // second call
      result = await api().formsValidate('<xml>Another XML</xml>');
      expect(result).to.deep.eq({ok: true});
      expect(mockRequest.callCount).to.eq(0); // still HTTP not called even once
    });
  });

  describe('archive mode', async () => {
    beforeEach(() => sinon.stub(environment, 'isArchiveMode').get(() => true));
    
    it('does not initiate requests to api', async () => {
      await api().version();
      expect(mockRequest.callCount).to.eq(0);
    });

    it('throws not supported for undefined interfaces', () => {
      expect(api().getAppSettings).to.throw('getAppSettings not supported in --archive mode');
    });
  });

  describe('updateAppSettings', async() => {

    it('changes settings on server', async () => {
      sinon.stub(environment, 'isArchiveMode').get(() => false);
      mockRequest.onCall(0).resolves([]);
      mockRequest.onCall(1).resolves({ ok: true });
      const response = await api().updateAppSettings(JSON.stringify({
        transitions: [ 'test' ]
      }));
      expect(response.ok).to.equal(true);
      expect(mockRequest.callCount).to.equal(2);
      expect(mockRequest.args[1][0].body).to.equal('{"transitions":["test"]}');
    });

    it('throws error when server throws', async () => {
      sinon.stub(environment, 'isArchiveMode').get(() => false);
      mockRequest.onCall(0).resolves([]);
      mockRequest.onCall(1).rejects({ error: 'random' });
      try {
        await api().updateAppSettings(JSON.stringify({}));
      } catch(err) {
        expect(err.error).to.equal('random');
        expect(mockRequest.callCount).to.equal(1);
      }
    });

    it('logs and continues when using deprecated transitions', async () => {
      sinon.stub(environment, 'isArchiveMode').get(() => false);
      sinon.stub(log, 'warn');
      mockRequest.onCall(0).resolves([ {
        name: 'go',
        deprecated: true,
        deprecatedIn: '3.10.0',
        deprecationMessage: 'Use go2 instead'
      } ]);
      mockRequest.onCall(1).resolves({ ok: true });
      await api().updateAppSettings(JSON.stringify({
        transitions: { go: { disable: false } }
      }));
      expect(log.warn.callCount).to.equal(1);
      expect(log.warn.args[0][0]).to.equal('Use go2 instead');
    });

    it('continues when deprecated transitions call throws', async () => {
      sinon.stub(environment, 'isArchiveMode').get(() => false);
      sinon.stub(log, 'warn');
      mockRequest.onCall(0).rejects({ statusCode: 500, message: 'some error' });
      mockRequest.onCall(1).resolves({ ok: true });
      await api().updateAppSettings(JSON.stringify({
        transitions: [ 'test' ]
      }));
      expect(log.warn.callCount).to.equal(1);
    });

  });

  describe('getCompressibleTypes', async () => {
    it('call the API and parse types from string correctly', async () => {
      sinon.stub(environment, 'isArchiveMode').get(() => false);
      sinon.stub(environment, 'force').get(() => false);
      sinon.stub(mockRequest, 'get').resolves({'compressible_types':'text/*, application/*', 'compression_level':'8'});
      const cacheSpy = new Map();
      const cacheGetSpy = sinon.spy(cacheSpy, 'get');
      api.__set__('cache', cacheSpy);
      let compressibleTypes = await api().getCompressibleTypes();
      expect(compressibleTypes).to.deep.eq(['text/*', 'application/*']);
      assert.equal(mockRequest.get.callCount, 1);
      assert.equal(cacheGetSpy.callCount, 0);

      // second time the cache is used
      compressibleTypes = await api().getCompressibleTypes();
      expect(compressibleTypes).to.deep.eq(['text/*', 'application/*']);  // same values from cache
      assert.equal(mockRequest.get.callCount, 1);                      // still 1 request
      assert.equal(cacheGetSpy.callCount, 1);
    });

    it('returns empty if API returns 404', async () => {
      sinon.stub(environment, 'isArchiveMode').get(() => false);
      sinon.stub(environment, 'force').get(() => false);
      sinon.stub(mockRequest, 'get').rejects({statusCode:404});
      const cacheSpy = new Map();
      const cacheGetSpy = sinon.spy(cacheSpy, 'get');
      api.__set__('cache', cacheSpy);
      let compressibleTypes = await api().getCompressibleTypes();
      expect(compressibleTypes).to.deep.eq([]);
      assert.equal(mockRequest.get.callCount, 1);
      assert.equal(cacheGetSpy.callCount, 0);

      // second time the cache is used
      compressibleTypes = await api().getCompressibleTypes();
      expect(compressibleTypes).to.deep.eq([]);       // same values from cache
      assert.equal(mockRequest.get.callCount, 1);  // still 1 request
      assert.equal(cacheGetSpy.callCount, 1);
    });

    it('returns empty if API returns error and without caching result', async () => {
      sinon.stub(environment, 'isArchiveMode').get(() => false);
      sinon.stub(environment, 'force').get(() => false);
      const getReqStub = sinon.stub(mockRequest, 'get');
      getReqStub.onCall(0).rejects('The error');
      getReqStub.onCall(1).resolves({'compressible_types':'text/*, application/*', 'compression_level':'8'});
      const cacheSpy = new Map();
      const cacheGetSpy = sinon.spy(cacheSpy, 'get');
      api.__set__('cache', cacheSpy);
      let compressibleTypes = await api().getCompressibleTypes();
      expect(compressibleTypes).to.deep.eq([]);
      assert.equal(mockRequest.get.callCount, 1);
      assert.equal(cacheGetSpy.callCount, 0);

      // second time cache is NOT used and value from API is returned
      compressibleTypes = await api().getCompressibleTypes();
      expect(compressibleTypes).to.deep.eq(['text/*', 'application/*']);  // values from API second call
      assert.equal(mockRequest.get.callCount, 2);  // 2 requests total
      assert.equal(cacheGetSpy.callCount, 0);      // cache not used
    });
  });

  describe('available', async () => {

    beforeEach(() => sinon.stub(environment, 'apiUrl').get(() => 'http://api/medic'));

    async function testAvailableError(response, expected) {
      sinon.stub(environment, 'isArchiveMode').get(() => false);
      sinon.stub(mockRequest, 'get').rejects(response);
      await api().available()
        .then(() => {
          assert.fail('Expected error to be thrown');
        })
        .catch(err => {
          expect(err.message).to.eq(expected);
        });
    }

    it('should not throw if no error found in request', async () => {
      sinon.stub(environment, 'isArchiveMode').get(() => false);
      sinon.stub(mockRequest, 'get').resolves('okey dokey');
      await api().available();
    });

    it('should throw if request fails to connect', async () => {
      await testAvailableError(
        {},
        'Failed to get a response from http://api/medic/. Maybe you entered the wrong URL, ' +
        'wrong port or the instance is not started. Please check and try again.'
      );
    });

    it('should throw if request returns authentication error', async () => {
      await testAvailableError(
        { statusCode: 401 },
        'Authentication failed connecting to http://api/medic/. ' +
        'Check the supplied username and password and try again.'
      );
    });

    it('should throw if request returns permissions error', async () => {
      await testAvailableError(
        { statusCode: 403 },
        'Insufficient permissions connecting to http://api/medic/. ' +
        'You need to use admin permissions to execute this command.'
      );
    });

    it('should throw if request returns unknown error', async () => {
      await testAvailableError(
        { statusCode: 503 },
        'Received error code 503 connecting to http://api/medic/. ' +
        'Check the server and and try again.'
      );
    });

    it('should return if archive mode is enabled even when api is not available', async () => {
      sinon.stub(environment, 'isArchiveMode').get(() => true);
      sinon.stub(mockRequest, 'get').rejects('Ups');
      await api().available();
      expect(mockRequest.callCount).to.eq(0);   // api is not called
    });
  });
});
