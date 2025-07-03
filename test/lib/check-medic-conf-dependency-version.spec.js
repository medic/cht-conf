const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const checkChtConfVersion = rewire('../../src/lib/check-cht-conf-dependency-version');
const RUNNING_VERSION = '3.1.2';

describe('check-cht-conf-dependency-version', () => {
  let warn;
  let fs;

  beforeEach(() => {
    warn = sinon.stub();
    fs = {
      exists: sinon.stub().returns(true),
      readJson: sinon.stub().returns({ dependencies: { 'cht-conf': '1.0.0' } }),
    };

    checkChtConfVersion.__set__('warn', warn);
    checkChtConfVersion.__set__('runningVersion', RUNNING_VERSION);
    checkChtConfVersion.__set__('fs', fs);
  });

  const scenarios = [
    { version: '2.0.0', throw: true },
    { version: '3.0.0' },
    { version: '3.1.1' },
    { version: '3.1.2' },
    { version: '3.1.3', throw: true },
    { version: '3.2.0', throw: true },
    { version: '3.3.0', throw: true },
    { version: '4.0.0', throw: true },
    { version: '4.1.0', throw: true },
    { version: '4.0.1', throw: true },
    { version: '5.0.0', throw: true },
    { desc: 'undefined', version: undefined, warn: true },
    { desc: 'empty', version: '', warn: true }
  ];

  for (const scenario of scenarios) {
    it(`${scenario.desc || scenario.version}`, () => {
      fs.readJson.returns({ dependencies: { 'cht-conf': scenario.version } });

      if (scenario.throw) {
        expect(() => checkChtConfVersion()).to.throw();
      } else {
        const actual = checkChtConfVersion();
        expect(actual).to.be.undefined;
      }
      expect(warn.called).to.eq(!!scenario.warn);
    });
  }

  it('project package.json path does not exist', () => {
    fs.exists.returns(false);
    const actual = checkChtConfVersion();
    expect(actual).to.be.undefined;
    expect(warn.args[0][0]).to.include('No project package.json');
  });

  it('devDependencies', () => {
    fs.readJson.returns({devDependencies: {'cht-conf': '3.1.2'}});
    const actual = checkChtConfVersion();
    expect(actual).to.be.undefined;
    expect(warn.called).to.eq(false);
  });
});
