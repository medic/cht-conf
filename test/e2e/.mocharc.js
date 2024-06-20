const chaiExclude = require('chai-exclude');
const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
chai.use(chaiAsPromised);
chai.use(chaiExclude);

module.exports = {
    allowUncaught: false,
    color: true,
    checkLeaks: true,
    fullTrace: true,
    asyncOnly: false,
    spec: require('./specs').all,
    timeout: 200 * 1000, //API takes a little long to start up
    reporter: 'spec',
    file: [ 'test/e2e/hooks.js' ],
    captureFile: 'test/e2e/results.txt',
    exit: true,
    recursive: true,
};
