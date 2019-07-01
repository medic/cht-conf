#!/usr/bin/env node

const options = [
    '--instance', '--local', '--url',
    '--help', '--shell-completion', '--supported-actions', '--version',
    ...require('../cli/supported-actions'),
];

console.log(...options);
