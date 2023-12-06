const { assert, expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const rpn = require('request-promise-native');

let api = rewire('../../src/lib/api');
const environment = require('../../src/lib/environment');
const log = require('../../src/lib/log');
const apiStub = require('../api-stub');

describe('api', () => {
  describe('methods', () => {
    let mockRequest;
    beforeEach(() => {
      mockRequest = {
        get: sinon.stub().resolves(),
        post: sinon.stub().resolves(),
        put: sinon.stub().resolves(),
      };
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
      expect(mockRequest.get.callCount).to.eq(1);
    });

    describe('formsValidate', async () => {

      it('should fail if validate endpoint returns invalid JSON', async () => {
        sinon.stub(environment, 'isArchiveMode').get(() => false);
        mockRequest.post.resolves('--NOT JSON--');
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
        mockRequest.post.rejects({name: 'StatusCodeError', statusCode: 404});
        let result = await api().formsValidate('<xml></xml>');
        expect(result).to.deep.eq({ok: true, formsValidateEndpointFound: false});
        expect(mockRequest.post.callCount).to.eq(1);
        // second call
        result = await api().formsValidate('<xml>Another XML</xml>');
        expect(result).to.deep.eq({ok: true, formsValidateEndpointFound: false});
        expect(mockRequest.post.callCount).to.eq(1); // still HTTP client called only once
      });

      it('should not call API when --archive mode and response still ok', async () => {
        api.__set__('environment', { isArchiveMode: true });
        let result = await api().formsValidate('<xml></xml>');
        expect(result).to.deep.eq({ok: true});
        expect(mockRequest.post.callCount).to.eq(0);
        // second call
        result = await api().formsValidate('<xml>Another XML</xml>');
        expect(result).to.deep.eq({ok: true});
        expect(mockRequest.post.callCount).to.eq(0); // still HTTP not called even once
      });
    });

    describe('archive mode', async () => {
      beforeEach(() => sinon.stub(environment, 'isArchiveMode').get(() => true));

      it('does not initiate requests to api', async () => {
        await api().version();
        expect(mockRequest.get.callCount).to.eq(0);
      });

      it('throws not supported for undefined interfaces', () => {
        expect(api().getAppSettings).to.throw('getAppSettings not supported in --archive mode');
      });
    });

    describe('updateAppSettings', async() => {

      it('changes settings on server', async () => {
        sinon.stub(environment, 'isArchiveMode').get(() => false);
        // GET /api/v1/settings/deprecated-transitions from logDeprecatedTransitions()
        mockRequest.get.onCall(0).resolves([]);
        // PUT /_design/medic/_rewrite/update_settings/medic?replace=1 from updateAppSettings()
        mockRequest.put.onCall(0).resolves({ ok: true });
        const response = await api().updateAppSettings(JSON.stringify({
          transitions: [ 'test' ]
        }));
        expect(response.ok).to.equal(true);
        expect(mockRequest.get.callCount).to.equal(1);
        expect(mockRequest.put.callCount).to.equal(1);
        expect(mockRequest.put.args[0][0].body).to.equal('{"transitions":["test"]}');
      });

      it('throws error when server throws', async () => {
        sinon.stub(environment, 'isArchiveMode').get(() => false);
        mockRequest.get.onCall(0).resolves([]);
        mockRequest.put.onCall(0).resolves({ ok: true });
        try {
          await api().updateAppSettings(JSON.stringify({}));
        } catch(err) {
          expect(err.error).to.equal('random');
          expect(mockRequest.get.callCount).to.equal(0);
          expect(mockRequest.put.callCount).to.equal(1);
        }
      });

      it('logs and continues when using deprecated transitions', async () => {
        sinon.stub(environment, 'isArchiveMode').get(() => false);
        sinon.stub(log, 'warn');
        mockRequest.get.onCall(0).resolves([ {
          name: 'go',
          deprecated: true,
          deprecatedIn: '3.10.0',
          deprecationMessage: 'Use go2 instead'
        } ]);
        mockRequest.put.onCall(0).resolves({ ok: true });
        await api().updateAppSettings(JSON.stringify({
          transitions: { go: { disable: false } }
        }));
        expect(log.warn.callCount).to.equal(1);
        expect(log.warn.args[0][0]).to.equal('Use go2 instead');
      });

      it('continues when deprecated transitions call throws', async () => {
        sinon.stub(environment, 'isArchiveMode').get(() => false);
        sinon.stub(log, 'warn');
        mockRequest.get.onCall(0).rejects({ statusCode: 500, message: 'some error' });
        mockRequest.put.onCall(0).resolves({ ok: true });
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
        mockRequest.get.resolves({'compressible_types':'text/*, application/*', 'compression_level':'8'});
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
        mockRequest.get.rejects({statusCode:404});
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
        const getReqStub = mockRequest.get;
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
        mockRequest.get.rejects(response);
        try {
          await api().available();
          assert.fail('Expected error to be thrown');
        } catch(e) {
          expect(e.message).to.eq(expected);
        }
      }

      it('should not throw if no error found in request', async () => {
        sinon.stub(environment, 'isArchiveMode').get(() => false);
        mockRequest.get.resolves('okey dokey');
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
        mockRequest.get.rejects('Ups');
        await api().available();
        expect(mockRequest.get.callCount).to.eq(0);   // api is not called
      });
    });
  });

  describe('retry mechanism', function () {
    this.timeout(15000);

    let spyGet;
    beforeEach(() => {
      apiStub.start();
      sinon.stub(environment, 'isArchiveMode').get(() => false);
      spyGet = sinon.spy(rpn, 'get');
    });

    afterEach(() => {
      sinon.restore();
      return apiStub.stop();
    });

    it('should throw after the request failed 6 times', async () => {
      apiStub.giveResponses(
        { status: 404, body: { error: 'not_found' } },
        { status: 404, body: { error: 'not_found' } },
        { status: 404, body: { error: 'not_found' } },
        { status: 404, body: { error: 'not_found' } },
        { status: 404, body: { error: 'not_found' } },
        { status: 404, body: { error: 'not_found' } },
      );

      try {
        await api().version();
      } catch (error) {
        expect(error.statusCode).to.eq(404);
        expect(error.error).to.deep.eq({ error: 'not_found' });
        expect(spyGet.callCount).to.eq(6);
      }
    });

    it('should successfully request the version from the API despite it failing 3 times', async () => {
      apiStub.giveResponses(
        { status: 500, body: { error: 'internal_server_error' } },
        { status: 500, body: { error: 'internal_server_error' } },
        { status: 500, body: { error: 'internal_server_error' } },
        { status: 200, body: { version: '3.5.0' } },
      );

      try {
        const version = await api().version();
        expect(spyGet.callCount).to.eq(4);
        expect(version).to.eq('3.5.0');
      } catch (error) {
        expect.fail('no error should be thrown');
      }
    });
  });
});
