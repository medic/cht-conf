const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const rewire = require('rewire');

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

  it('warns that rules.nools.js is no longer supported', async () => {
    const mod = rewire('../../../src/lib/compilation/compile-tasks-and-targets');
    const warn = sinon.spy();
    mod.__set__('warn', warn);

    await mod(`${BASE_DIR}/removed-nools`, options);

    expect(warn.calledWithMatch(/rules\.nools\.js is no longer supported/)).to.equal(true);
  });
});
