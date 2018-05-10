const assert = require('chai').assert;
const compileAppSettings = require('../../src/fn/compile-app-settings');
const fs = require('../../src/lib/sync-fs');

describe('compile-app-settings', () => {

  it('should handle simple config', () =>
    test('simple/project'));

  it('should handle derivative app-settings definitions', () =>
    test('derivative/child'));

  it('should handle nools & contact-summary templating', () =>
    test('templating/project'));

});

function test(relativeProjectDir) {
  const testDir = `./data/compile-app-settings/${relativeProjectDir}`;

  // when
  return compileAppSettings(testDir)

    .then(() => {
      // then
      assert.equal(fs.read(`${testDir}/app_settings.json`),
                   fs.read(`${testDir}/../app_settings.expected.json`));
    });
}
