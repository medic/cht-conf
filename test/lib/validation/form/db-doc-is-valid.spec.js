const { expect } = require('chai');
const { DOMParser } = require('@xmldom/xmldom');
const validation = require('../../../../src/lib/validation/form/db-doc-is-valid.js');

const runValidation = (xmlString) => {
  const xmlDoc = new DOMParser().parseFromString(xmlString, 'text/xml');
  return validation.execute({ xmlDoc, xformPath: '/path/to/form.xml' });
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

    const { errors } = await runValidation(form);
    expect(errors.length).to.equal(3);
    expect(errors[0]).to.include('invalid db-doc configuration');
    expect(errors[1]).to.include('Found on: <name>');
    expect(errors[2]).to.include('Found on: <age>');
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

    const { errors } = await runValidation(form);
    expect(errors.length).to.equal(2);
    expect(errors[1]).to.include('groups must contain a field with name="type"');
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
                  <field name="type">person</field>
                </group>
              </data>
            </instance>
          </model>
        </h:head>
      </h:html>`;

    const { errors } = await runValidation(form);
    expect(errors).to.be.empty;
  });
});
