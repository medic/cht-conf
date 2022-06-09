const { expect } = require('chai');

const hasInstanceId = require('../../../../src/lib/validation/form/has-instance-id');

const xformPath = '/my/form/path/form.xml';
const getXml = (metaNodes = '') => `
<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <h:title>No Instance ID</h:title>
    <model>
      <instance>
        <data id="ABC" version="2015-06-05">
          <name/>
        </data>
      </instance>
      <bind nodeset="/data/name" type="string" />        
      <meta>
        ${metaNodes}
      </meta>
    </model>
  </h:head>
  <h:body>
    <input ref="/data/name">
      <label>What is the name?</label>
    </input>
  </h:body>
</h:html>`;

describe('has-instance-id', () => {
  it('should resolve OK when form has instance id', () => {
    return hasInstanceId.execute({ xformPath, xmlStr: getXml('<instanceID/>') })
      .then(output => {
        expect(output.warnings).is.empty;
        expect(output.errors).is.empty;
      });
  });

  it('should return error when form does not have an instance id', () => {
    return hasInstanceId.execute({ xformPath, xmlStr: getXml() })
      .then(output => {
        expect(output.warnings).is.empty;
        expect(output.errors).deep
          .equals([`Form at ${xformPath} appears to be missing <meta><instanceID/></meta> node. This form will not work on CHT webapp.`]);
      });
  });
});
