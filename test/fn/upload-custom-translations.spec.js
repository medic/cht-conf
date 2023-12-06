const { assert } = require('chai');
const sinon = require('sinon');
const readline = require('readline-sync');
const rpn = require('request-promise-native');
const rewire = require('rewire');
const apiStub = require('../api-stub');
const api = rewire('../../src/lib/api');
const environment = require('../../src/lib/environment');
const log = require('../../src/lib/log');
const warnUploadOverwrite = rewire('../../src/lib/warn-upload-overwrite');
const getApiVersion = rewire('../../src/lib/get-api-version');
const uploadCustomTranslations = rewire('../../src/fn/upload-custom-translations');
const { getTranslationDoc,  expectTranslationDocs } = require('./utils');

describe('upload-custom-translations', () => {
  const testProjectDir = './data/upload-custom-translations/';
  let mockTestDir;

  api.__set__('request', rpn);
  warnUploadOverwrite.__set__('api', api);
  getApiVersion.__set__('api', api);
  uploadCustomTranslations.__set__('warnUploadOverwrite', warnUploadOverwrite);
  uploadCustomTranslations.__set__('getValidApiVersion', getApiVersion.getValidApiVersion);

  beforeEach(() => {
    mockTestDir = testDir => sinon.stub(environment, 'pathToProject').get(() => `${testProjectDir}${testDir}`);
    readline.keyInYN = () => true;
    sinon.stub(environment, 'isArchiveMode').get(() => false);
    sinon.stub(environment, 'skipTranslationCheck').get(() => false);
    sinon.stub(environment, 'force').get(() => false);
    return apiStub.start();
  });

  afterEach(async () => {
    sinon.restore();
    await apiStub.stop();
  });

  describe('medic-2.x', function () {
    this.timeout(60000);

    beforeEach(() => {
      // medic-client does not have deploy_info property
      return apiStub.db.put({ _id: '_design/medic-client' });
    });

    it('should upload simple translations', () => {
      // api/deploy-info endpoint doesn't exist
      apiStub.giveResponses(
        { status: 404, body: { error: 'not_found' } },
        {
          status: 200,
          body: { compressible_types: 'text/*, application/javascript, application/json, application/xml' },
        },
      );

      mockTestDir(`simple`);
      return uploadCustomTranslations.execute()
        .then(() => expectTranslationDocs(apiStub, 'en'))
        .then(() => getTranslationDoc(apiStub, 'en'))
        .then(messagesEn => {
          assert.deepEqual(messagesEn.values, { a:'first', b:'second', c:'third' });
          assert(!messagesEn.generic);
          assert(!messagesEn.custom);
        });
    });

    it('should upload translations for multiple languages', () => {
      // api/deploy-info endpoint doesn't exist
      apiStub.giveResponses(
        { status: 404, body: { error: 'not_found' } },
        {
          status: 200,
          body: { compressible_types: 'text/*, application/javascript, application/json, application/xml' },
        },
      );

      mockTestDir(`multi-lang`);
      return uploadCustomTranslations.execute()
        .then(() => expectTranslationDocs(apiStub, 'en', 'fr'))
        .then(() => getTranslationDoc(apiStub, 'en'))
        .then(messagesEn => {
          assert(messagesEn.name === 'English');
          assert.deepEqual(messagesEn.values, { one: 'one' });
          assert(!messagesEn.generic);
          assert(!messagesEn.custom);
        })
        .then(() => getTranslationDoc(apiStub, 'fr'))
        .then(messagesFr => {
          assert(messagesFr.name === 'Français (French)');
          assert.deepEqual(messagesFr.values, { one: 'un(e)' });
          assert(!messagesFr.generic);
          assert(!messagesFr.custom);
        });
    });

    it('should upload translations containing equals signs', () => {
      // api/deploy-info endpoint doesn't exist
      apiStub.giveResponses(
        { status: 404, body: { error: 'not_found' } },
      );

      mockTestDir(`contains-equals`);
      return uploadCustomTranslations.execute()
        .then(() => expectTranslationDocs(apiStub, 'en'))
        .then(() => getTranslationDoc(apiStub, 'en'))
        .then(messagesEn => {
          assert.deepEqual(messagesEn.values, {
            'some.words':'one equals one',
            'some.maths':'1 + 1 = 2',
          });
          assert(!messagesEn.generic);
          assert(!messagesEn.custom);
        });
    });

    it('should work correctly when falling back to testing messages-en', () => {
      // api/deploy-info endpoint doesn't exist
      apiStub.giveResponses(
        { status: 404, body: { error: 'not_found' } },
      );

      mockTestDir(`custom-lang`);
      return apiStub.db
        .put({
          _id: 'messages-en',
          code: 'en',
          name: 'English',
          type: 'translations',
          values: { a: 'first' }
        })
        .then(() => uploadCustomTranslations.execute())
        .then(() => expectTranslationDocs(apiStub, 'en', 'fr'))
        .then(() => getTranslationDoc(apiStub, 'en'))
        .then(messagesEn => {
          assert.deepEqual(messagesEn.values, { a:'first' });
          assert(!messagesEn.generic);
          assert(!messagesEn.custom);
        })
        .then(() => getTranslationDoc(apiStub, 'fr'))
        .then(messagesFr => {
          assert.deepEqual(messagesFr.values, { one: 'un(e)' });
          assert(!messagesFr.generic);
          assert(!messagesFr.custom);
        });
    });

    it('should set default name for unknown language', () => {
      // api/deploy-info endpoint doesn't exist
      apiStub.giveResponses(
        { status: 404, body: { error: 'not_found' } },
      );

      mockTestDir(`unknown-lang`);
      sinon.replace(log, 'warn', sinon.fake());
      return uploadCustomTranslations.execute()
        .then(() => expectTranslationDocs(apiStub, 'qp'))
        .then(() => getTranslationDoc(apiStub, 'qp'))
        .then(messagesQp => {
          assert(messagesQp.name === 'TODO: please ask admin to set this in settings UI');
          assert(log.warn.lastCall.calledWithMatch('\'qp\' is not a recognized ISO 639 language code, please ask admin to set the name'));
        });
    });
  });

  describe('medic-3.x', () => {
    describe('3.0.0', function () {
      this.timeout(60000);

      beforeEach(() => {
        readline.keyInYN = () => true;
        readline.keyInSelect = () => 0;
        return apiStub.db.put({ _id: '_design/medic-client', deploy_info: { version: '3.0.0' } });
      });

      it('should upload simple translations', () => {
        // api/deploy-info endpoint doesn't exist
        apiStub.giveResponses(
          { status: 404, body: { error: 'not_found' } },
        );
        mockTestDir(`simple`);
        return uploadCustomTranslations.execute()
          .then(() => expectTranslationDocs(apiStub, 'en'))
          .then(() => getTranslationDoc(apiStub, 'en'))
          .then(messagesEn => {
            assert.deepEqual(messagesEn.values, { a:'first', b:'second', c:'third' });
            assert(!messagesEn.generic);
            assert(!messagesEn.custom);
          });
      });

      it('should upload translations for multiple languages', () => {
        // api/deploy-info endpoint doesn't exist
        apiStub.giveResponses(
          { status: 404, body: { error: 'not_found' } },
        );
        mockTestDir(`multi-lang`);
        return uploadCustomTranslations.execute()
          .then(() => expectTranslationDocs(apiStub, 'en', 'fr'))
          .then(() => getTranslationDoc(apiStub, 'en'))
          .then(messagesEn => {
            assert(messagesEn.name === 'English');
            assert.deepEqual(messagesEn.values, { one: 'one' });
            assert(!messagesEn.generic);
            assert(!messagesEn.custom);
          })
          .then(() => getTranslationDoc(apiStub, 'fr'))
          .then(messagesFr => {
            assert(messagesFr.name === 'Français (French)');
            assert.deepEqual(messagesFr.values, { one: 'un(e)' });
            assert(!messagesFr.generic);
            assert(!messagesFr.custom);
          });
      });

      it('should upload translations containing equals signs', () => {
        // api/deploy-info endpoint doesn't exist
        apiStub.giveResponses(
          { status: 404, body: { error: 'not_found' } },
        );
        mockTestDir(`contains-equals`);
        return uploadCustomTranslations.execute()
          .then(() => expectTranslationDocs(apiStub, 'en'))
          .then(() => getTranslationDoc(apiStub, 'en'))
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
        mockTestDir(`with-customs`);
        return apiStub.db
          .put({
            _id: 'messages-en',
            code: 'en',
            name: 'English',
            type: 'translations',
            values: { a:'first', from_custom:'third' }
          })
          .then(() => uploadCustomTranslations.execute())
          .then(() => expectTranslationDocs(apiStub, 'en'))
          .then(() => getTranslationDoc(apiStub, 'en'))
          .then(messagesEn => {
            assert.deepEqual(messagesEn.values, { a:'first', from_custom: 'overwritten', from_custom_new: 'new' });
            assert(!messagesEn.generic);
            assert(!messagesEn.custom);
          });
      });

      it('should error for malformed translation files', () => {
        mockTestDir(`with-customs`);
        return apiStub.db
          .put({
            _id: 'messages-en',
            code: 'en',
            name: 'English',
            type: 'translations'
          })
          .then(() => uploadCustomTranslations.execute())
          .catch(err => {
            assert.equal(err.message, 'Existent translation doc messages-en is malformed');
          });
      });

      it('should set default name for unknown language', () => {
        mockTestDir(`unknown-lang`);
        return uploadCustomTranslations.execute()
          .then(() => expectTranslationDocs(apiStub, 'qp'))
          .then(() => getTranslationDoc(apiStub, 'qp'))
          .then(messagesQp => {
            assert(messagesQp.name === 'TODO: please ask admin to set this in settings UI');
          });
      });
    });

    describe('3.4.0', function () {
      this.timeout(60000);

      beforeEach(() => {
        apiStub.db.put({ _id: '_design/medic-client', deploy_info: { version: '3.4.0' } });
      });

      it('should upload simple translations', () => {
        // api/deploy-info endpoint doesn't exist
        apiStub.giveResponses(
          { status: 404, body: { error: 'not_found' } },
        );
        mockTestDir(`simple`);
        return uploadCustomTranslations.execute()
          .then(() => expectTranslationDocs(apiStub, 'en'))
          .then(() => getTranslationDoc(apiStub, 'en'))
          .then(messagesEn => {
            assert.deepEqual(messagesEn.custom, { a:'first', b:'second', c:'third' });
            assert.deepEqual(messagesEn.generic, {});
            assert(!messagesEn.values);
          });
      });

      it('should upload translations for multiple languages', () => {
        // api/deploy-info endpoint doesn't exist
        apiStub.giveResponses(
          { status: 404, body: { error: 'not_found' } },
        );
        mockTestDir(`multi-lang`);
        return uploadCustomTranslations.execute()
          .then(() => expectTranslationDocs(apiStub, 'en', 'fr'))
          .then(() => getTranslationDoc(apiStub, 'en'))
          .then(messagesEn => {
            assert(messagesEn.name === 'English');
            assert.deepEqual(messagesEn.custom, { one: 'one' });
            assert.deepEqual(messagesEn.generic, {});
            assert(!messagesEn.values);
          })
          .then(() => getTranslationDoc(apiStub, 'fr'))
          .then(messagesFr => {
            assert(messagesFr.name === 'Français (French)');
            assert.deepEqual(messagesFr.custom, { one: 'un(e)' });
            assert.deepEqual(messagesFr.generic, {});
            assert(!messagesFr.values);
          });
      });

      it('should upload translations containing equals signs', () => {
        // api/deploy-info endpoint doesn't exist
        apiStub.giveResponses(
          { status: 404, body: { error: 'not_found' } },
        );
        mockTestDir(`contains-equals`);
        return uploadCustomTranslations.execute()
          .then(() => expectTranslationDocs(apiStub, 'en'))
          .then(() => getTranslationDoc(apiStub, 'en'))
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
        mockTestDir(`with-customs`);
        return apiStub.db
          .put({
            _id: 'messages-en',
            code: 'en',
            name: 'English',
            type: 'translations',
            generic: { a: 'first' },
            custom: { c: 'third' }
          })
          .then(() => uploadCustomTranslations.execute())
          .then(() => expectTranslationDocs(apiStub, 'en'))
          .then(() => getTranslationDoc(apiStub, 'en'))
          .then(messagesEn => {
            assert.deepEqual(messagesEn.generic, { a: 'first' });
            assert.deepEqual(messagesEn.custom, { from_custom: 'overwritten', from_custom_new: 'new' });
            assert(!messagesEn.values);
          });
      });

      it('should replace delete custom values', () => {
        mockTestDir(`no-customs`);
        return apiStub.db
          .put({
            _id: 'messages-en',
            code: 'en',
            name: 'English',
            type: 'translations',
            generic: { a: 'first' },
            custom: { c: 'third' }
          })
          .then(() => uploadCustomTranslations.execute())
          .then(() => expectTranslationDocs(apiStub, 'en'))
          .then(() => getTranslationDoc(apiStub, 'en'))
          .then(messagesEn => {
            assert.deepEqual(messagesEn.generic, { a: 'first' });
            assert.deepEqual(messagesEn.custom, { });
            assert(!messagesEn.values);
          });
      });

      it('should work correctly when falling back to testing messages-en', () => {
        // api/deploy-info endpoint doesn't exist
        apiStub.giveResponses(
          { status: 404, body: { error: 'not_found' } },
        );
        mockTestDir(`custom-lang`);
        // for *some* reason, medic-client doesn't have deploy-info
        return apiStub.db
          .get('_design/medic-client')
          .then(ddoc => {
            delete ddoc.deploy_info;
            return apiStub.db.put(ddoc);
          })
          .then(() => apiStub.db.put({
            _id: 'messages-en',
            code: 'en',
            name: 'English',
            type: 'translations',
            generic: { a: 'first' }
          }))
          .then(() => uploadCustomTranslations.execute())
          .then(() => expectTranslationDocs(apiStub, 'en', 'fr'))
          .then(() => getTranslationDoc(apiStub, 'en'))
          .then(messagesEn => {
            assert.deepEqual(messagesEn.generic, { a:'first' });
            assert(!messagesEn.custom);
            assert(!messagesEn.values);
          })
          .then(() => getTranslationDoc(apiStub, 'fr'))
          .then(messagesFr => {
            assert.deepEqual(messagesFr.custom, { one: 'un(e)' });
            assert.deepEqual(messagesFr.generic, {});
            assert(!messagesFr.values);
          });
      });

      it('should set default name for unknown language', () => {
        mockTestDir(`unknown-lang`);
        return uploadCustomTranslations.execute()
          .then(() => expectTranslationDocs(apiStub, 'qp'))
          .then(() => getTranslationDoc(apiStub, 'qp'))
          .then(messagesQp => {
            assert(messagesQp.name === 'TODO: please ask admin to set this in settings UI');
          });
      });
    });

    describe('3.5.0', function () {
      this.timeout(60000);
      beforeEach(() => {
        return apiStub.db.put({ _id: '_design/medic-client', deploy_info: { version: '3.5.0' } });
      });

      it('should upload simple translations', () => {
        // api/deploy-info endpoint exists
        apiStub.giveResponses(
          { status: 200, body: { version: '3.5.0' } },
        );
        mockTestDir(`simple`);
        return uploadCustomTranslations.execute()
          .then(() => expectTranslationDocs(apiStub, 'en'))
          .then(() => getTranslationDoc(apiStub, 'en'))
          .then(messagesEn => {
            assert.deepEqual(messagesEn.custom, { a:'first', b:'second', c:'third' });
            assert.deepEqual(messagesEn.generic, {});
            assert(!messagesEn.values);
          });
      });

      it('should upload translations for multiple languages', () => {
        // api/deploy-info endpoint exists
        apiStub.giveResponses(
          { status: 200, body: { version: '3.5.0' } },
        );
        mockTestDir(`multi-lang`);
        return uploadCustomTranslations.execute()
          .then(() => expectTranslationDocs(apiStub, 'en', 'fr'))
          .then(() => getTranslationDoc(apiStub, 'en'))
          .then(messagesEn => {
            assert(messagesEn.name === 'English');
            assert.deepEqual(messagesEn.custom, { one: 'one' });
            assert.deepEqual(messagesEn.generic, {});
            assert(!messagesEn.values);
          })
          .then(() => getTranslationDoc(apiStub, 'fr'))
          .then(messagesFr => {
            assert(messagesFr.name === 'Français (French)');
            assert.deepEqual(messagesFr.custom, { one: 'un(e)' });
            assert.deepEqual(messagesFr.generic, {});
            assert(!messagesFr.values);
          });
      });

      it('should upload translations containing equals signs', () => {
        // api/deploy-info endpoint exists
        apiStub.giveResponses({ status: 200, body: { version: '3.5.0' } });
        mockTestDir(`contains-equals`);
        return uploadCustomTranslations.execute()
          .then(() => expectTranslationDocs(apiStub, 'en'))
          .then(() => getTranslationDoc(apiStub, 'en'))
          .then(messagesEn => {
            assert.deepEqual(messagesEn.custom, {
              'some.words':'one equals one',
              'some.maths':'1 + 1 = 2',
            });
            assert.deepEqual(messagesEn.generic, {});
            assert(!messagesEn.values);
          });
      });

      it('should set default name for unknown language', () => {
        // api/deploy-info endpoint exists
        apiStub.giveResponses({ status: 200, body: { version: '3.5.0' } });
        mockTestDir(`unknown-lang`);
        return uploadCustomTranslations.execute()
          .then(() => expectTranslationDocs(apiStub, 'qp'))
          .then(() => getTranslationDoc(apiStub, 'qp'))
          .then(messagesQp => {
            assert(messagesQp.name === 'TODO: please ask admin to set this in settings UI');
          });
      });

      it('should properly upload translations containing escaped exclamation marks', () => {
        // api/deploy-info endpoint exists
        apiStub.giveResponses({ status: 200, body: { version: '3.5.0' } });
        mockTestDir(`escaped-exclamation`);
        return uploadCustomTranslations.execute()
          .then(() => expectTranslationDocs(apiStub, 'en'))
          .then(() => getTranslationDoc(apiStub, 'en'))
          .then(messagesEn => {
            assert.deepEqual(messagesEn.custom, {
              'one.escaped.exclamation':'one equals one!',
              'two.escaped.exclamation':'one equals one!!',
            });
            assert.deepEqual(messagesEn.generic, {});
            assert(!messagesEn.values);
          });
      });

      it('upload translations containing empty messages raises warn logs but works', () => {
        // api/deploy-info endpoint exists
        apiStub.giveResponses({ status: 200, body: { version: '3.5.0' } });
        mockTestDir('contains-empty-messages');
        sinon.replace(log, 'warn', sinon.fake());
        return uploadCustomTranslations.execute()
          .then(() => expectTranslationDocs(apiStub, 'en'))
          .then(() => {
            assert(log.warn.lastCall.calledWithMatch(
              '1 empty messages trying to compile translations'));
          });
      });

    });

  });

  describe('invalid language code', () => {

    const invalidLanguageCodesTest = (skipTranslationCheck) => {
      mockTestDir(`invalid-lang`);
      sinon.stub(environment, 'skipTranslationCheck').get(() => skipTranslationCheck);
      return uploadCustomTranslations.execute()
        .then(() => {
          assert.fail('Expected error to be thrown');
        })
        .catch(err => {
          assert.equal(err.message, 'The language code \'bad(code\' is not valid. It must begin with a letter(a-z, A-Z), followed by any number of hyphens, underscores, letters, or numbers.');
        });
    };

    it('should error for invalid language code', () => {
      return invalidLanguageCodesTest(false);
    });

    it('should crash for invalid language code even with --skip-translation-check passed', () => {
      // Flag `--skip-translation-check` aborts translation content checks, not filename checks
      return invalidLanguageCodesTest(true);
    });

  });

  it('invalid placeholders throws error', () => {
    mockTestDir('contains-placeholder-wrong');
    return uploadCustomTranslations.execute()
      .then(() => {
        assert.fail('Expected error to be thrown');
      })
      .catch(err => {
        assert.equal(
          err.message,
          'Found 1 errors trying to compile translations\n' +
          'You can use messages-ex.properties to add placeholders missing from the reference context.'
        );
      });
  });

  it('invalid messageformat throws error', () => {
    mockTestDir('contains-messageformat-wrong');
    return uploadCustomTranslations.execute()
      .then(() => {
        assert.fail('Expected error to be thrown');
      })
      .catch(err => {
        assert.equal(err.message, 'Found 1 errors trying to compile translations');
      });
  });

});
