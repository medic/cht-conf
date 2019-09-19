const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-memory'));

const express = require('express');
const expressPouch = require('express-pouchdb');
const ExpressSpy = require('./express-spy');
const bodyParser = require('body-parser');

const mockMiddleware = new ExpressSpy();

const opts = {
  inMemoryConfig: true,
  logPath: 'express-pouchdb.log',
  mode: 'minimumForPouchDB'
};
const app = express();
app.use(bodyParser.json());
app.post('/api/sms', (req, res) => {
  module.exports.gatewayRequests.push(req.body);
  res.write('{}');
  res.end();
});
app.all('/api/*', mockMiddleware.requestHandler);
app.use('/', stripAuth, expressPouch(PouchDB, opts));

let server;
const db = new PouchDB('medic', { adapter: 'memory' });

module.exports = {
  db,
  giveResponses: mockMiddleware.setResponses,
  requestLog: () => mockMiddleware.requests.map(r => ({ method:r.method, url:r.originalUrl, body:r.body })),
  start: () => {
    if(server) throw new Error('Server already started.');
    server = app.listen();

    const port = server.address().port;
    const couchUrl = `http://admin:pass@localhost:${port}/medic`;
    module.exports.couchUrl = couchUrl;

    module.exports.gatewayRequests = [];
  },
  stop: async () => {
    server.close();
    server = null;
    delete module.exports.couchUrl;

    // empty DB.  For some reason this seems simpler than re-initialising it -
    // probably due to express-pouchdb
    const res = await db.allDocs();
    for (let id of res.rows.map(r => r.id)) {
      const doc = await db.get(id);
      await db.remove(doc);
    }

    mockMiddleware.clearRequests();    
    mockMiddleware.reset();
  },
};

/**
 * Strip basic auth header because right now
 * 1. we don't need to test it; and
 * 2. I don't know how to configure it in pouchdb-server/pouchdb-express
 */
function stripAuth(req, res, next) {
  delete req.headers.authorization;
  next();
}
