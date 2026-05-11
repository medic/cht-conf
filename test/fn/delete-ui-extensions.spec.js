const { expect } = require('chai');
const sinon = require('sinon');

const environment = require('../../src/lib/environment');
const uiExtensionsLib = require('../../src/lib/ui-extensions');
const deleteUiExtensions = require('../../src/fn/delete-ui-extensions');

describe('Upload UI Extensions', () => {
  let deleteUiExtensionsStub;

  beforeEach(() => {
    deleteUiExtensionsStub = sinon.stub(uiExtensionsLib, 'deleteUiExtensions').resolves();
  });

  afterEach(() => sinon.restore());

  it('calls uploadUiExtensions with the ui-extensions directory and no specific extensions', async () => {
    sinon.stub(environment, 'extraArgs').get(() => undefined);

    await deleteUiExtensions.execute();
    expect(deleteUiExtensions.requiresInstance).to.equal(true);

    expect(deleteUiExtensionsStub).to.have.been.calledOnceWithExactly([]);
  });

  it('should pass specific extensions from extraArgs, filtering out flags', async () => {
    sinon.stub(environment, 'extraArgs').get(() => ['--', 'my-extension', '--force', 'other-extension']);

    await deleteUiExtensions.execute();

    expect(deleteUiExtensionsStub).to.have.been.calledOnceWithExactly(['my-extension', 'other-extension']);
  });

  it('should pass an empty array when extraArgs contains only flags', async () => {
    sinon.stub(environment, 'extraArgs').get(() => ['--', '--force', '--debug']);

    await deleteUiExtensions.execute();

    expect(deleteUiExtensionsStub).to.have.been.calledOnceWithExactly([]);
  });
});
