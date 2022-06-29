const { expect } = require('chai');
const path = require('path');
const { DOMParser } = require('@xmldom/xmldom');
const formUtils = require('../../src/lib/forms-utils');

const domParser = new DOMParser();

const getXml = (opts = { metaNodes: '<instanceID/>', title: 'Has Instance ID', id: 'ABC', includeBinds: true }) => `
<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <h:title>${opts.title}</h:title>
    <model>
      <instance>
        <data id="${opts.id}" version="2015-06-05">
          <name>Harambe</name>
          <age/>
        </data>
      </instance>
      <instance id="contact-summary"/>
      <bind nodeset="/data/name" type="string" />
      <bind nodeset="/data/age" type="int" relevant="/data/name != ''" />        
      <meta>
        ${opts.metaNodes}
      </meta>
    </model>
  </h:head>
  <h:body>
    <input ref="/data/name">
      <label>What is the name?</label>
    </input>
    <input ref="/data/age">
      <label>What is the age?</label>
    </input>
  </h:body>
</h:html>`;

const getXmlDoc = opts => domParser.parseFromString(getXml(opts));

const emptyXml = `
<?xml version="1.0"?>
<h:html xmlns:h="http://www.w3.org/1999/xhtml"></h:html>`;

const projectDir = path.join(__dirname, '../data/convert-app-forms');

describe('form-utils', () => {
  describe('getFormDir', () => {
    it('returns the form directory path when it exists', () => {
      const formDir = formUtils.getFormDir(projectDir, 'app');
      expect(formDir).to.equal(`${projectDir}/forms/app`);
    });

    it('returns null when the form directory does not exist', () => {
      const formDir = formUtils.getFormDir(projectDir, 'non-existent-dir');
      expect(formDir).to.equal(null);
    });

    it('returns null when the project directory does not exist', () => {
      const formDir = formUtils.getFormDir('non-existent-dir', 'app');
      expect(formDir).to.equal(null);
    });
  });

  describe('getFormFilePaths', () => {
    const formDir = `${projectDir}/forms/app`;

    it('returns the file path data for a file name with extension', () => {
      const pathData = formUtils.getFormFilePaths(formDir, 'delivery.xml');
      expect(pathData.baseFileName).to.equal('delivery');
      expect(pathData.mediaDir).to.equal(`${formDir}/delivery-media`);
      expect(pathData.xformPath).to.equal(`${formDir}/delivery.xml`);
      expect(pathData.filePath).to.equal(`${formDir}/delivery.xml`);
    });

    it('returns the file path data for a file name without extension', () => {
      const pathData = formUtils.getFormFilePaths(formDir, 'delivery');
      expect(pathData.baseFileName).to.equal('delivery');
      expect(pathData.mediaDir).to.equal(`${formDir}/delivery-media`);
      expect(pathData.xformPath).to.equal(`${formDir}/delivery.xml`);
      expect(pathData.filePath).to.equal(`${formDir}/delivery`);
    });
  });

  describe('formHasInstanceId', () => {
    it('returns true when the form has an instance ID', () => {
      const hasInstanceId = formUtils.formHasInstanceId(getXml());
      expect(hasInstanceId).to.equal(true);
    });

    it('returns false when the form does not have an instance ID', () => {
      const hasInstanceId = formUtils.formHasInstanceId(getXml({ metaNodes: '' }));
      expect(hasInstanceId).to.equal(false);
    });
  });

  describe('readTitleFrom', () => {
    it('returns the title when the form has a title', () => {
      const title = formUtils.readTitleFrom(getXml());
      expect(title).to.equal('Has Instance ID');
    });

    it('returns an empty string when the form title is empty', () => {
      const title = formUtils.readTitleFrom(getXml({ title: '' }));
      expect(title).to.equal('');
    });
  });

  describe('readIdFrom', () => {
    it('returns the id when the form has an id', () => {
      const id = formUtils.readIdFrom(getXml());
      expect(id).to.equal('ABC');
    });

    it('returns an empty string when the form id is empty', () => {
      const id = formUtils.readIdFrom(getXml({ id: '' }));
      expect(id).to.equal('');
    });
  });

  describe('getNode', () => {
    const xmlDoc = getXmlDoc();

    it('returns a node selected by an absolute XPath', () => {
      const node = formUtils.getNode(xmlDoc, '/h:html/h:head/model/instance/data/name');
      expect(node.textContent).to.equal('Harambe');
    });

    it('returns a node selected by a relative XPath', () => {
      const ageNode = formUtils.getNode(xmlDoc, '/h:html/h:head/model/instance/data/age');

      const node = formUtils.getNode(ageNode, '../name');
      expect(node.textContent).to.equal('Harambe');
    });

    it('returns undefined when the node does not exist', () => {
      const node = formUtils.getNode(xmlDoc, '/data/non-existent-node');
      expect(node).to.be.undefined;
    });
  });

  describe('getNodes', () => {
    const xmlDoc = getXmlDoc();

    it('returns a multiple selected nodes', () => {
      const nodes = formUtils.getNodes(xmlDoc, '/h:html/h:head/model/bind');
      expect(nodes.length).to.equal(2);
      expect(nodes[0].getAttribute('nodeset')).to.equal('/data/name');
      expect(nodes[1].getAttribute('nodeset')).to.equal('/data/age');
    });

    it('returns a single node selected by an absolute XPath', () => {
      const nodes = formUtils.getNodes(xmlDoc, '/h:html/h:head/model/instance/data/name');
      expect(nodes.length).to.equal(1);
      expect(nodes[0].textContent).to.equal('Harambe');
    });

    it('returns a single node selected by a relative XPath', () => {
      const ageNode = formUtils.getNode(xmlDoc, '/h:html/h:head/model/instance/data/age');

      const nodes = formUtils.getNodes(ageNode, '../name');
      expect(nodes.length).to.equal(1);
      expect(nodes[0].textContent).to.equal('Harambe');
    });

    it('returns an empty array when the nodes do not exist', () => {
      const nodes = formUtils.getNodes(xmlDoc, '/data/non-existent-node');
      expect(nodes).to.be.empty;
    });
  });

  describe('getBindNodes', () => {
    it('returns the bind nodes for the given form', () => {
      const nodes = formUtils.getBindNodes(getXmlDoc());
      expect(nodes.length).to.equal(2);
      expect(nodes[0].getAttribute('nodeset')).to.equal('/data/name');
      expect(nodes[1].getAttribute('nodeset')).to.equal('/data/age');
    });

    it('returns an empty array when no bind nodes exist', () => {
      const nodes = formUtils.getBindNodes(domParser.parseFromString(emptyXml));
      expect(nodes).to.be.empty;
    });
  });

  describe('getPrimaryInstanceNode', () => {
    it('returns the first instance node for the given form', () => {
      const node = formUtils.getPrimaryInstanceNode(getXmlDoc());
      // Assert node has children and it not the empty contact-summary instance
      expect(node.hasChildNodes()).to.be.true;
    });

    it('returns undefined when no instance nodes exist', () => {
      const node = formUtils.getPrimaryInstanceNode(domParser.parseFromString(emptyXml));
      expect(node).to.be.undefined;
    });
  });
});
