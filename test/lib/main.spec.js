const rewire = require('rewire');
const sinon = require('sinon');
const { expect } = require('chai');

const main = rewire('../../src/lib/main');
const normalArgv = ['node', 'medic-conf'];

const defaultActions = main.__get__('defaultActions');

let mocks;
describe('main', () => {
  beforeEach(() => {
    mocks = {
      usage: sinon.stub(),
      shellCompletionSetup: sinon.stub(),
      error: sinon.stub(),
      info: sinon.stub(),
      checkMedicConfDependencyVersion: sinon.stub(),
      warn: sinon.stub(),
      executeAction: sinon.stub(),
      readline: {
        question: sinon.stub().returns('pwd'),
        keyInYN: sinon.stub().returns(true),
      },
      fs: {
        path: {
          basename: () => 'basename',
          resolve: () => 'resolved',
        },
      },
    };

    for (let attr of Object.keys(mocks)) {
      main.__set__(attr, mocks[attr]);
    }
  });

  it('no argv yields usage', async () => {
    await main([], {});
    expect(mocks.usage.calledOnce).to.be.true;
  });

  it('default argv yields usage', async () => {
    await main([...normalArgv], {});
    expect(mocks.usage.calledOnce).to.be.true;
  });

  it('--shell-completion', async () => {
    await main([...normalArgv, '--shell-completion=foo'], {});
    expect(mocks.shellCompletionSetup.calledOnce).to.be.true;
    expect(mocks.shellCompletionSetup.args[0]).to.deep.eq(['foo']);
  });

  it('--supported-actions', async () => {
    await main([...normalArgv, '--supported-actions'], {});
    expect(mocks.info.callCount).to.eq(1);
    expect(mocks.info.args[0]).to.include('Supported actions:\n');
  });

  it('--version', async () => {
    await main([...normalArgv, '--version'], {});
    expect(mocks.info.callCount).to.eq(1);
    expect(mocks.info.args[0]).to.match(/[0-9]+\.[0-9]+\.[0-9]/);
  });

  it('--skip-dependency-check', async () => {
    await main([...normalArgv, '--skip-dependency-check'], {});
    expect(mocks.checkMedicConfDependencyVersion.callCount).to.eq(0);
  });

  it('medic conf dependency checked', async () => {
    await main([...normalArgv, '--local'], {});
    expect(mocks.checkMedicConfDependencyVersion.calledOnce).to.be.true;
  });

  it('--local --accept-self-signed-certs', async () => {
    await main([...normalArgv, '--local', '--accept-self-signed-certs'], {});
    expect(mocks.executeAction.callCount).to.deep.eq(defaultActions.length);
    expect(main.__get__('process').env.NODE_TLS_REJECT_UNAUTHORIZED).to.eq('0');
  });

  it('--local no COUCH_URL', async () => {
    await main([...normalArgv, '--local'], {});
    
    expect(mocks.executeAction.callCount).to.deep.eq(defaultActions.length);
    expect(mocks.executeAction.args[0]).to.deep.eq(['compile-app-settings', 'http://admin:pass@localhost:5988/medic', undefined]);
  });

  it('--local with COUCH_URL to localhost', async () => {
    const COUCH_URL = 'http://user:pwd@localhost:5988/medic';
    await main([...normalArgv, '--local'], { COUCH_URL });
    
    expect(mocks.executeAction.callCount).to.deep.eq(defaultActions.length);
    expect(mocks.executeAction.args[0]).to.deep.eq(['compile-app-settings', 'http://user:pwd@localhost:5988/medic', undefined]);
  });

  it('--local with COUCH_URL to non-localhost yields error', async () => {
    const COUCH_URL = 'http://user:pwd@host:5988/medic';
    await main([...normalArgv, '--local'], { COUCH_URL });
    expect(mocks.executeAction.callCount).to.deep.eq(0);
  });

  it('--instance production warning', async () => {
    mocks.readline.keyInYN.returns(false);
    const exit = await main([...normalArgv, '--instance=resolved.app', '--user=foo'], {});
    expect(mocks.readline.question.calledOnce).to.be.true; // prompt for password
    expect(mocks.readline.keyInYN.calledOnce).to.be.true; // prompted with warning
    expect(mocks.warn.args[0][1]).to.include('https://foo:****@resolved.app.medicmobile.org');
    expect(exit).to.eq(-1);
  });

  it('--instance + 2 ordered actions', async () => {
    await main([...normalArgv, '--instance=test.app', 'convert-app-forms', 'compile-app-settings'], {});
    expect(mocks.executeAction.callCount).to.deep.eq(2);
    expect(mocks.executeAction.args[0]).to.deep.eq(['convert-app-forms', 'https://admin:pwd@test.app.medicmobile.org/medic', undefined]);
    expect(mocks.executeAction.args[1][0]).to.eq('compile-app-settings');
  });

  it('convert one form', async () => {
    const formName = 'form-name';
    await main([...normalArgv, '--local', 'convert-app-forms', '--', formName], {});
    expect(mocks.executeAction.callCount).to.deep.eq(1);
    expect(mocks.executeAction.args[0]).to.deep.eq(['convert-app-forms', 'http://admin:pass@localhost:5988/medic', [formName]]);
  });

  it('unsupported action', async () => {
    await main([...normalArgv, '--local', 'not-an-action'], {});
    expect(mocks.executeAction.called).to.be.false;
  });

  describe('parseCouchUrl', () => {
    const parseCouchUrl = main.__get__('parseCouchUrl');
    it('basic', () =>
      expect(parseCouchUrl('http://admin:pass@localhost:5988/medic').href).to.eq('http://admin:pass@localhost:5988/'));
    
    it('updates port', () =>
      expect(parseCouchUrl('http://admin:pass@localhost:5984/medic').href).to.eq('http://admin:pass@localhost:5988/'));

    it('ignores path', () =>
      expect(parseCouchUrl('http://admin:pass@localhost:5984/foo').href).to.eq('http://admin:pass@localhost:5988/'));
  });
});
