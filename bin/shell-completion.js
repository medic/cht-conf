#!/usr/bin/env node

const cur = process.argv[3] || '';
const idx = Number.parseInt(process.argv[2]);

let options = [];

if(idx === 1 && cur.match(/^-/)) {
  options = [ '--help', '--shell-completion', '--supported-actions', '--version' ];
}

if(idx === 2) {
  options = ['http\\://', 'https\\://'];
}

if(idx >= 3) {
  options = require('../src/cli/supported-actions');
}

console.log(...options);
