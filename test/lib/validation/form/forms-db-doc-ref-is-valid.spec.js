const { expect } = require('chai');
const { DOMParser } = require('@xmldom/xmldom');
const validation = require('../../../../src/lib/validation/form/forms-db-doc-ref-is-valid.js');

const domParser = new DOMParser();

describe('forms-db-doc-ref-is-valid', () => {
  it('should return error if referenced node does not exist', () => {
    const form = `<instance><data><meta><instanceID/></meta><name db-doc-ref="/data/non_existent_group"/></data></instance>`;
    const xmlDoc = domParser.parseFromString(form);
    const result = validation.execute({ xmlDoc, xformPath: 'form.xml' });
    expect(result.errors[0].errors[0]).to.include('must point to the primary instance node or a group');
  });

  it('should return error if referenced node is missing db-doc attribute', () => {
    const form = `<instance><data><meta><instanceID/></meta><other_group/><name db-doc-ref="/data/other_group"/></data></instance>`;
    const xmlDoc = domParser.parseFromString(form);
    const result = validation.execute({ xmlDoc, xformPath: 'form.xml' });
    expect(result.errors[0].errors[0]).to.include('must point to the primary instance node or a group');
  });

  it('should return empty errors for a valid reference to a db-doc group', () => {
    const form = `<instance><data><meta><instanceID/></meta><other_group db-doc="true"><type>person</type></other_group><name db-doc-ref="/data/other_group"/></data></instance>`;
    const xmlDoc = domParser.parseFromString(form);
    const result = validation.execute({ xmlDoc, xformPath: 'form.xml' });
    expect(result.errors).to.be.empty;
  });

  it('should return empty errors for a valid reference to the root instance node', () => {
    const form = `<instance><data><meta><instanceID/></meta><name db-doc-ref="/data"/></data></instance>`;
    const xmlDoc = domParser.parseFromString(form);
    const result = validation.execute({ xmlDoc, xformPath: 'form.xml' });
    expect(result.errors).to.be.empty;
  });
});