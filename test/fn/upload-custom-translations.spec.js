const api = require('../api-stub');
const assert = require('chai').assert;
const uploadCustomTranslations = require('../../src/fn/upload-custom-translations');
const testProjectDir = './data/upload-custom-translations/';

const getTranslationDoc = (lang) => {
  return api.db.get(`messages-${lang}`)
    .then(doc => {
      assert.equal(doc.code, lang);
      assert.equal(doc.type, 'translations');
      return doc;
    });
};

const expectTranslationDocs = (...expectedLangs) => {
  const expectedIds = expectedLangs.map(lang => `messages-${lang}`);
  return api.db
    .allDocs()
    .then(res => {
      const actualIds = res.rows.filter(row => row.id.startsWith('messages-')).map(row => row.id);
      assert.deepEqual(actualIds, expectedIds);
    });
};

describe('upload-custom-translations', () => {
  beforeEach(api.start);
  afterEach(api.stop);

  describe('medic-2.x', () => {
    beforeEach(() => {
      // api/deploy-info endpoint doesn't exist
      api.giveResponses({ status: 404, body: { error: 'not_found' } });
      // medic-client does not have deploy_info property
      return api.db.put({ _id: '_design/medic-client' });
    });

    it('should upload simple translations', () => {
      return uploadCustomTranslations(`${testProjectDir}simple`, api.couchUrl)
        .then(() => expectTranslationDocs('en'))
        .then(() => getTranslationDoc('en'))
        .then(messagesEn => {
          assert.deepEqual(messagesEn.values, { a:'first', b:'second', c:'third' });
          assert(!messagesEn.generic);
          assert(!messagesEn.custom);
        });
    });

    it('should upload translations for multiple languages', () => {
      return uploadCustomTranslations(`${testProjectDir}multi-lang`, api.couchUrl)
        .then(() => expectTranslationDocs('en', 'fr'))
        .then(() => getTranslationDoc('en'))
        .then(messagesEn => {
          assert.deepEqual(messagesEn.values, { one: 'one' });
          assert(!messagesEn.generic);
          assert(!messagesEn.custom);
        })
        .then(() => getTranslationDoc('fr'))
        .then(messagesFr => {
          assert.deepEqual(messagesFr.values, { one: 'un(e)' });
          assert(!messagesFr.generic);
          assert(!messagesFr.custom);
        });
    });

    it('should upload translations containing equals signs', () => {
      return uploadCustomTranslations(`${testProjectDir}contains-equals`, api.couchUrl)
        .then(() => expectTranslationDocs('en'))
        .then(() => getTranslationDoc('en'))
        .then(messagesEn => {
          assert.deepEqual(messagesEn.values, {
            'some.words':'one equals one',
            'some.maths':'1 + 1 = 2',
          });
          assert(!messagesEn.generic);
          assert(!messagesEn.custom);
        });
    });
  });

  describe('medic-3.x', () => {
    describe('3.0.0', () => {
      beforeEach(() => api.db.put({ _id: '_design/medic-client', deploy_info: { version: '3.0.0' } }));

      it('should upload simple translations', () => {
        // api/deploy-info endpoint doesn't exist
        api.giveResponses({ status: 404, body: { error: 'not_found' } });
        return uploadCustomTranslations(`${testProjectDir}simple`, api.couchUrl)
          .then(() => expectTranslationDocs('en'))
          .then(() => getTranslationDoc('en'))
          .then(messagesEn => {
            assert.deepEqual(messagesEn.values, { a:'first', b:'second', c:'third' });
            assert(!messagesEn.generic);
            assert(!messagesEn.custom);
          });
      });

      it('should upload translations for multiple languages', () => {
        // api/deploy-info endpoint doesn't exist
        api.giveResponses({ status: 404, body: { error: 'not_found' } });
        return uploadCustomTranslations(`${testProjectDir}multi-lang`, api.couchUrl)
          .then(() => expectTranslationDocs('en', 'fr'))
          .then(() => getTranslationDoc('en'))
          .then(messagesEn => {
            assert.deepEqual(messagesEn.values, { one: 'one' });
            assert(!messagesEn.generic);
            assert(!messagesEn.custom);
          })
          .then(() => getTranslationDoc('fr'))
          .then(messagesFr => {
            assert.deepEqual(messagesFr.values, { one: 'un(e)' });
            assert(!messagesFr.generic);
            assert(!messagesFr.custom);
          });
      });

      it('should upload translations containing equals signs', () => {
        // api/deploy-info endpoint doesn't exist
        api.giveResponses({ status: 404, body: { error: 'not_found' } });
        return uploadCustomTranslations(`${testProjectDir}contains-equals`, api.couchUrl)
          .then(() => expectTranslationDocs('en'))
          .then(() => getTranslationDoc('en'))
          .then(messagesEn => {
            assert.deepEqual(messagesEn.values, {
              'some.words':'one equals one',
              'some.maths':'1 + 1 = 2',
            });
            assert(!messagesEn.generic);
            assert(!messagesEn.custom);
          });
      });

      it('should merge with existent translations', () => {
        return api.db
          .put({
            _id: 'messages-en',
            code: 'en',
            name: 'English',
            type: 'translations',
            values: { a:'first', from_custom:'third' }
          })
          .then(() => uploadCustomTranslations(`${testProjectDir}with-customs`, api.couchUrl))
          .then(() => expectTranslationDocs('en'))
          .then(() => getTranslationDoc('en'))
          .then(messagesEn => {
            assert.deepEqual(messagesEn.values, { a:'first', from_custom: 'overwritten', from_custom_new: 'new' });
            assert(!messagesEn.generic);
            assert(!messagesEn.custom);
          });
      });


      it('should crash for malformed translation files', () => {
        return api.db
          .put({
            _id: 'messages-en',
            code: 'en',
            name: 'English',
            type: 'translations'
          })
          .then(() => uploadCustomTranslations(`${testProjectDir}with-customs`, api.couchUrl))
          .catch(err => {
            assert.equal(err.message, 'Existent translation doc messages-en is malformed');
          });
      });
    });

    describe('3.4.0', () => {
      beforeEach(() => api.db.put({ _id: '_design/medic-client', deploy_info: { version: '3.4.0' } }));

      it('should upload simple translations', () => {
        // api/deploy-info endpoint doesn't exist
        api.giveResponses({ status: 404, body: { error: 'not_found' } });
        return uploadCustomTranslations(`${testProjectDir}simple`, api.couchUrl)
          .then(() => expectTranslationDocs('en'))
          .then(() => getTranslationDoc('en'))
          .then(messagesEn => {
            assert.deepEqual(messagesEn.custom, { a:'first', b:'second', c:'third' });
            assert.deepEqual(messagesEn.generic, {});
            assert(!messagesEn.values);
          });
      });

      it('should upload translations for multiple languages', () => {
        // api/deploy-info endpoint doesn't exist
        api.giveResponses({ status: 404, body: { error: 'not_found' } });
        return uploadCustomTranslations(`${testProjectDir}multi-lang`, api.couchUrl)
          .then(() => expectTranslationDocs('en', 'fr'))
          .then(() => getTranslationDoc('en'))
          .then(messagesEn => {
            assert.deepEqual(messagesEn.custom, { one: 'one' });
            assert.deepEqual(messagesEn.generic, {});
            assert(!messagesEn.values);
          })
          .then(() => getTranslationDoc('fr'))
          .then(messagesFr => {
            assert.deepEqual(messagesFr.custom, { one: 'un(e)' });
            assert.deepEqual(messagesFr.generic, {});
            assert(!messagesFr.values);
          });
      });

      it('should upload translations containing equals signs', () => {
        // api/deploy-info endpoint doesn't exist
        api.giveResponses({ status: 404, body: { error: 'not_found' } });
        return uploadCustomTranslations(`${testProjectDir}contains-equals`, api.couchUrl)
          .then(() => expectTranslationDocs('en'))
          .then(() => getTranslationDoc('en'))
          .then(messagesEn => {
            assert.deepEqual(messagesEn.custom, {
              'some.words':'one equals one',
              'some.maths':'1 + 1 = 2',
            });
            assert.deepEqual(messagesEn.generic, {});
            assert(!messagesEn.values);
          });
      });

      it('should replace existent custom values', () => {
        return api.db
          .put({
            _id: 'messages-en',
            code: 'en',
            name: 'English',
            type: 'translations',
            generic: { a: 'first' },
            custom: { c: 'third' }
          })
          .then(() => uploadCustomTranslations(`${testProjectDir}with-customs`, api.couchUrl))
          .then(() => expectTranslationDocs('en'))
          .then(() => getTranslationDoc('en'))
          .then(messagesEn => {
            assert.deepEqual(messagesEn.generic, { a: 'first' });
            assert.deepEqual(messagesEn.custom, { from_custom: 'overwritten', from_custom_new: 'new' });
            assert(!messagesEn.values);
          });
      });

      it('should replace delete custom values', () => {
        return api.db
          .put({
            _id: 'messages-en',
            code: 'en',
            name: 'English',
            type: 'translations',
            generic: { a: 'first' },
            custom: { c: 'third' }
          })
          .then(() => uploadCustomTranslations(`${testProjectDir}no-customs`, api.couchUrl))
          .then(() => expectTranslationDocs('en'))
          .then(() => getTranslationDoc('en'))
          .then(messagesEn => {
            assert.deepEqual(messagesEn.generic, { a: 'first' });
            assert.deepEqual(messagesEn.custom, { });
            assert(!messagesEn.values);
          });
      });
    });

    describe('3.5.0', () => {
      beforeEach(() => {
        // api/deploy-info endpoint exists
        api.giveResponses({ body: { version: '3.5.0' } });
        return api.db.put({ _id: '_design/medic-client', deploy_info: { version: '3.5.0' } });
      });

      it('should upload simple translations', () => {
        return uploadCustomTranslations(`${testProjectDir}simple`, api.couchUrl)
          .then(() => expectTranslationDocs('en'))
          .then(() => getTranslationDoc('en'))
          .then(messagesEn => {
            assert.deepEqual(messagesEn.custom, { a:'first', b:'second', c:'third' });
            assert.deepEqual(messagesEn.generic, {});
            assert(!messagesEn.values);
          });
      });

      it('should upload translations for multiple languages', () => {
        return uploadCustomTranslations(`${testProjectDir}multi-lang`, api.couchUrl)
          .then(() => expectTranslationDocs('en', 'fr'))
          .then(() => getTranslationDoc('en'))
          .then(messagesEn => {
            assert.deepEqual(messagesEn.custom, { one: 'one' });
            assert.deepEqual(messagesEn.generic, {});
            assert(!messagesEn.values);
          })
          .then(() => getTranslationDoc('fr'))
          .then(messagesFr => {
            assert.deepEqual(messagesFr.custom, { one: 'un(e)' });
            assert.deepEqual(messagesFr.generic, {});
            assert(!messagesFr.values);
          });
      });

      it('should upload translations containing equals signs', () => {
        return uploadCustomTranslations(`${testProjectDir}contains-equals`, api.couchUrl)
          .then(() => expectTranslationDocs('en'))
          .then(() => getTranslationDoc('en'))
          .then(messagesEn => {
            assert.deepEqual(messagesEn.custom, {
              'some.words':'one equals one',
              'some.maths':'1 + 1 = 2',
            });
            assert.deepEqual(messagesEn.generic, {});
            assert(!messagesEn.values);
          });
      });
    });
  });
});
