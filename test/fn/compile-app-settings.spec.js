const assert = require('chai').assert;
const compileAppSettings = require('../../src/fn/compile-app-settings');
const fs = require('../../src/lib/sync-fs');

describe('compile-app-settings', () => {

  it('should handle simple config', () => {

    // given
    const testDir = 'data/compile-app-settings/simple/project';

    // when
    return compileAppSettings(testDir)

      .then(() => {

        // then
        assert.equal(fs.read(`${testDir}/app_settings.json`),
                      fs.read(`${testDir}/../app_settings.expected.json`));

      });

  });

  it('should handle derivative app-settings definitions', () => {

    // given
    const testDir = 'data/compile-app-settings/derivative/child';

    // when
    return compileAppSettings(testDir)

      .then(() => {

        // then
        assert.equal(fs.read(`${testDir}/app_settings.json`),
                     fs.read(`${testDir}/../app_settings.expected.json`));

      });

  });

});
