const rewire = require('rewire');
const sinon = require('sinon');
const { expect } = require('chai');

const environment = rewire('../../src/lib/environment');
const main = rewire('../../src/lib/main');
const userPrompt = require('../../src/lib/user-prompt');

const defaultActions = main.__get__('defaultActions');
const normalArgv = ['node', 'cht'];

let mocks;
let apiAvailable;
describe('main', () => {
  beforeEach(() => {
    environment.__set__('state', {});
    sinon.spy(environment, 'initialize');
    sinon.stub(userPrompt, 'question').returns('pwd');
    sinon.stub(userPrompt, 'keyInYN').returns(true);
    apiAvailable = sinon.stub().resolves(true);
    mocks = {
      usage: sinon.stub(),
      shellCompletionSetup: sinon.stub(),
      error: sinon.stub(),
      info: sinon.stub(),
      checkChtConfDependencyVersion: sinon.stub(),
      warn: sinon.stub(),
      executeAction: sinon.stub(),
      getApiUrl: sinon.stub().returns('http://api'),
      environment,
      fs: {
        path: {
          basename: () => 'basename',
          resolve: () => 'resolved',
        },
      },
      api: () => ({
        available: apiAvailable
      }),
    };

    for (let attr of Object.keys(mocks)) {
      main.__set__(attr, mocks[attr]);
    }
  });
  afterEach(() => {
    environment.initialize.restore();
    sinon.restore();
  });

  it('no argv yields usage', async () => {
    try {
      await main([], {});
      expect.fail('Expected error to be thrown');
    } catch(e) {
      expect(mocks.usage.calledOnce).to.be.true;
      expect(e.message).to.equal('Invalid number of arguments.');
    }
  });

  it('default argv yields usage', async () => {
    try {
      await main([...normalArgv], {});
      expect.fail('Expected error to be thrown');
    } catch(e) {
      expect(mocks.usage.calledOnce).to.be.true;
      expect(e.message).to.equal('Invalid number of arguments.');
    }
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
    expect(mocks.checkChtConfDependencyVersion.callCount).to.eq(0);
  });

  it('cht-conf dependency checked', async () => {
    await main([...normalArgv, '--local'], {});
    expect(mocks.checkChtConfDependencyVersion.calledOnce).to.be.true;
  });

  it('--local --accept-self-signed-certs', async () => {
    await main([...normalArgv, '--local', '--accept-self-signed-certs'], {});
    expect(mocks.executeAction.callCount).to.deep.eq(defaultActions.length);
    expect(main.__get__('process').env.NODE_TLS_REJECT_UNAUTHORIZED).to.eq('0');
  });

  it('supports actions that do not require an instance', async () => {
    await main([...normalArgv, 'initialise-project-layout'], {});
    expect(mocks.executeAction.callCount).to.deep.eq(1);
    expect(mocks.executeAction.args[0][0].name).to.eq('initialise-project-layout');
  });

  const expectExecuteActionBehavior = (expectedActions, expectedExtraParams) => {
    if (Array.isArray(expectedActions)) {
      expect(mocks.executeAction.args.map(args => args[0].name)).to.deep.eq(expectedActions);
    } else {
      expect(mocks.executeAction.args[0][0].name).to.eq(expectedActions);
    }

    expect(mocks.environment.initialize.args[0][3]).to.deep.eq(expectedExtraParams);

    expect(mocks.environment.initialize.args[0][4]).to.eq('http://api');
  };

  it('--local no COUCH_URL', async () => {
    await main([...normalArgv, '--local'], {});
    expectExecuteActionBehavior(defaultActions, undefined);
  });

  it('--local with COUCH_URL to localhost', async () => {
    const COUCH_URL = 'http://user:pwd@localhost:5988/medic';
    await main([...normalArgv, '--local'], { COUCH_URL });
    expectExecuteActionBehavior(defaultActions, undefined);
  });

  it('--instance + 2 ordered actions', async () => {
    await main([...normalArgv, '--instance=test.app', 'convert-app-forms', 'compile-app-settings'], {});
    expect(mocks.executeAction.callCount).to.deep.eq(2);
    expectExecuteActionBehavior('convert-app-forms', undefined);
    expect(mocks.executeAction.args[1][0].name).to.eq('compile-app-settings');
  });

  it('convert one form', async () => {
    const formName = 'form-name';
    await main([...normalArgv, '--local', 'convert-app-forms', '--', formName], {});
    expect(mocks.executeAction.callCount).to.deep.eq(1);
    expectExecuteActionBehavior('convert-app-forms', [formName]);
  });

  it('unsupported action', async () => {
    try {
      await main([...normalArgv, '--local', 'not-an-action'], {});
      expect.fail('Expected error to be thrown');
    } catch(e) {
      expect(mocks.executeAction.called).to.be.false;
      expect(e.message).to.equal('Unsupported action(s): not-an-action');
    }
  });

  it('add validate forms actions for upload forms actions', async () => {
    await main([...normalArgv, '--local', 'upload-collect-forms', 'upload-contact-forms', 'upload-app-forms'], {});
    expectExecuteActionBehavior(
      [
        'validate-collect-forms', 'upload-collect-forms',
        'validate-contact-forms', 'upload-contact-forms',
        'validate-app-forms', 'upload-app-forms'
      ], undefined
    );
    expect(mocks.environment.initialize.args[0][7]).to.be.undefined;
  });

  it('--skip-validate for upload forms actions', async () => {
    await main([...normalArgv, '--local', '--skip-validate', 'upload-collect-forms', 'upload-contact-forms', 'upload-app-forms'], {});
    expectExecuteActionBehavior(
      [
        'upload-collect-forms',
        'upload-contact-forms',
        'upload-app-forms'
      ], undefined
    );
    expect(mocks.warn.callCount).to.equal(1);
    expect(mocks.warn.args[0][0]).to.equal('Skipping all form validation.');
    // The skipValidate param should be `true` when initializing the environment
    expect(mocks.environment.initialize.args[0][7]).to.eq(true);
  });

  it('--skip-validate for validate forms actions', async () => {
    await main([...normalArgv, '--local', '--skip-validate', 'validate-collect-forms', 'validate-contact-forms',
      'validate-app-forms', 'upload-collect-forms', 'upload-contact-forms', 'upload-app-forms'], {});
    expectExecuteActionBehavior(
      [
        'upload-collect-forms',
        'upload-contact-forms',
        'upload-app-forms'
      ], undefined
    );
    expect(mocks.warn.callCount).to.equal(1);
    expect(mocks.warn.args[0][0]).to.equal('Skipping all form validation.');
    // The skipValidate param should be `true` when initializing the environment
    expect(mocks.environment.initialize.args[0][7]).to.eq(true);
  });

  describe('--archive', () => {
    it('default actions', async () => {
      await main([...normalArgv, '--archive', '--destination=foo'], {});
      const executed = mocks.executeAction.args.map(args => args[0].name);
      expect(executed).to.include('upload-app-settings');
      expect(executed).to.not.include('delete-all-forms');
    });

    it('single action', async () => {
      await main([...normalArgv, '--archive', '--destination=foo', 'upload-app-settings'], {});
      expectExecuteActionBehavior('upload-app-settings', undefined);
      expect(userPrompt.keyInYN.callCount).to.eq(0);
    });

    it('requires destination', async () => {
      try {
        await main([...normalArgv, '--archive', 'upload-app-settings'], {});
        expect.fail('Expected error to be thrown');
      } catch(e) {
        expect(mocks.executeAction.called).to.be.false;
        expect(e.message).to.equal('--destination=<path to save files> is required with --archive.');
      }
    });
  });

  it('accept non-matching instance warning', async () => {
    mocks.getApiUrl.returns('https://admin:pwd@url.app.medicmobile.org/medic');
    userPrompt.keyInYN.returns(true);
    await main([...normalArgv, '---url=https://admin:pwd@url.app.medicmobile.org/']);
    expect(userPrompt.keyInYN.callCount).to.eq(1);
  });

  it('reject non-matching instance warning', async () => {
    mocks.getApiUrl.returns('https://admin:pwd@url.app.medicmobile.org/medic');
    userPrompt.keyInYN.returns(false);
    try {
      await main([...normalArgv, '---url=https://admin:pwd@url.app.medicmobile.org/']);
      expect.fail('Expected error to be thrown');
    } catch(e) {
      expect(userPrompt.keyInYN.callCount).to.eq(1);
      expect(e.message).to.equal('User aborted execution.');
    }
  });

  it('force option skips non-matching instance warning', async () => {
    mocks.getApiUrl.returns('https://admin:pwd@url.app.medicmobile.org/medic');
    environment.__set__('force', true);
    await main([...normalArgv, '---url=https://admin:pwd@url.app.medicmobile.org/', '--force']);
    expect(userPrompt.keyInYN.callCount).to.eq(1);
  });

  it('should return earlier with false value if api is not available', async () => {
    apiAvailable.throws(new Error('Failed to get a response'));
    try {
      await main([...normalArgv, 'upload-app-forms']);
      expect.fail('Expected error to be thrown');
    } catch(e) {
      expect(apiAvailable.callCount).to.eq(1);
      expect(e.message).to.equal('Failed to get a response');
    }
  });

  it('should continue without error if action requires an instance and apiUrl responds', async () => {
    apiAvailable.resolves(true);
    await main([...normalArgv, 'upload-app-forms']);
    expect(apiAvailable.callCount).to.eq(1);
    expect(mocks.error.callCount).to.eq(0);
  });
});
