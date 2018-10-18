const api = require('../api-stub');
const assert = require('chai').assert;
const uploadCustomTranslations = require('../../src/fn/upload-custom-translations');

describe('upload-custom-translations', () => {
  beforeEach(api.start);
  afterEach(api.stop);

  it('should upload simple translations', () =>
    uploadProject('simple')
      .then(expectLangs('en'))
      .then(expectTranslations('en', { a:'first', b:'second', c:'third' })));

  it('should upload translations for multiple languages', () =>
    uploadProject('multi-lang')
      .then(expectLangs('en', 'fr'))
      .then(expectTranslations('en', { one:'one' }))
      .then(expectTranslations('fr', { one:'un(e)' })));

  it('should upload translations containing equals signs', () =>
    uploadProject('contains-equals')
      .then(expectLangs('en'))
      .then(expectTranslations('en', {
        'some.words':'one equals one',
        'some.maths':'1 + 1 = 2',
      })));

  function uploadProject(relativeProjectDir) {
    const testDir = `./data/upload-custom-translations/${relativeProjectDir}`;
    return uploadCustomTranslations(testDir, api.couchUrl);
  }

  function expectLangs(...expectedLangs) {
    const expectedIds = expectedLangs.map(lang => `messages-${lang}`);
    return () => api.db.allDocs()
      .then(res => {
        const actualIds = res.rows.map(doc => doc.id);
        assert.deepEqual(actualIds, expectedIds);
      });
  }

  function expectTranslations(lang, expectedTranslations) {
    return () => api.db.get(`messages-${lang}`)
      .then(doc => {
        assert.equal(doc.code, lang);
        assert.equal(doc.type, 'translations');
        assert.deepEqual(doc.values, expectedTranslations);
      });
  }
});
