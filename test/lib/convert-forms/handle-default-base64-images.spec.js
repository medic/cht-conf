const { expect } = require('chai');
const { DOMParser } = require('@xmldom/xmldom');

const { getNodes, XPATH_MODEL, getNode } = require('../../../src/lib/forms-utils');
const { replaceBase64ImageDynamicDefaults } = require('../../../src/lib/convert-forms/handle-default-base64-images');

const parser = new DOMParser();

const wrapInXForm = ({ instanceInnerXml = '', bodyInnerXml = '', setvalueInnerXml = '' }) => `
<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/1999/xhtml" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <model>
      <instance>
        <data id="abc">
          ${instanceInnerXml}
        </data>
      </instance>
      ${setvalueInnerXml}
    </model>
  </h:head>
  <h:body>
    ${bodyInnerXml}
  </h:body>
</h:html>`;

const getXmlDocWith = (parts) => parser.parseFromString(wrapInXForm(parts), 'text/xml');

describe('Handle default base64 images', () => {
  it('moves dynamic default value to instance for display-base64-image fields', () => {
    const doc = getXmlDocWith({
      instanceInnerXml: `<image_field type="binary"/>`,
      setvalueInnerXml: `
        <setvalue ref="/data/image_field" value="iVBORw0KGgoVORK5CYII=" event="odk-instance-first-load"/>
      `,
      bodyInnerXml: `
        <input ref="/data/image_field" appearance="display-base64-image">
          <label>Image Field</label>
        </input>
      `
    });

    replaceBase64ImageDynamicDefaults(doc);

    expect(getNodes(doc, `${XPATH_MODEL}/setvalue`)).to.be.empty;
    expect(getNode(doc, `${XPATH_MODEL}/instance/data/image_field`).textContent).to.equal(
      'iVBORw0KGgoVORK5CYII='
    );
  });

  it('does not affect fields without the display-base64-image appearance', () => {
    const doc = getXmlDocWith({
      instanceInnerXml: `
        <image_field type="binary"/>
        <other_field type="binary"/>`,
      setvalueInnerXml: `
        <setvalue ref="/data/image_field" value="iVBORw0KGgoVORK5CYII=" event="odk-instance-first-load"/>
        <setvalue ref="/data/other_field" value="iVBORw0KGgoVORK5CYII=" event="odk-instance-first-load"/>
      `,
      bodyInnerXml: `
        <input ref="/data/image_field" appearance="some-other-appearance">
          <label>Image Field</label>
        </input>
        <input ref="/data/other_field"/>
      `
    });

    replaceBase64ImageDynamicDefaults(doc);

    expect(getNodes(doc, `${XPATH_MODEL}/setvalue`)).to.have.length(2);
    expect(getNode(doc, `${XPATH_MODEL}/instance/data/image_field`).textContent).to.equal('');
    expect(getNode(doc, `${XPATH_MODEL}/instance/data/other_field`).textContent).to.equal('');
  });

  it('does not affect input fields that are not present in the instance', () => {
    const doc = getXmlDocWith({
      instanceInnerXml: `<other_image_field type="binary"/>`,
      setvalueInnerXml: `
        <setvalue ref="/data/image_field" value="iVBORw0KGgoVORK5CYII=" event="odk-instance-first-load"/>
      `,
      bodyInnerXml: `
        <input ref="/data/image_field" appearance="display-base64-image">
          <label>Image Field</label>
        </input>
      `
    });

    replaceBase64ImageDynamicDefaults(doc);

    expect(getNodes(doc, `${XPATH_MODEL}/setvalue`)).to.have.length(1);
    expect(getNode(doc, `${XPATH_MODEL}/instance/data/other_image_field`).textContent).to.equal('');
  });

  it('does not affect display-base64-image fields without dynamic default values', () => {
    const doc = getXmlDocWith({
      instanceInnerXml: `
        <image_field/>
        <other_field type="binary"/>
        <another_field type="binary"/>
      `,
      setvalueInnerXml: `
        <setvalue ref="/data/other_field" value="" event="odk-instance-first-load" />
        <setvalue ref="/data/another_field" value="iVBORw0KGasdfasdfgoVORK5CYII=" />
      `,
      bodyInnerXml: `
        <input ref="/data/image_field" appearance="display-base64-image">
          <label>Image Field</label>
        </input>
        <input ref="/data/other_field" appearance="display-base64-image"/>
        <input ref="/data/another_field" appearance="display-base64-image"/>
      `
    });

    replaceBase64ImageDynamicDefaults(doc);

    expect(getNodes(doc, `${XPATH_MODEL}/setvalue`)).to.have.length(2);
    expect(getNode(doc, `${XPATH_MODEL}/instance/data/image_field`).textContent).to.equal('');
    expect(getNode(doc, `${XPATH_MODEL}/instance/data/other_field`).textContent).to.equal('');
    expect(getNode(doc, `${XPATH_MODEL}/instance/data/another_field`).textContent).to.equal('');
  });

  it('handles multiple display-base64-image fields with defaults', () => {
    const doc = getXmlDocWith({
      instanceInnerXml: `
        <image1_field/>
        <group>
          <image2_field/>
        </group>
        <image3_field/>
      `,
      setvalueInnerXml: `
        <setvalue ref="/data/image1_field" value="iVBORw0KGasdfasdfgoVORK5CYII=" event="odk-instance-first-load"/>
        <setvalue ref="/data/group/image2_field" value="iasdfsVBORw0KGgoVORK5CYII===" event="odk-instance-first-load"/>
        <setvalue ref="/data/image3_field" value="sdfojapsour90j23223==" event="odk-instance-first-load"/>
      `,
      bodyInnerXml: `
        <input ref="/data/image1_field" appearance="other-appearance display-base64-image">
          <label>Image 1</label>
        </input>
        <group appearance="field-list summary" ref="/data/group">
          <input ref="/data/group/image2_field" appearance="display-base64-image some-other-appearance">
            <label>Image 2</label>
          </input>
        </group>
        <input ref="/data/image3_field" appearance="display-base64-image"/>
      `
    });

    replaceBase64ImageDynamicDefaults(doc);

    expect(getNodes(doc, `${XPATH_MODEL}/setvalue`)).to.be.empty;
    expect(getNode(doc, `${XPATH_MODEL}/instance/data/image1_field`).textContent).to.equal(
      'iVBORw0KGasdfasdfgoVORK5CYII='
    );
    expect(getNode(doc, `${XPATH_MODEL}/instance/data/group/image2_field`).textContent).to.equal(
      'iasdfsVBORw0KGgoVORK5CYII==='
    );
    expect(getNode(doc, `${XPATH_MODEL}/instance/data/image3_field`).textContent).to.equal(
      'sdfojapsour90j23223=='
    );
  });
});
