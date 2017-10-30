const memdown = require('memdown');
const memPouch = require('pouchdb').defaults({ db:memdown });
const express = require('express');
const expressPouch = require('express-pouchdb');

const PORT = 5988;

app = express();
app.use('/', stripAuth, expressPouch(memPouch));

let server;

module.exports = {
  couchUrl: `http://admin:pass@localhost:${PORT}/medic`,
  db: new memPouch('medic'),
  start: () => {
    if(server) throw new Error('Server already started.');
    server = app.listen(PORT);
  },
  stop: () => {
    server.close();
    server = null;
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
