const assert = require('chai').assert;
const fs = require('../../src/lib/sync-fs');

const TARGET_DIR = 'build/test/initialise-project-layout';

const initialiseProjectLayout = require('../../src/fn/initialise-project-layout');


describe('initialise-project-layout', () => {

  it('should create a project with the desired layout', () => {

    // when
    initialiseProjectLayout(TARGET_DIR);

    // then
    assertExists('app_settings.json');
    assertExists('contact-summary.js');
    assertExists('forms/app');
    assertExists('forms/collect');
    assertExists('forms/contact');
    assertExists('resources');
    assertExists('resources.json');
    assertExists('rules.nools.js');
    assertExists('targets.json');
    assertExists('tasks.json');
    assertExists('translations');

  });

});


function assertExists(relativePath) {
  const path = `${TARGET_DIR}/${relativePath}`;
  assert.isTrue(fs.exists(path), `Expected file/dir not found: ${path}`);
}
