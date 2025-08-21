const { expect } = require('chai');
const { DOMParser } = require('@xmldom/xmldom');
const validation = require('../../../../src/lib/validation/form/forms-db-doc-is-valid.js');

const domParser = new DOMParser();

describe('forms-db-doc-is-valid', () => {
  it('should return error when db-doc is not a group', () => {
    const form = `
      <h:html>
        <h:head><h:title>My Form</h:title></h:head>
        <h:body>
          <calculate db-doc="true" name="patient_id" />
        </h:body>
      </h:html>
    `;
    const xmlDoc = domParser.parseFromString(form);
    const result = validation.execute({ xmlDoc, xformPath: 'form.xml' });
    expect(result.errors).to.deep.equal([{
      header: 'Form at form.xml contains invalid db-doc configuration:',
      errors: [' - calculate: the db-doc attribute must only be set on groups.'],
    }]);
  });

  it('should return error when db-doc group is missing type field', () => {
    const form = `
      <h:html>
        <h:head><h:title>My Form</h:title></h:head>
        <h:body>
          <group db-doc="true" name="patient_profile">
            <name>John</name>
          </group>
        </h:body>
      </h:html>
    `;
    const xmlDoc = domParser.parseFromString(form);
    const result = validation.execute({ xmlDoc, xformPath: 'form.xml' });
    expect(result.errors).to.deep.equal([{
      header: 'Form at form.xml contains invalid db-doc configuration:',
      errors: [' - group: groups configured with the db-doc attribute must contain a valid type field.'],
    }]);
  });

  it('should return empty errors array for a valid form', () => {
    const form = `
      <h:html>
        <h:head><h:title>My Form</h:title></h:head>
        <h:body>
          <group db-doc="true" name="patient_profile">
            <type>patient</type>
            <name>Jane</name>
          </group>
        </h:body>
      </h:html>
    `;
    const xmlDoc = domParser.parseFromString(form);
    const result = validation.execute({ xmlDoc, xformPath: 'form.xml' });
    expect(result.errors).to.be.empty;
  });
});
