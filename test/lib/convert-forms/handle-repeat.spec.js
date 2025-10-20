const { expect } = require('chai');
const { DOMParser } = require('@xmldom/xmldom');

const { getNodes, XPATH_MODEL } = require('../../../src/lib/forms-utils');
const { removeExtraRepeatInstance } = require('../../../src/lib/convert-forms/handle-repeat');

const parser = new DOMParser();

const wrapInXForm = (instanceInnerXml) => `
<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <model>
      <instance>
        <data id="abc">
          ${instanceInnerXml}
        </data>
      </instance>
    </model>
  </h:head>
  <h:body/>
</h:html>`;

const getXmlDocWith = (instanceInnerXml) => parser.parseFromString(wrapInXForm(instanceInnerXml), 'text/xml');

describe('Handle initial repeat entry', () => {
  it('removes the non-template initial entry and keeps the template node', () => {
    const doc = getXmlDocWith(`
      <repeat_field jr:template=""/>
      <repeat_field><a>1</a></repeat_field>
      <not_a_repeat/>
      <not_a_repeat>
        <a>hello</a>
      </not_a_repeat>  
    `);

    removeExtraRepeatInstance(doc);

    expect(getNodes(doc, `${XPATH_MODEL}/instance/data/repeat_field`)).to.have.length(1);
    expect(getNodes(doc, `${XPATH_MODEL}/instance/data/repeat_field[@jr:template=""]`)).to.have.length(1);
    expect(getNodes(doc, `${XPATH_MODEL}/instance/data/not_a_repeat`)).to.have.length(2);
  });

  it('does nothing when there is no initial non-template entry', () => {
    const doc = getXmlDocWith(`
      <repeat_field jr:template=""/>
    `);

    removeExtraRepeatInstance(doc);

    expect(getNodes(doc, `${XPATH_MODEL}/instance/data/repeat_field`)).to.have.length(1);
    expect(getNodes(doc, `${XPATH_MODEL}/instance/data/repeat_field[@jr:template=""]`)).to.have.length(1);
  });

  it('removes non-template entries across multiple (including nested) repeats', () => {
    const doc = getXmlDocWith(`
      <outer>
        <rep1 jr:template=""/>
        <rep1/>
        <group>
          <rep2 jr:template=""/>
          <rep2/>
        </group>
      </outer>
      <rep3 jr:template="">
        <rep4 jr:template=""/>
        <rep4/>
      </rep3>
      <rep3>
        <rep4 jr:template=""/>
        <rep4/>
      </rep3>
    `);

    removeExtraRepeatInstance(doc);

    expect(getNodes(doc, `${XPATH_MODEL}/instance/data/outer/rep1`).length).to.equal(1);
    expect(getNodes(doc, `${XPATH_MODEL}/instance/data/outer/rep1[@jr:template=""]`).length).to.equal(1);
    expect(getNodes(doc, `${XPATH_MODEL}/instance/data/outer/group/rep2`).length).to.equal(1);
    expect(getNodes(doc, `${XPATH_MODEL}/instance/data/outer/group/rep2[@jr:template=""]`).length).to.equal(1);
    expect(getNodes(doc, `${XPATH_MODEL}/instance/data/rep3`).length).to.equal(1);
    expect(getNodes(doc, `${XPATH_MODEL}/instance/data/rep3[@jr:template=""]`).length).to.equal(1);
    expect(getNodes(doc, `${XPATH_MODEL}/instance/data/rep3/rep4`).length).to.equal(1);
    expect(getNodes(doc, `${XPATH_MODEL}/instance/data/rep3/rep4[@jr:template=""]`).length).to.equal(1);
  });
});
