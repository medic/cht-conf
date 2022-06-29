const { expect } = require('chai');
const path = require('path');
const formUtils = require('../../src/lib/forms-utils');

const getXml = (opts = { metaNodes: '<instanceID/>', title: 'Has Instance ID', id: 'ABC' }) => `
<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <h:title>${opts.title}</h:title>
    <model>
      <instance>
        <data id="${opts.id}" version="2015-06-05">
          <name>Billy Bob</name>
          <age/>
        </data>
      </instance>
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
});
