#!/usr/bin/env node

const cur = process.argv[3] || '';
const idx = Number.parseInt(process.argv[2]);

let options = [];

if(idx === 1 && cur.match(/^-/)) {
  options = [ '--help', '--shell-completion', '--supported-actions', '--version' ];
}

if(idx === 2) {
  const localhostMatch = cur.match(/http:\/\/[^:]+:[^@]+@/);
  const remoteMatch = cur.match(/(https:\/\/[^:]+:[^@]+@[^-]+-[^.]+\.).*/);

  if(localhostMatch) options = [ `${localhostMatch[0]}localhost:5988` ];
  else if(remoteMatch) options = [ `${remoteMatch[1]}app.medicmobile.org`,  `${remoteMatch[1]}dev.medicmobile.org` ];
  else options = ['http\\://', 'https\\://'];
}

if(idx >= 3) {
  options = require('../src/cli/supported-actions');
}

console.log(...options);
