const chai = require('chai');
chai.use(require('chai-exclude'));
const sinon = require('sinon');
const rewire = require('rewire');

const api = require('../api-stub');
const logger = require('../../src/lib/log');
const warnUploadOverwrite = require('../../src/lib/warn-upload-overwrite');
const uploadIndexes = rewire('../../src/fn/upload-indexes');
const environment = require('../../src/lib/environment');
const testProjectDir = './data/upload-indexes/';
const mockTestDir = testDir => sinon.stub(environment, 'pathToProject').get(() => `${testProjectDir}${testDir}`);

const getDoc = () => api.db.get('indexes');
const getIndexes = () => api.db.getIndexes();

describe('upload indexes', () => {
  beforeEach(() => {
    sinon.stub(environment, 'isArchiveMode').get(() => false);
    sinon.stub(warnUploadOverwrite, 'preUploadDoc');
    sinon.stub(warnUploadOverwrite, 'postUploadDoc');
    sinon.spy(logger, 'info');
    sinon.spy(logger, 'warn');
    return api.start();
  });
  afterEach(() => {
    sinon.restore();
    return api.stop();
  });

  it('should do nothing when no mapping', () => {
    const testDir = `no-mapping`;
    mockTestDir(testDir);
    return uploadIndexes
      .execute()
      .then(() => {
        chai.expect(warnUploadOverwrite.preUploadDoc.callCount).to.equal(0);
        chai.expect(warnUploadOverwrite.postUploadDoc.callCount).to.equal(0);
        chai.expect(logger.warn.callCount).to.equal(1);
        const msg = logger.warn.args[0][0];
        chai.expect(msg.startsWith('No indexes mapping file found at path')).to.equal(true);
      })
      .then(() => getDoc())
      .then(() => chai.assert.fail('doc should not exist'))
      .catch(err => {
        chai.expect(err.status).to.equal(404);
      });
  });

  it('should handle normal upload', () => {
    const testDir = 'normal';
    mockTestDir(testDir);
    warnUploadOverwrite.preUploadDoc.returns(true);
    return uploadIndexes
      .execute()
      .then(() => {
        chai.expect(warnUploadOverwrite.preUploadDoc.callCount).to.equal(1);
        chai.expect(warnUploadOverwrite.postUploadDoc.callCount).to.equal(1);
      })
      .then(() => getDoc())
      .then(doc => {
        chai.expect(doc).excludingEvery(['_rev', 'revpos', 'digest']).to.deep.equal({
          _id: 'indexes',
          'indexes': {
            'testing_by_id_and_type': {
              'fields': ['_id', 'type'],
              'partial_filter_selector': {
                'type': { '$nin': ['form', 'translations', 'meta'] },
                '_id': { '$nin': ['branding', 'extension-libs', 'resources'] }
              }
            },
          }
        });
      })
      .then(() => getIndexes())
      .then(result => {
        chai.expect(result.total_rows).to.equal(2);
        chai.expect(result.indexes[1]).excludingEvery(['_rev']).to.deep.equal({
          'ddoc': '_design/testing_by_id_and_type',
          'def': {
            'fields': [
              {
                '_id': 'asc'
              },
              {
                'type': 'asc'
              }
            ],
            'partial_filter_selector': {
              '_id': {
                '$nin': [
                  'branding',
                  'extension-libs',
                  'resources'
                ]
              },
              'type': {
                '$nin': [
                  'form',
                  'translations',
                  'meta'
                ]
              }
            }
          },
          'name': 'testing_by_id_and_type',
          'type': 'json'
        });
      });
  });

  it('should handle update', () => {
    const testDir = 'normal';
    mockTestDir(testDir);
    warnUploadOverwrite.preUploadDoc.returns(true);
    return uploadIndexes
      .execute()
      .then(() => getDoc())
      .then(doc => {
        chai.expect(doc).excludingEvery(['_rev', 'revpos', 'digest']).to.deep.equal({
          _id: 'indexes',
          'indexes': {
            'testing_by_id_and_type': {
              'fields': ['_id', 'type'],
              'partial_filter_selector': {
                'type': { '$nin': ['form', 'translations', 'meta'] },
                '_id': { '$nin': ['branding', 'extension-libs', 'resources'] }
              }
            },
          }
        });
      })
      .then(() => getIndexes())
      .then(result => {
        chai.expect(result.total_rows).to.equal(2);
        chai.expect(result.indexes[1]).excludingEvery(['_rev']).to.deep.equal({
          'ddoc': '_design/testing_by_id_and_type',
          'def': {
            'fields': [
              {
                '_id': 'asc'
              },
              {
                'type': 'asc'
              }
            ],
            'partial_filter_selector': {
              '_id': {
                '$nin': [
                  'branding',
                  'extension-libs',
                  'resources'
                ]
              },
              'type': {
                '$nin': [
                  'form',
                  'translations',
                  'meta'
                ]
              }
            }
          },
          'name': 'testing_by_id_and_type',
          'type': 'json'
        });
      })
      .then(() => {
        const testDir = 'update';
        mockTestDir(testDir);

        return uploadIndexes.execute();
      })
      .then(() => getDoc())
      .then(doc => {
        chai.expect(doc).excludingEvery(['_rev', 'revpos', 'digest']).to.deep.equal({
          _id: 'indexes',
          'indexes': {
            'testing_by_id_and_type': {
              'fields': ['_id', 'type'],
              'partial_filter_selector': {
                'type': { '$nin': ['form', 'translations'] },
                '_id': { '$nin': ['branding', 'extension-libs'] }
              }
            },
          }
        });
      })
      .then(() => getIndexes())
      .then(result => {
        chai.expect(result.total_rows).to.equal(2);
        chai.expect(result.indexes[1]).excludingEvery(['_rev']).to.deep.equal({
          'ddoc': '_design/testing_by_id_and_type',
          'def': {
            'fields': [
              {
                '_id': 'asc'
              },
              {
                'type': 'asc'
              }
            ],
            'partial_filter_selector': {
              '_id': {
                '$nin': [
                  'branding',
                  'extension-libs'
                ]
              },
              'type': {
                '$nin': [
                  'form',
                  'translations'
                ]
              }
            }
          },
          'name': 'testing_by_id_and_type',
          'type': 'json'
        });
      });
  });

  it('should handle delete', () => {
    const testDir = 'normal';
    mockTestDir(testDir);
    warnUploadOverwrite.preUploadDoc.returns(true);
    return uploadIndexes
      .execute()
      .then(() => getDoc())
      .then(doc => {
        chai.expect(doc).excludingEvery(['_rev', 'revpos', 'digest']).to.deep.equal({
          _id: 'indexes',
          'indexes': {
            'testing_by_id_and_type': {
              'fields': ['_id', 'type'],
              'partial_filter_selector': {
                'type': { '$nin': ['form', 'translations', 'meta'] },
                '_id': { '$nin': ['branding', 'extension-libs', 'resources'] }
              }
            },
          }
        });
      })
      .then(() => getIndexes())
      .then(result => {
        chai.expect(result.total_rows).to.equal(2);
        chai.expect(result.indexes[1]).excludingEvery(['_rev']).to.deep.equal({
          'ddoc': '_design/testing_by_id_and_type',
          'def': {
            'fields': [
              {
                '_id': 'asc'
              },
              {
                'type': 'asc'
              }
            ],
            'partial_filter_selector': {
              '_id': {
                '$nin': [
                  'branding',
                  'extension-libs',
                  'resources'
                ]
              },
              'type': {
                '$nin': [
                  'form',
                  'translations',
                  'meta'
                ]
              }
            }
          },
          'name': 'testing_by_id_and_type',
          'type': 'json'
        });
      })
      .then(() => {
        const testDir = 'delete';
        mockTestDir(testDir);

        return uploadIndexes.execute();
      })
      .then(() => getDoc())
      .then(doc => {
        chai.expect(doc).excludingEvery(['_rev', 'revpos', 'digest']).to.deep.equal({
          _id: 'indexes',
          'indexes': {}
        });
      })
      .then(() => getIndexes())
      .then(result => {
        chai.expect(result.total_rows).to.equal(1);
        chai.expect(result.indexes[0].type).to.equal('special');
      });
  });

  it('should not upload when no changes', () => {
    const testDir = `no-changes`;
    mockTestDir(testDir);
    warnUploadOverwrite.preUploadDoc.returns(false);
    return uploadIndexes
      .execute()
      .then(() => {
        chai.expect(warnUploadOverwrite.preUploadDoc.callCount).to.equal(1);
        chai.expect(warnUploadOverwrite.postUploadDoc.callCount).to.equal(1);
      })
      .then(() => getDoc())
      .then(() => chai.assert.fail('Should have thrown'))
      .catch(err => {
        chai.expect(err.status).to.equal(404);
      });
  });

  it('should handle multi index diff', () => {
    const testDir = 'normal';
    mockTestDir(testDir);
    warnUploadOverwrite.preUploadDoc.returns(true);
    return uploadIndexes
      .execute()
      .then(() => getDoc())
      .then(doc => {
        chai.expect(doc).excludingEvery(['_rev', 'revpos', 'digest']).to.deep.equal({
          _id: 'indexes',
          'indexes': {
            'testing_by_id_and_type': {
              'fields': ['_id', 'type'],
              'partial_filter_selector': {
                'type': { '$nin': ['form', 'translations', 'meta'] },
                '_id': { '$nin': ['branding', 'extension-libs', 'resources'] }
              }
            },
          }
        });
      })
      .then(() => getIndexes())
      .then(result => {
        chai.expect(result.total_rows).to.equal(2);
        chai.expect(result.indexes[1]).excludingEvery(['_rev']).to.deep.equal({
          'ddoc': '_design/testing_by_id_and_type',
          'def': {
            'fields': [
              {
                '_id': 'asc'
              },
              {
                'type': 'asc'
              }
            ],
            'partial_filter_selector': {
              '_id': {
                '$nin': [
                  'branding',
                  'extension-libs',
                  'resources'
                ]
              },
              'type': {
                '$nin': [
                  'form',
                  'translations',
                  'meta'
                ]
              }
            }
          },
          'name': 'testing_by_id_and_type',
          'type': 'json'
        });
      })
      .then(() => {
        const testDir = 'multi-index-diff-check';
        mockTestDir(testDir);

        return uploadIndexes.execute();
      })
      .then(() => getDoc())
      .then(doc => {
        chai.expect(doc).excludingEvery(['_rev', 'revpos', 'digest']).to.deep.equal({
          _id: 'indexes',
          'indexes': {
            'testing_by_id_and_type': {
              'fields': ['_id', 'type'],
              'partial_filter_selector': {
                'type': { '$nin': ['form', 'translations'] },
                '_id': { '$nin': ['branding', 'extension-libs', 'resources'] }
              }
            },
            'test_diff_check': {
              'fields': ['_id', 'name'],
              'partial_filter_selector': {
                'type': { '$nin': ['form', 'translations', 'meta'] },
                '_id': { '$nin': ['branding', 'extension-libs', 'resources'] }
              }
            }
          }
        });
      })
      .then(() => getIndexes())
      .then(result => {
        chai.expect(logger.warn.args).to.deep.equal([
          [
            'The "testing_by_id_and_type" index config differs from what is saved and has been deleted for recreation.'
          ]
        ]);
        chai.expect(logger.warn.callCount).to.equal(1);
        chai.expect(result.total_rows).to.equal(3);
        chai.expect(result.indexes[1]).excludingEvery(['_rev']).to.deep.equal({
          'ddoc': '_design/test_diff_check',
          'def': {
            'fields': [
              {
                '_id': 'asc'
              },
              {
                'name': 'asc'
              }
            ],
            'partial_filter_selector': {
              '_id': {
                '$nin': [
                  'branding',
                  'extension-libs',
                  'resources'
                ]
              },
              'type': {
                '$nin': [
                  'form',
                  'translations',
                  'meta'
                ]
              }
            }
          },
          'name': 'test_diff_check',
          'type': 'json'
        });
        chai.expect(result.indexes[2]).excludingEvery(['_rev']).to.deep.equal({
          'ddoc': '_design/testing_by_id_and_type',
          'def': {
            'fields': [
              {
                '_id': 'asc'
              },
              {
                'type': 'asc'
              }
            ],
            'partial_filter_selector': {
              '_id': {
                '$nin': [
                  'branding',
                  'extension-libs',
                  'resources'
                ]
              },
              'type': {
                '$nin': [
                  'form',
                  'translations',
                ]
              }
            }
          },
          'name': 'testing_by_id_and_type',
          'type': 'json'
        });
      });
  });
});
