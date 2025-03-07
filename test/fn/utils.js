const { assert } = require('chai');
module.exports = {

  getTranslationDoc: (api, lang) => {
    return api.db.get(`messages-${lang}`)
      .then(doc => {
        assert.equal(doc.code, lang);
        assert.equal(doc.type, 'translations');
        return doc;
      });
  },

  expectTranslationDocs: (api, ...expectedLangs) => {
    const expectedIds = expectedLangs.map(lang => `messages-${lang}`);
    return api.db
      .allDocs()
      .then(res => {
        const actualIds = res.rows.filter(row => row.id.startsWith('messages-')).map(row => row.id);
        assert.deepEqual(actualIds, expectedIds);
      });
  }
};
