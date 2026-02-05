const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const request = rewire('../../src/lib/request');
const { RequestError } = request;

describe('request module', () => {
  let fetchStub;

  beforeEach(() => {
    fetchStub = sinon.stub();
    request.__set__('fetch', fetchStub);
  });

  afterEach(() => {
    sinon.restore();
  });

  const mockResponse = (body, status = 200, ok = true) => ({
    ok,
    status,
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
    headers: new Map([['content-type', 'application/json']])
  });

  describe('HTTP methods', () => {
    it('should make GET requests', async () => {
      fetchStub.resolves(mockResponse({ data: 'test' }));

      const result = await request.get({ url: 'https://example.com/api', json: true });

      expect(fetchStub.calledOnce).to.be.true;
      expect(fetchStub.firstCall.args[1].method).to.equal('GET');
      expect(result).to.deep.equal({ data: 'test' });
    });

    it('should make POST requests with JSON body', async () => {
      fetchStub.resolves(mockResponse({ success: true }));

      const result = await request.post({
        url: 'https://example.com/api',
        json: true,
        body: { name: 'test' }
      });

      expect(fetchStub.calledOnce).to.be.true;
      expect(fetchStub.firstCall.args[1].method).to.equal('POST');
      expect(fetchStub.firstCall.args[1].body).to.equal('{"name":"test"}');
      expect(fetchStub.firstCall.args[1].headers['Content-Type']).to.equal('application/json');
      expect(result).to.deep.equal({ success: true });
    });

    it('should make PUT requests', async () => {
      fetchStub.resolves(mockResponse({ updated: true }));

      await request.put({ url: 'https://example.com/api', json: true });

      expect(fetchStub.firstCall.args[1].method).to.equal('PUT');
    });

    it('should make DELETE requests', async () => {
      fetchStub.resolves(mockResponse({ deleted: true }));

      await request.delete({ url: 'https://example.com/api', json: true });

      expect(fetchStub.firstCall.args[1].method).to.equal('DELETE');
    });

    it('should make PATCH requests', async () => {
      fetchStub.resolves(mockResponse({ patched: true }));

      await request.patch({ url: 'https://example.com/api', json: true });

      expect(fetchStub.firstCall.args[1].method).to.equal('PATCH');
    });

    it('should make HEAD requests', async () => {
      fetchStub.resolves(mockResponse(''));

      await request.head({ url: 'https://example.com/api' });

      expect(fetchStub.firstCall.args[1].method).to.equal('HEAD');
    });

    it('should support generic request with method option', async () => {
      fetchStub.resolves(mockResponse({ data: 'test' }));

      await request({ url: 'https://example.com/api', method: 'POST', json: true });

      expect(fetchStub.firstCall.args[1].method).to.equal('POST');
    });
  });

  describe('options handling', () => {
    it('should handle query string parameters via qs option', async () => {
      fetchStub.resolves(mockResponse({ data: 'test' }));

      await request.get({ url: 'https://example.com/api', qs: { foo: 'bar', baz: 123 }, json: true });

      const calledUrl = fetchStub.firstCall.args[0];
      expect(calledUrl).to.include('foo=bar');
      expect(calledUrl).to.include('baz=123');
    });

    it('should handle both url and uri parameters', async () => {
      fetchStub.resolves(mockResponse({ data: 'test' }));

      await request.get({ uri: 'https://example.com/api', json: true });

      expect(fetchStub.firstCall.args[0]).to.equal('https://example.com/api');
    });

    it('should prefer url over uri when both provided', async () => {
      fetchStub.resolves(mockResponse({ data: 'test' }));

      await request.get({ url: 'https://example.com/url', uri: 'https://example.com/uri', json: true });

      expect(fetchStub.firstCall.args[0]).to.equal('https://example.com/url');
    });

    it('should set Content-Type for JSON bodies', async () => {
      fetchStub.resolves(mockResponse({ success: true }));

      await request.post({ url: 'https://example.com/api', json: true, body: { test: true } });

      expect(fetchStub.firstCall.args[1].headers['Content-Type']).to.equal('application/json');
    });

    it('should set Accept header when json: true', async () => {
      fetchStub.resolves(mockResponse({ data: 'test' }));

      await request.get({ url: 'https://example.com/api', json: true });

      expect(fetchStub.firstCall.args[1].headers['Accept']).to.equal('application/json');
    });

    it('should accept string URL as first argument', async () => {
      fetchStub.resolves(mockResponse('response'));

      await request.get('https://example.com/api');

      expect(fetchStub.firstCall.args[0]).to.equal('https://example.com/api');
    });

    it('should merge options when URL is first argument', async () => {
      fetchStub.resolves(mockResponse({ data: 'test' }));

      await request.get('https://example.com/api', { json: true, qs: { foo: 'bar' } });

      const calledUrl = fetchStub.firstCall.args[0];
      expect(calledUrl).to.include('foo=bar');
    });

    it('should throw error when URL is not provided', async () => {
      try {
        await request.get({});
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal('URL is required');
      }
    });
  });

  describe('authentication', () => {
    it('should extract Basic Auth from URLs', async () => {
      fetchStub.resolves(mockResponse({ data: 'test' }));

      await request.get({ url: 'https://user:pass@example.com/api', json: true });

      const authHeader = fetchStub.firstCall.args[1].headers['Authorization'];
      expect(authHeader).to.equal('Basic ' + Buffer.from('user:pass').toString('base64'));
    });

    it('should remove credentials from URL after extraction', async () => {
      fetchStub.resolves(mockResponse({ data: 'test' }));

      await request.get({ url: 'https://user:pass@example.com/api', json: true });

      const calledUrl = fetchStub.firstCall.args[0];
      expect(calledUrl).to.not.include('user');
      expect(calledUrl).to.not.include('pass');
      expect(calledUrl).to.equal('https://example.com/api');
    });

    it('should not overwrite existing Authorization header', async () => {
      fetchStub.resolves(mockResponse({ data: 'test' }));

      await request.get({
        url: 'https://user:pass@example.com/api',
        headers: { 'Authorization': 'Bearer token123' },
        json: true
      });

      expect(fetchStub.firstCall.args[1].headers['Authorization']).to.equal('Bearer token123');
    });

    it('should handle URL-encoded credentials', async () => {
      fetchStub.resolves(mockResponse({ data: 'test' }));

      await request.get({ url: 'https://user%40email.com:p%40ss@example.com/api', json: true });

      const authHeader = fetchStub.firstCall.args[1].headers['Authorization'];
      expect(authHeader).to.equal('Basic ' + Buffer.from('user@email.com:p@ss').toString('base64'));
    });
  });

  describe('error handling', () => {
    it('should throw RequestError on non-2xx responses', async () => {
      fetchStub.resolves(mockResponse({ error: 'Not found' }, 404, false));

      try {
        await request.get({ url: 'https://example.com/api', json: true });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(RequestError);
        expect(err.statusCode).to.equal(404);
      }
    });

    it('should include statusCode in error', async () => {
      fetchStub.resolves(mockResponse({ error: 'Bad request' }, 400, false));

      try {
        await request.get({ url: 'https://example.com/api', json: true });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(400);
      }
    });

    it('should include response body in error', async () => {
      const errorBody = { error: 'Validation failed', details: ['field required'] };
      fetchStub.resolves(mockResponse(errorBody, 400, false));

      try {
        await request.get({ url: 'https://example.com/api', json: true });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.error).to.deep.equal(errorBody);
      }
    });

    it('should set error name to StatusCodeError', async () => {
      fetchStub.resolves(mockResponse({ error: 'Error' }, 500, false));

      try {
        await request.get({ url: 'https://example.com/api', json: true });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.name).to.equal('StatusCodeError');
      }
    });
  });

  describe('response handling', () => {
    it('should return parsed JSON when json: true', async () => {
      fetchStub.resolves(mockResponse({ data: 'test', nested: { value: 123 } }));

      const result = await request.get({ url: 'https://example.com/api', json: true });

      expect(result).to.deep.equal({ data: 'test', nested: { value: 123 } });
    });

    it('should return raw text when json: false', async () => {
      fetchStub.resolves({
        ok: true,
        status: 200,
        text: () => Promise.resolve('plain text response'),
        headers: new Map()
      });

      const result = await request.get({ url: 'https://example.com/api' });

      expect(result).to.equal('plain text response');
    });

    it('should return full response when resolveWithFullResponse: true', async () => {
      fetchStub.resolves({
        ok: true,
        status: 200,
        text: () => Promise.resolve('{"data":"test"}'),
        headers: new Map([['x-custom', 'header']])
      });

      const result = await request.get({
        url: 'https://example.com/api',
        json: true,
        resolveWithFullResponse: true
      });

      expect(result.statusCode).to.equal(200);
      expect(result.body).to.deep.equal({ data: 'test' });
      expect(result.headers).to.have.property('x-custom', 'header');
    });

    it('should handle JSON parse failures gracefully', async () => {
      fetchStub.resolves({
        ok: true,
        status: 200,
        text: () => Promise.resolve('not valid json'),
        headers: new Map()
      });

      const result = await request.get({ url: 'https://example.com/api', json: true });

      expect(result).to.equal('not valid json');
    });
  });

  describe('timeout', () => {
    it('should use default timeout', async () => {
      fetchStub.resolves(mockResponse({ data: 'test' }));

      await request.get({ url: 'https://example.com/api', json: true });

      // Verify AbortController signal was passed
      expect(fetchStub.firstCall.args[1].signal).to.exist;
    });

    it('should throw timeout error when request exceeds timeout', async () => {
      // Create a promise that never resolves to simulate a hanging request
      fetchStub.callsFake(() => new Promise((resolve, reject) => {
        // The abort signal will trigger this
        const signal = fetchStub.firstCall.args[1].signal;
        signal.addEventListener('abort', () => {
          const err = new Error('Aborted');
          err.name = 'AbortError';
          reject(err);
        });
      }));

      try {
        await request.get({ url: 'https://example.com/api', json: true, timeout: 10 });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.message).to.include('Request timeout');
        expect(err.message).to.include('10ms');
      }
    });

    it('should allow custom timeout via options', async () => {
      fetchStub.resolves(mockResponse({ data: 'test' }));

      await request.get({ url: 'https://example.com/api', json: true, timeout: 60000 });

      // Request should complete successfully with longer timeout
      expect(fetchStub.calledOnce).to.be.true;
    });
  });

  describe('custom headers', () => {
    it('should pass custom headers', async () => {
      fetchStub.resolves(mockResponse({ data: 'test' }));

      await request.get({
        url: 'https://example.com/api',
        headers: { 'X-Custom-Header': 'custom-value' },
        json: true
      });

      expect(fetchStub.firstCall.args[1].headers['X-Custom-Header']).to.equal('custom-value');
    });

    it('should merge custom headers with generated headers', async () => {
      fetchStub.resolves(mockResponse({ data: 'test' }));

      await request.post({
        url: 'https://example.com/api',
        headers: { 'X-Custom': 'value' },
        json: true,
        body: { test: true }
      });

      const headers = fetchStub.firstCall.args[1].headers;
      expect(headers['X-Custom']).to.equal('value');
      expect(headers['Content-Type']).to.equal('application/json');
      expect(headers['Accept']).to.equal('application/json');
    });
  });
});
