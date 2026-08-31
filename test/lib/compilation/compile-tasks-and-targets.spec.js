const { expect } = require('chai');
const path = require('path');

const compile = require('../../../src/lib/compilation/compile-tasks-and-targets');

const BASE_DIR = path.join(__dirname, '../../data/compile-tasks-and-targets');
const options = { minifyScripts: false, haltOnSchemaError: false };

describe('compile-tasks-and-targets', () => {
  it('compiles declarative base files', async () => {
    const result = await compile(`${BASE_DIR}/base`, options);
    expect(result.isDeclarative).to.equal(true);
    expect(result.rules).to.be.a('string');
    expect(result.rules).to.include('_complete');
  });

  it('compiles config from tasks/ and targets/ directories', async () => {
    const result = await compile(`${BASE_DIR}/directory`, options);
    expect(result.isDeclarative).to.equal(true);
    expect(result.rules).to.include('_complete');
  });

  it('emits empty rules when no task/target files exist', async () => {
    const result = await compile(`${BASE_DIR}/empty`, options);
    expect(result.isDeclarative).to.equal(true);
    expect(result.rules).to.include('_complete');
  });

  it('fails when the removed rules.nools.js is present', async () => {
    // Compiling it would emit empty tasks/targets, which would wipe the rules
    // on whichever server the result is uploaded to.
    await expect(compile(`${BASE_DIR}/removed-nools`, options))
      .to.be.rejectedWith(/rules\.nools\.js is no longer supported/);
  });

  it('points at the tasks docs when it fails', async () => {
    await expect(compile(`${BASE_DIR}/removed-nools`, options))
      .to.be.rejectedWith(/docs\.communityhealthtoolkit\.org.*building\/tasks/);
  });
});
