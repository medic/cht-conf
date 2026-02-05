/**
 * HTTP request module using native fetch
 * Replaces request-promise-native to eliminate security vulnerabilities
 * Provides compatible API for existing code
 */

/**
 * Custom error class that mimics request-promise-native error shape
 */
class RequestError extends Error {
  constructor(message, statusCode, body, response) {
    super(message);
    this.name = 'StatusCodeError';
    this.statusCode = statusCode;
    this.error = body;
    this.response = response;
  }
}

/**
 * Build URL with query string parameters
 * @param {string} baseUrl - Base URL
 * @param {Object} qs - Query string parameters
 * @returns {string} - URL with query string
 */
const buildUrl = (baseUrl, qs) => {
  if (!qs || Object.keys(qs).length === 0) {
    return baseUrl;
  }

  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(qs)) {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  }
  return url.toString();
};

/**
 * Normalize options from various input formats
 * Supports: (url), (url, options), (options)
 */
const normalizeOptions = (...args) => {
  let options = {};

  if (typeof args[0] === 'string') {
    options.url = args[0];
    if (args.length > 1 && typeof args[1] === 'object') {
      Object.assign(options, args[1]);
    }
  } else if (typeof args[0] === 'object') {
    options = { ...args[0] };
  }

  // Normalize url/uri
  if (options.uri && !options.url) {
    options.url = options.uri;
  }

  return options;
};

/**
 * Extract basic auth credentials from URL and return clean URL + auth header
 * @param {string} urlString - URL that may contain credentials
 * @returns {Object} - { cleanUrl, authHeader }
 */
const extractBasicAuth = (urlString) => {
  const parsedUrl = new URL(urlString);
  let authHeader = null;

  if (parsedUrl.username || parsedUrl.password) {
    const credentials = `${decodeURIComponent(parsedUrl.username)}:${decodeURIComponent(parsedUrl.password)}`;
    authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`;
    // Remove credentials from URL
    parsedUrl.username = '';
    parsedUrl.password = '';
  }

  return { cleanUrl: parsedUrl.toString(), authHeader };
};

// Default timeout in milliseconds (30 seconds)
const DEFAULT_TIMEOUT = 30000;

/**
 * Perform a fetch request with options compatible with request-promise-native
 * @param {string} method - HTTP method
 * @param {Object} options - Request options
 * @returns {Promise} - Response data or full response
 */
const doFetch = async (method, options) => {
  const {
    url,
    headers = {},
    body,
    json,
    qs,
    resolveWithFullResponse,
    timeout = DEFAULT_TIMEOUT
  } = options;

  if (!url) {
    throw new Error('URL is required');
  }

  // Extract basic auth from URL if present
  const { cleanUrl, authHeader } = extractBasicAuth(url);
  const finalUrl = buildUrl(cleanUrl, qs);

  // Set up timeout using AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const fetchOptions = {
    method: method.toUpperCase(),
    headers: { ...headers },
    signal: controller.signal
  };

  // Add basic auth header if credentials were in URL
  if (authHeader && !fetchOptions.headers['Authorization']) {
    fetchOptions.headers['Authorization'] = authHeader;
  }

  // Handle body and Content-Type
  if (body !== undefined) {
    if (json && typeof body === 'object') {
      fetchOptions.body = JSON.stringify(body);
      if (!fetchOptions.headers['Content-Type']) {
        fetchOptions.headers['Content-Type'] = 'application/json';
      }
    } else {
      fetchOptions.body = body;
    }
  }

  // Accept JSON responses when json option is set
  if (json && !fetchOptions.headers['Accept']) {
    fetchOptions.headers['Accept'] = 'application/json';
  }

  let response;
  try {
    // fetch is stable in Node.js 18+ (LTS)
    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    response = await fetch(finalUrl, fetchOptions);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms: ${finalUrl}`);
    }
    throw err;
  }
  clearTimeout(timeoutId);

  // Read response body - get text first to avoid stream consumption issues
  let responseBody;
  const text = await response.text();

  // Only parse JSON if explicitly requested via json option
  // (matches request-promise-native behavior)
  if (json) {
    try {
      responseBody = JSON.parse(text);
    } catch {
      // If JSON parsing fails, return raw text
      responseBody = text;
    }
  } else {
    responseBody = text;
  }

  // Handle non-2xx responses
  if (!response.ok) {
    throw new RequestError(
      `${response.status} - ${JSON.stringify(responseBody)}`,
      response.status,
      responseBody,
      response
    );
  }

  // Return full response or just body
  if (resolveWithFullResponse) {
    return {
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody
    };
  }

  return responseBody;
};

/**
 * Create a request method (without retry - retry is handled by caller)
 * @param {string} method - HTTP method
 * @returns {Function} - Request function
 */
const createMethod = (method) => {
  return (...args) => {
    const options = normalizeOptions(...args);
    return doFetch(method, options);
  };
};

/**
 * Generic request function that supports method option
 * Compatible with rpn({ method: 'POST', ... }) syntax
 */
const request = (...args) => {
  const options = normalizeOptions(...args);
  const method = options.method || 'GET';
  return doFetch(method, options);
};

// Add convenience methods
request.get = createMethod('GET');
request.post = createMethod('POST');
request.put = createMethod('PUT');
request.delete = createMethod('DELETE');
request.patch = createMethod('PATCH');
request.head = createMethod('HEAD');

// Export
module.exports = request;
module.exports.RequestError = RequestError;
