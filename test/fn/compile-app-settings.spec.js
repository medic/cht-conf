const { assert, expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const rewire = require('rewire');

const compileAppSettings = rewire('../../src/fn/compile-app-settings');
const fs = require('../../src/lib/sync-fs');

describe('compile-app-settings', () => {

  it('should handle simple config', () =>
    test('simple/project'));

  it('should handle derivative app-settings definitions', () =>
    test('derivative/child'));

  it('should handle config with no separate task-schedules.json file', () =>
    test('no-task-schedules.json/project'));

  it('should handle config with combined targets.js definition', () =>
    test('targets.js/project'));

  it('should reject a project with both old and new nools config', () =>
    testFails('unexpected-legacy-nools-rules/project'));

  it('should handle a project with a purge function', () =>
    test('purging-function/project'));

  it('should handle a project with a perge function that need to be merged with other purge config', () =>
    test('purging-function/project'));

  it('should reject a project with an uncompilable purging function', () =>
    testFails('invalid-purging-function/project'));

  it('should reject a project with eslint error', () =>
    testFails('eslint-error/project'));
  
  it('can overwrite eslint rules with eslintrc file', () =>
    test('eslintrc/project'));
});

async function test(relativeProjectDir) {
  const writeJson = sinon.stub();
  const actingFs = compileAppSettings.__get__('fs');
  actingFs.writeJson = writeJson;

  const testDir = path.join(__dirname, '../data/compile-app-settings', relativeProjectDir);

  // when
  await compileAppSettings(testDir);

  // then
  const actual = JSON.parse(JSON.stringify(writeJson.args[0][1]));
  const expected = JSON.parse(fs.read(`${testDir}/../app_settings.expected.json`));
  actual.tasks.rules = expected.tasks.rules = '';
  expect(actual).to.deep.eq(expected);
}

async function testFails(relativeProjectDir) {
  const testDir = path.join(__dirname, '../data/compile-app-settings', relativeProjectDir);

  // when
  try {
    await compileAppSettings(testDir);
    assert.fail('Expected assertion');
  } catch (err) {
    if (err.name === 'AssertionError') {
      throw err;
    }

    assert.ok('asserted');
  }
}
