const { Headers } = require('cross-fetch');
const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const ArchivingDB = require('./archiving-db');
const environment = require('./environment');

const sessionCookieAwareFetch = () => (url, opts = {}) => {
  const sessionToken = environment.sessionToken;

  if (sessionToken) {
    const setHeader = (headers, name, value) => {
      if (headers instanceof Headers) {
        headers.set(name, value);
      } else if (Array.isArray(headers)) {
        headers.push([name, value]);
      } else if (typeof headers === 'object') {
        headers[name] = value;
      }
    };

    // Ensure opts.headers exists
    if (!opts.headers) {
      opts.headers = new Headers();
    }

    // Set the 'Cookie' header
    setHeader(opts.headers, 'Cookie', sessionToken);
  }

  return PouchDB.fetch(url, opts);
};

module.exports = () => {
  if (environment.isArchiveMode) {
    return new ArchivingDB(environment.archiveDestination);
  }

  return new PouchDB(environment.apiUrl, {
    ajax: { timeout: 60000 },
    fetch: sessionCookieAwareFetch(),
  });
};
