const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const projectDir = rewire('../../src/lib/check-medic-conf-dependency-version');

describe('test different medic-conf versions', () => { 
  let warn, fs; 
  
  beforeEach(() => {
    const runningVersion = '3.1.2';
  
    warn = sinon.stub();
    fs = {
      exists: sinon.stub().returns(true),
      readJson: sinon.stub().returns({ dependencies: { 'medic-conf': '1.0.0' } }),
    };

    projectDir.__set__('warn', warn);
    projectDir.__set__('runningVersion', runningVersion);
    projectDir.__set__('fs', fs);
  });

  const scenarios = [
    { version: '2.0.0', throw: true },
    { version: '3.0.0' },
        
    { version: '3.1.1' },
    { version: '3.1.2' },
    { version: '3.1.3', throw: true },
    { version: '3.2.0', throw: true },

    { desc: 'undefined', version: undefined, warn: true },
    { desc: 'empty', version: '', warn: true },
    { version: '3.3.0', throw: true },
    { version: '4.0.0', throw: true },
    { version: '4.1.0', throw: true },
    { version: '4.0.1', throw: true },
    { version: '5.0.0', throw: true },
  ];

  for (const scenario of scenarios) {
    it(`${scenario.desc || scenario.version}`, () => {
      fs.readJson.returns({ dependencies: { 'medic-conf': scenario.version } });

      if (scenario.throw) {
        expect(() => projectDir('fake')).to.throw();
      } else {
        const actual = projectDir('fake');
        expect(actual).to.be.undefined;
      }
      expect(warn.called).to.eq(!!scenario.warn);
    });
  }

  it('project package.json path does not exist', () => {
    fs.exists.returns(false);
    const actual = projectDir('fake');
    expect(actual).to.be.undefined;
    expect(warn.args[0][0]).to.include('No project package.json');
  });

  it('devDependencies', () => {
    
  });
});
