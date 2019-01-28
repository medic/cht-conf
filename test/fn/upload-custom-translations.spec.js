const api = require('../api-stub');
const assert = require('chai').assert;
const uploadCustomTranslations = require('../../src/fn/upload-custom-translations');

describe('upload-custom-translations', () => {
  beforeEach(api.start);
  afterEach(api.stop);

  describe('medic-webapp v3.4.0 custom-translation structure', () => {
    it('should replace existing custom values', () =>
      translationDocExistsInDb('en', {
        generic: { from_generic:'def' },
        custom: { from_custom:'should be overwritten' },
      })
        .then(() => uploadProject('medic-webapp-v3.4.0/with-customs'))
        .then(expectLangs('en'))
        .then(expectGenericTranslations('en', { from_generic:'def' }))
        .then(expectCustomTranslations('en', { from_custom:'overwritten' })));

    it('should delete existing custom values', () =>
      translationDocExistsInDb('en', {
        generic: { from_generic:'def' },
        custom: { from_custom:'should be deleted' },
      })
        .then(() => uploadProject('medic-webapp-v3.4.0/no-customs'))
        .then(expectLangs('en'))
        .then(expectGenericTranslations('en', { from_generic:'def' }))
        .then(expectCustomTranslations('en', {})));

    function expectGenericTranslations(lang, expectedTranslations) {
      return () => getDocFor(lang)
        .then(doc => assert.deepEqual(doc.generic, expectedTranslations));
    }

    function expectCustomTranslations(lang, expectedTranslations) {
      return () => getDocFor(lang)
        .then(doc => assert.deepEqual(doc.custom, expectedTranslations));
    }
  });

  describe('medic-webapp pre-v3.4.0 custom-translation structure', () => {
    it('should upload simple translations', () =>
      uploadProject('medic-webapp-pre-v3.4.0/simple')
        .then(expectLangs('en'))
        .then(expectTranslations('en', { a:'first', b:'second', c:'third' })));

    it('should upload translations for multiple languages', () =>
      uploadProject('medic-webapp-pre-v3.4.0/multi-lang')
        .then(expectLangs('en', 'fr'))
        .then(expectTranslations('en', { one:'one' }))
        .then(expectTranslations('fr', { one:'un(e)' })));

    it('should upload translations containing equals signs', () =>
      uploadProject('medic-webapp-pre-v3.4.0/contains-equals')
        .then(expectLangs('en'))
        .then(expectTranslations('en', {
          'some.words':'one equals one',
          'some.maths':'1 + 1 = 2',
        })));

    function expectTranslations(lang, expectedTranslations) {
      return () => getDocFor(lang)
        .then(doc => assert.deepEqual(doc.values, expectedTranslations));
    }
  });

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

  function getDocFor(lang) {
    return api.db.get(`messages-${lang}`)
      .then(doc => {
        assert.equal(doc.code, lang);
        assert.equal(doc.type, 'translations');
        return doc;
      });
  }
});

function translationDocExistsInDb(lang, props) {
  const doc = {
    _id: `messages-${lang}`,
    type: 'translations',
    code: lang,
    enabled: true,
  };

  Object.assign(doc, props);

  return api.db.put(doc);
}
