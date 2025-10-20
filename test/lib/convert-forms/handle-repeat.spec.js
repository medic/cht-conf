const { expect } = require('chai');
const { DOMParser } = require('@xmldom/xmldom');

const { getNodes, XPATH_MODEL, XPATH_BODY, getNode } = require('../../../src/lib/forms-utils');
const { removeExtraRepeatInstance, addRepeatCount } = require('../../../src/lib/convert-forms/handle-repeat');

const parser = new DOMParser();

const wrapInXForm = ({ instance = '', body = '' }) => `
<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <model>
      <instance>
        <data id="abc">
          ${instance}
        </data>
      </instance>
    </model>
  </h:head>
  <h:body>
    ${body}
  </h:body>
</h:html>`;

const getXmlDocWith = (xmlData) => parser.parseFromString(wrapInXForm(xmlData),'text/xml');

describe('Handle repeats', () => {
  describe('Remove initial repeat entry', () => {
    it('removes the non-template initial entry and keeps the template node', () => {
      const doc = getXmlDocWith({ instance: `
      <repeat_field jr:template=""/>
      <repeat_field><a>1</a></repeat_field>
      <not_a_repeat/>
      <not_a_repeat>
        <a>hello</a>
      </not_a_repeat>  
    ` });

      removeExtraRepeatInstance(doc);

      expect(getNodes(doc, `${XPATH_MODEL}/instance/data/repeat_field`)).to.have.length(1);
      expect(getNodes(doc, `${XPATH_MODEL}/instance/data/repeat_field[@jr:template=""]`)).to.have.length(1);
      expect(getNodes(doc, `${XPATH_MODEL}/instance/data/not_a_repeat`)).to.have.length(2);
    });

    it('does nothing when there is no initial non-template entry', () => {
      const doc = getXmlDocWith({ instance: `
      <repeat_field jr:template=""/>
    ` });

      removeExtraRepeatInstance(doc);

      expect(getNodes(doc, `${XPATH_MODEL}/instance/data/repeat_field`)).to.have.length(1);
      expect(getNodes(doc, `${XPATH_MODEL}/instance/data/repeat_field[@jr:template=""]`)).to.have.length(1);
    });

    it('removes non-template entries across multiple (including nested) repeats', () => {
      const doc = getXmlDocWith({ instance: `
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
    ` });

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

  describe('Add repeat count', () => {
    it('adds repeat count field when it does not exist', () => {
      const doc = getXmlDocWith({
        instance: `
          <other_field/>
          <repeat_field/>`,
        body: '<repeat nodeset="/data/repeat_field" jr:count="/data/other_field"></repeat>'
      });

      addRepeatCount(doc);

      expect(getNodes(doc, `${XPATH_MODEL}/instance/data/repeat_field_count`)).to.have.length(1);
      const [bindNode, ...bindNodes] = getNodes(doc, `${XPATH_MODEL}/bind[@nodeset="/data/repeat_field_count"]`);
      expect(bindNodes).to.be.empty;
      expect(bindNode.getAttribute('type')).to.equal('string');
      expect(bindNode.getAttribute('readonly')).to.equal('true()');
      expect(bindNode.getAttribute('calculate')).to.equal('/data/other_field');
      const [repeatNode, ...repeatNodes] = getNodes(doc, `${XPATH_BODY}/repeat`);
      expect(repeatNodes).to.be.empty;
      expect(repeatNode.getAttribute('nodeset')).to.equal('/data/repeat_field');
      expect(repeatNode.getAttribute('jr:count')).to.equal('/data/repeat_field_count');
    });

    it('does nothing when repeat count field already exists', () => {
      const doc = getXmlDocWith({
        instance: `
          <other_field/>
          <repeat_field/>
          <repeat_field_count>0</repeat_field_count>`,
        body: '<repeat nodeset="/data/repeat_field" jr:count="/data/other_field"></repeat>'
      });

      addRepeatCount(doc);

      expect(getNodes(doc, `${XPATH_MODEL}/instance/data/repeat_field_count`)).to.have.length(1);
      expect(getNodes(doc, `${XPATH_MODEL}/bind`)).to.be.empty;
      const repeatNode = getNode(doc, `${XPATH_BODY}/repeat[@nodeset="/data/repeat_field"]`);
      expect(repeatNode.getAttribute('jr:count')).to.equal('/data/other_field');
    });

    it('does nothing when jr:count is not a simple xpath', () => {
      const doc = getXmlDocWith({
        instance: `
          <other_field/>
          <repeat_field/>`,
        body: '<repeat nodeset="/data/repeat_field" jr:count="concat(\'count\', /data/other_field)"></repeat>'
      });

      addRepeatCount(doc);

      expect(getNodes(doc, `${XPATH_MODEL}/instance/data/repeat_field_count`)).to.be.empty;
      expect(getNodes(doc, `${XPATH_MODEL}/bind`)).to.be.empty;
      const repeatNode = getNode(doc, `${XPATH_BODY}/repeat[@nodeset="/data/repeat_field"]`);
      expect(repeatNode.getAttribute('jr:count')).to.equal('concat(\'count\', /data/other_field)');
    });

    it('does nothing when repeat nodeset is missing', () => {
      const doc = getXmlDocWith({
        instance: `
          <other_field/>`,
        body: '<repeat jr:count="/data/other_field"></repeat>'
      });

      addRepeatCount(doc);

      expect(getNodes(doc, `${XPATH_MODEL}/instance/data/repeat_field_count`)).to.be.empty;
      expect(getNodes(doc, `${XPATH_MODEL}/bind`)).to.be.empty;
      const repeatNode = getNode(doc, `${XPATH_BODY}/repeat`);
      expect(repeatNode.getAttribute('jr:count')).to.equal('/data/other_field');
    });

    it('does nothing when jr:count is already set to count field', () => {
      const doc = getXmlDocWith({
        instance: `
          <other_field/>
          <repeat_field/>
          <repeat_field_count>0</repeat_field_count>`,
        body: '<repeat nodeset="/data/repeat_field" jr:count="/data/repeat_field_count"></repeat>'
      });

      addRepeatCount(doc);

      expect(getNodes(doc, `${XPATH_MODEL}/instance/data/repeat_field_count`)).to.have.length(1);
      expect(getNodes(doc, `${XPATH_MODEL}/bind`)).to.be.empty;
      const repeatNode = getNode(doc, `${XPATH_BODY}/repeat[@nodeset="/data/repeat_field"]`);
      expect(repeatNode.getAttribute('jr:count')).to.equal('/data/repeat_field_count');
    });

    it('handles multiple and nested repeats correctly', () => {
      const doc = getXmlDocWith({
        instance: `
          <other_field/>
          <first_page>
            <repeat1>
              <another_field/>
              <repeat2/>
            </repeat1>
            <yet_another_field/>
          </first_page>
          <repeat3/>`,
        body: `
          <group appearance="field-list" ref="/data/first_page">
            <repeat nodeset="/data/first_page/repeat1" jr:count="/data/other_field">
              <repeat nodeset="/data/first_page/repeat1/repeat2" jr:count="/data/first_page/repeat1/another_field">
              </repeat>
            </repeat>          
          </group>
          <repeat nodeset="/data/repeat3" jr:count="/data/first_page/yet_another_field"></repeat>`,
      });

      addRepeatCount(doc);

      expect(getNodes(doc, `${XPATH_MODEL}/instance/data/first_page/repeat1_count`)).to.have.length(1);
      expect(getNodes(doc, `${XPATH_MODEL}/instance/data/first_page/repeat1/repeat2_count`)).to.have.length(1);
      expect(getNodes(doc, `${XPATH_MODEL}/instance/data/repeat3_count`)).to.have.length(1);

      const repeat1BindNode = getNode(doc, `${XPATH_MODEL}/bind[@nodeset="/data/first_page/repeat1_count"]`);
      expect(repeat1BindNode.getAttribute('calculate')).to.equal('/data/other_field');
      const repeat2BindNode = getNode(doc, `${XPATH_MODEL}/bind[@nodeset="/data/first_page/repeat1/repeat2_count"]`);
      expect(repeat2BindNode.getAttribute('calculate')).to.equal('/data/first_page/repeat1/another_field');
      const repeat3BindNode = getNode(doc, `${XPATH_MODEL}/bind[@nodeset="/data/repeat3_count"]`);
      expect(repeat3BindNode.getAttribute('calculate')).to.equal('/data/first_page/yet_another_field');

      const repeat1BodyNode = getNode(doc, `${XPATH_BODY}//repeat[@nodeset="/data/first_page/repeat1"]`);
      expect(repeat1BodyNode.getAttribute('jr:count')).to.equal('/data/first_page/repeat1_count');
      const repeat2BodyNode = getNode(doc, `${XPATH_BODY}//repeat[@nodeset="/data/first_page/repeat1/repeat2"]`);
      expect(repeat2BodyNode.getAttribute('jr:count')).to.equal('/data/first_page/repeat1/repeat2_count');
      const repeat3BodyNode = getNode(doc, `${XPATH_BODY}//repeat[@nodeset="/data/repeat3"]`);
      expect(repeat3BodyNode.getAttribute('jr:count')).to.equal('/data/repeat3_count');
    });
  });
});
