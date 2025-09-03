const { expect } = require('chai');
const { DOMParser } = require('@xmldom/xmldom');
const validation = require('../../../../src/lib/validation/form/db-doc-is-valid.js');

const XFORM_PATH = '/path/to/form.xml';
const ERROR_HEADER = `Form at ${XFORM_PATH} contains invalid db-doc configuration:`;

const runValidation = (xmlString) => {
  const xmlDoc = new DOMParser().parseFromString(xmlString, 'text/xml');
  return validation.execute({ xmlDoc, xformPath: XFORM_PATH });
};

describe('db-doc-is-valid', () => {
  it('should return errors for multiple non-group fields with db-doc="true"', async () => {
    const form = `
      <?xml version="1.0"?>
      <h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml">
        <h:head>
          <model>
            <instance>
              <data id="ABC">
                <name db-doc="true">Harambe</name>
                <age db-doc="true">17</age>
              </data>
            </instance>
          </model>
        </h:head>
      </h:html>`;

    const result = await runValidation(form);

    expect(result).to.deep.equal({ errors: [
      ERROR_HEADER,
      '  - /data/name: the db-doc attribute must only be set on groups.',
      '  - /data/age: the db-doc attribute must only be set on groups.'
    ] });
  });

  it('should return error when db-doc group is missing type field', async () => {
    const form = `
      <?xml version="1.0"?>
      <h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml">
        <h:head>
          <model>
            <instance>
              <data id="ABC">
                <group db-doc="true">
                  <some_field>some_value</some_field>
                </group>
              </data>
            </instance>
          </model>
        </h:head>
      </h:html>`;

    const result = await runValidation(form);

    expect(result).to.deep.equal({ errors: [
      ERROR_HEADER,
      '  - /data/group: groups configured with the db-doc attribute must contain a valid type field.',
    ] });
  });

  it('should return empty errors array for a valid form', async () => {
    const form = `
      <?xml version="1.0"?>
      <h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml">
        <h:head>
          <model>
            <instance>
              <data id="ABC">
                <group db-doc="true">
                  <type tag="hidden"/>
                </group>
              </data>
            </instance>
          </model>
        </h:head>
      </h:html>`;

    const result = await runValidation(form);

    expect(result).to.deep.equal({ errors: [] });
  });
});
