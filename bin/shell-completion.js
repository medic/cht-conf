#!/usr/bin/env node

const options = [
    '--instance', '--local', '--url',
    '--help', '--shell-completion', '--supported-actions', '--version',
    ...require('../src/cli/supported-actions'),
];

console.log(...options);
