const { expect } = require('chai');
const { DOMParser } = require('@xmldom/xmldom');
const validation = require('../../../../src/lib/validation/form/db-doc-ref-is-valid.js');

const XFORM_PATH = '/path/to/form.xml';
const ERROR_HEADER = `Form at ${XFORM_PATH} contains invalid db-doc-ref configuration. A db-doc-ref value should point `
  + `to either the root node of the form or to a group that is adding a new doc (with db-doc set to "true"):`;

const domParser = new DOMParser();
const getXmlDocString = (instance) => domParser.parseFromString(`
  <?xml version="1.0"?>
  <h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml">
    <h:head>
      <model>
        <instance>
          ${instance}
        </instance>
      </model>
    </h:head>
  </h:html>`,
'text/xml'
);

describe('db-doc-ref-is-valid', () => {
  it('returns errors for invalid db-doc-ref targets', () => {
    const xmlDoc = getXmlDocString(`
      <data id="ABC">
        <group_a>
          <type tag="hidden"/>
        </group_a>
        <ref1 db-doc-ref="/data/group_a"/>
        <ref2 db-doc-ref="/data/missing_group"/>
      </data>`);

    const result = validation.execute({ xmlDoc, xformPath: XFORM_PATH });

    expect(result).to.deep.equal({ errors: [
      ERROR_HEADER,
      '  - /data/ref1: the db-doc-ref value [data/group_a] does not reference a valid doc node.',
      '  - /data/ref2: the db-doc-ref value [data/missing_group] does not reference a valid doc node.'
    ]});
  });

  it('succeeds when referencing the root node', () => {
    const xmlDoc = getXmlDocString(`
      <data id="ABC">
        <ref1 db-doc-ref="/data"/>
      </data>`);

    const result = validation.execute({ xmlDoc, xformPath: XFORM_PATH });
    expect(result).to.deep.equal({ errors: [] });
  });

  it('succeeds when referencing a group with db-doc="true"', () => {
    const xmlDoc = getXmlDocString(`
      <data id="ABC">
        <doc_group db-doc="true">
          <type/>
        </doc_group>
        <ref1 db-doc-ref="   /data/doc_group   "/>
      </data>`);

    const result = validation.execute({ xmlDoc, xformPath: XFORM_PATH });
    expect(result).to.deep.equal({ errors: [] });
  });

  it('succeeds when no db-doc-ref node exists', () => {
    const xmlDoc = getXmlDocString(`
      <data id="ABC">
        <doc_group>
          <type tag="hidden"/>
        </doc_group>
        <ref1/>
      </data>`);

    const result = validation.execute({ xmlDoc, xformPath: XFORM_PATH });
    expect(result).to.deep.equal({ errors: [] });
  });
});
