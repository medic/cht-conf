const { expect } = require('chai');
const { DOMParser } = require('@xmldom/xmldom');
const validation = require('../../../src/lib/validation/forms-db-doc-ref-is-valid.js');

const deps = { DOMParser };

describe('forms-db-doc-ref-is-valid', () => {
  // Test Case 1: Reference to a node that does not exist
  it('should return error if referenced node does not exist', () => {
    const form = `
      <h:html xmlns:h="http://www.w3.org/1999/xhtml" xmlns:instance="http://www.medic.com/xforms">
        <h:head><h:title>My Form</h:title></h:head>
        <h:body>
          <input instance:db-doc-ref="../non_existent_group" />
        </h:body>
      </h:html>
    `;
    const result = validation.execute({ DOMParser }, form, 'form.xml');
    expect(result[0].errors[0]).to.include('references a non-existent node');
  });

  // Test Case 2: Reference to a node that is not a group
  it('should return error if referenced node is not a group', () => {
    const form = `
      <h:html xmlns:h="http://www.w3.org/1999/xhtml" xmlns:instance="http://www.medic.com/xforms">
        <h:head><h:title>My Form</h:title></h:head>
        <h:body>
          <calculate name="not_a_group" />
          <input instance:db-doc-ref="../calculate[@name='not_a_group']" />
        </h:body>
      </h:html>
    `;
    const result = validation.execute({ DOMParser }, form, 'form.xml');
    expect(result[0].errors[0]).to.include('which is not a group');
  });

  // Test Case 3: Reference to a group that is missing the db-doc attribute
  it('should return error if referenced group is missing db-doc attribute', () => {
    const form = `
      <h:html xmlns:h="http://www.w3.org/1999/xhtml" xmlns:instance="http://www.medic.com/xforms">
        <h:head><h:title>My Form</h:title></h:head>
        <h:body>
          <group name="patient_info">
            <name>test</name>
          </group>
          <input instance:db-doc-ref="../group[@name='patient_info']" />
        </h:body>
      </h:html>
    `;
    const result = validation.execute({ DOMParser }, form, 'form.xml');
    expect(result[0].errors[0]).to.include(`must have a 'db-doc="true"' attribute`);
  });

  // Test Case 4: A valid reference to a group with the db-doc attribute
  it('should return undefined for a valid reference to a db-doc group', () => {
    const form = `
      <h:html xmlns:h="http://www.w3.org/1999/xhtml" xmlns:instance="http://www.medic.com/xforms">
        <h:head><h:title>My Form</h:title></h:head>
        <h:body>
          <group name="patient_info" db-doc="true">
            <type>patient</type>
            <name>test</name>
          </group>
          <input instance:db-doc-ref="../group[@name='patient_info']" />
        </h:body>
      </h:html>
    `;
    const result = validation.execute({ DOMParser }, form, 'form.xml');
    expect(result).to.equal(undefined);
  });

  // Test Case 5: A valid reference to the root form node
  it('should return undefined for a valid reference to the root form node', () => {
    const form = `
      <h:html xmlns:h="http://www.w3.org/1999/xhtml" xmlns:instance="http://www.medic.com/xforms">
        <h:head><h:title>My Form</h:title></h:head>
        <h:body>
          <group name="the_root_group">
            <type>patient</type>
            <input instance:db-doc-ref="../*[1]" />
          </group>
        </h:body>
      </h:html>
    `;
    const result = validation.execute({ DOMParser }, form, 'form.xml');
    expect(result).to.equal(undefined);
  });
});