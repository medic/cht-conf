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
  [
    ['hello', true],
    ['/hello', true],
    ['./hello', true],
    ['/hello/world', true],
    ['../hello/world', true],
    ['/instance//*[@db-doc-ref]', false],
    ['/hello[1]', false],
    ['/hello/world[@attr="value"]', false],
    ['/hello/world/text()', false],
    ['/hello/world | /another/path', false],
    ['/hello/world and /another/path', false],
    ['/hello/world = "value"', false],
    ['concat(/hello, "/world")', false],
  ].forEach(([xpath, expected]) => {
    it('SIMPLE_XPATH_PATTERN matches paths with no special characters', () => {
      const result = formUtils.SIMPLE_XPATH_PATTERN.test(xpath);
      expect(result).to.equal(expected);
    });
  });

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
      const hasInstanceId = formUtils.formHasInstanceId(getXmlDoc());
      expect(hasInstanceId).to.equal(true);
    });

    it('returns false when the form does not have an instance ID', () => {
      const hasInstanceId = formUtils.formHasInstanceId(getXmlDoc({ metaNodes: '' }));
      expect(hasInstanceId).to.equal(false);
    });
  });

  it('removeNode removes the given node from its parent', () => {
    const xmlDoc = getXmlDoc();
    const path = '/h:html/h:head/model/instance/data/name';
    const nameNode = formUtils.getNode(xmlDoc, path);
    expect(nameNode).to.not.be.undefined;

    formUtils.removeNode(nameNode);

    expect(formUtils.getNode(xmlDoc, path)).to.be.undefined;
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

  describe('getInstanceNode', () => {
    it('returns the identified instance node', () => {
      const node = formUtils.getInstanceNode(getXmlDoc(), 'contact-summary');
      expect(node.hasChildNodes()).to.not.be.undefined;
    });

    it('returns undefined when no instance node exists with the given id', () => {
      const node = formUtils.getInstanceNode(getXmlDoc(), 'non-existent-id');
      expect(node).to.be.undefined;
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

  describe('getPrimaryInstanceNodeChildPath', () => {
    const xmlDoc = getXmlDoc();

    it('returns the correct path for a direct child of the primary instance node', () => {
      const nameNode = formUtils.getNode(xmlDoc, '/h:html/h:head/model/instance/data/name');
      const path = formUtils.getPrimaryInstanceNodeChildPath(nameNode);
      expect(path).to.equal('/data/name');
    });

    it('returns the correct path for a nested child', () => {
      const nestedXml = getXml();
      const nestedDoc = domParser.parseFromString(nestedXml.replace('<age/>', '<age><child/></age>'));
      const childNode = formUtils.getNode(nestedDoc, '/h:html/h:head/model/instance/data/age/child');
      const path = formUtils.getPrimaryInstanceNodeChildPath(childNode);
      expect(path).to.equal('/data/age/child');
    });

    it('returns an empty string for the primary instance node itself', () => {
      const primaryInstanceNode = formUtils.getPrimaryInstanceNode(xmlDoc);
      const path = formUtils.getPrimaryInstanceNodeChildPath(primaryInstanceNode);
      expect(path).to.equal('');
    });

    it('returns an empty string for a non-element node', () => {
      const nameNode = formUtils.getNode(xmlDoc, '/h:html/h:head/model/instance/data/name');
      const textNode = nameNode.firstChild;
      const path = formUtils.getPrimaryInstanceNodeChildPath(textNode);
      expect(path).to.equal('');
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
});
