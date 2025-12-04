const { expect } = require('chai');
const { handleDbDocRefs } = require('../../../src/lib/convert-forms/handle-db-doc-ref');
const { createXformDoc, createXformString, serializeToString, FORM_ID } = require('../../fn/convert-forms.utils');

describe('Handle db-doc-ref attributes', () => {
  it('replaces form references with references to the primary instance node name', () => {
    const doc = createXformDoc({
      primaryInstance: `<test db-doc-ref="/${FORM_ID}"/>`,
    });

    handleDbDocRefs(doc);

    const expectedDoc = createXformString({
      primaryInstance: `<test db-doc-ref="/data"/>`,
    });
    expect(serializeToString(doc)).xml.to.equal(expectedDoc);
  });

  it('replaces relative paths with absolute paths', () => {
    const doc = createXformDoc({
      primaryInstance: `
        <test db-doc-ref="../group/other"/>
        <group db-doc="true">
          <other db-doc-ref="../../../data"/>
        </group>        
      `,
    });

    handleDbDocRefs(doc);

    const expectedDoc = createXformString({
      primaryInstance: `
        <test db-doc-ref="/data/group/other"/>
        <group db-doc="true">
          <other db-doc-ref="/data"/>
        </group>        
      `,
    });
    expect(serializeToString(doc)).xml.to.equal(expectedDoc);
  });

  it('leaves db-doc-ref unchanged when it is not a form reference or relative path', () => {
    const opts = {
      primaryInstance: `
        <test db-doc-ref=""/>
        <test1 db-doc-ref="concat('count', /data/other_field)"/>
        <test2 db-doc-ref="some value"/>
        <test3 db-doc-ref="/test"/>
        <test3 db-doc="../test"/>
      `,
    };
    const doc = createXformDoc(opts);

    handleDbDocRefs(doc);

    const expectedDoc = createXformString(opts);
    expect(serializeToString(doc)).xml.to.equal(expectedDoc);
  });
});
