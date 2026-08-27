const { expect } = require('chai');
const { DOMParser } = require('@xmldom/xmldom');
const noCsvExternalDatasets = require('../../../../src/lib/validation/form/no-csv-external-datasets');

const domParser = new DOMParser();

// Simple XML helper - only focuses on what we need to test: secondary instances with src attributes
const getXml = (secondaryInstances = []) => `
<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml">
  <h:head>
    <h:title>Test Form</h:title>
    <model>
      <instance>
        <data>
          <favorite_color/>
        </data>
      </instance>
      ${secondaryInstances.map(({ id, src }) => `<instance id="${id}" src="${src}" />`).join('')}
      <instance id="inline">
        <root><item><name>red</name><label>Red</label></item></root>
      </instance>
      <bind nodeset="/data/favorite_color" type="string" />
    </model>
  </h:head>
  <h:body>
    <select1 ref="/data/favorite_color">
      <label>Favorite color</label>
      <itemset nodeset="instance('colors')/root/item">
        <value ref="name" />
        <label ref="label" />
      </itemset>
    </select1>
  </h:body>
</h:html>`;

const getXmlDoc = (secondaryInstances) => domParser.parseFromString(getXml(secondaryInstances));
const xformPath = '/my/form/path/form.xml';

const getExpectedError = (sources) => `Form at ${xformPath} contains the following external data sources `
  + `referencing CSV files: [${sources.join(', ')}]. The CHT only supports XML files for `
  + `select_one_from_file/select_many_from_file questions. Convert the data to XML and reference it as `
  + `'jr://file/<name>.xml': `
  + `https://docs.communityhealthtoolkit.org/building/forms/app/#select-choice-from-file`;

const assertEmpty = (output) => {
  expect(output.warnings).is.empty;
  expect(output.errors).is.empty;
};

describe('no-csv-external-datasets', () => {
  it('resolves OK when the form has no external data sources', () => {
    return noCsvExternalDatasets
      .execute({ xformPath, xmlDoc: getXmlDoc() })
      .then(output => assertEmpty(output));
  });

  it('resolves OK when the external data source is an XML file', () => {
    const instances = [{ id: 'colors', src: 'jr://file/colors.xml' }];
    return noCsvExternalDatasets
      .execute({ xformPath, xmlDoc: getXmlDoc(instances) })
      .then(output => assertEmpty(output));
  });

  it('returns an error when the external data source is a CSV file', () => {
    const instances = [{ id: 'colors', src: 'jr://file-csv/colors.csv' }];
    return noCsvExternalDatasets
      .execute({ xformPath, xmlDoc: getXmlDoc(instances) })
      .then(output => {
        expect(output.warnings).is.empty;
        expect(output.errors).to.deep.equal([getExpectedError(['jr://file-csv/colors.csv'])]);
      });
  });

  it('returns one error listing every CSV data source', () => {
    const instances = [
      { id: 'colors', src: 'jr://file-csv/colors.csv' },
      { id: 'sizes', src: 'jr://file-csv/sizes.csv' }
    ];
    return noCsvExternalDatasets
      .execute({ xformPath, xmlDoc: getXmlDoc(instances) })
      .then(output => {
        expect(output.errors).to.deep.equal([
          getExpectedError(['jr://file-csv/colors.csv', 'jr://file-csv/sizes.csv'])
        ]);
      });
  });

  it('ignores XML data sources when reporting CSV data sources', () => {
    const instances = [
      { id: 'colors', src: 'jr://file/colors.xml' },
      { id: 'sizes', src: 'jr://file-csv/sizes.csv' }
    ];
    return noCsvExternalDatasets
      .execute({ xformPath, xmlDoc: getXmlDoc(instances) })
      .then(output => {
        expect(output.errors).to.deep.equal([getExpectedError(['jr://file-csv/sizes.csv'])]);
      });
  });

  it('resolves OK when the src only starts with the CSV prefix', () => {
    const instances = [{ id: 'colors', src: 'jr://file-csv-backup/colors.xml' }];
    return noCsvExternalDatasets
      .execute({ xformPath, xmlDoc: getXmlDoc(instances) })
      .then(output => assertEmpty(output));
  });

  it('detects a CSV data source with surrounding whitespace', () => {
    const instances = [{ id: 'colors', src: ' jr://file-csv/colors.csv ' }];
    return noCsvExternalDatasets
      .execute({ xformPath, xmlDoc: getXmlDoc(instances) })
      .then(output => {
        expect(output.errors).to.deep.equal([getExpectedError(['jr://file-csv/colors.csv'])]);
      });
  });
});
