#!/usr/bin/env node

/* eslint-disable no-console */

const options = [
    '--instance', '--local', '--url', '--user',
    '--help', '--shell-completion', '--supported-actions', '--version', '--accept-self-signed-certs', '--skip-dependency-check',
    ...require('../cli/supported-actions'),
];

console.log(...options);
