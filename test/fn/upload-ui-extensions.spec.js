const { expect } = require('chai');
const sinon = require('sinon');

const environment = require('../../src/lib/environment');
const uploadUiExtensionsLib = require('../../src/lib/upload-ui-extensions');
const uploadUiExtensions = require('../../src/fn/upload-ui-extensions');

describe('Upload UI Extensions', () => {
  let uploadUiExtensionsStub;

  beforeEach(() => {
    uploadUiExtensionsStub = sinon.stub(uploadUiExtensionsLib, 'uploadUiExtensions').resolves();
    sinon.stub(environment, 'pathToProject').get(() => '/testpath');
  });

  afterEach(() => sinon.restore());

  it('calls uploadUiExtensions with the ui-extensions directory and no specific extensions', async () => {
    sinon.stub(environment, 'extraArgs').get(() => undefined);

    await uploadUiExtensions.execute();
    expect(uploadUiExtensions.requiresInstance).to.equal(true);

    expect(uploadUiExtensionsStub).to.have.been.calledOnceWithExactly('/testpath/ui-extensions', []);
  });

  it('should pass specific extensions from extraArgs, filtering out flags', async () => {
    sinon.stub(environment, 'extraArgs').get(() => ['--', 'my-extension', '--force', 'other-extension']);

    await uploadUiExtensions.execute();

    expect(uploadUiExtensionsStub).to.have.been.calledOnceWithExactly(
      '/testpath/ui-extensions',
      ['my-extension', 'other-extension']
    );
  });

  it('should pass an empty array when extraArgs is empty', async () => {
    sinon.stub(environment, 'extraArgs').get(() => []);

    await uploadUiExtensions.execute();

    expect(uploadUiExtensionsStub).to.have.been.calledOnceWithExactly('/testpath/ui-extensions', []);
  });

  it('should pass an empty array when extraArgs contains only flags', async () => {
    sinon.stub(environment, 'extraArgs').get(() => ['--', '--force', '--debug']);

    await uploadUiExtensions.execute();

    expect(uploadUiExtensionsStub).to.have.been.calledOnceWithExactly('/testpath/ui-extensions', []);
  });
});
