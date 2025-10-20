const { expect } = require('chai');
const { DOMParser } = require('@xmldom/xmldom');

const { getNodes, XPATH_MODEL, XPATH_BODY } = require('../../../src/lib/forms-utils');
const { removeNoLabelNodes } = require('../../../src/lib/convert-forms/handle-no-label-placeholders');

const parser = new DOMParser();

const wrapInXForm = ({ instanceInnerXml = '', itextInnerXml = '', bodyInnerXml = '' }) => `
<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <model>
      ${itextInnerXml}
      <instance>
        <data id="abc">
          ${instanceInnerXml}
        </data>
      </instance>
    </model>
  </h:head>
  <h:body>
    ${bodyInnerXml}
  </h:body>
</h:html>`;

const getXmlDocWith = (parts) => parser.parseFromString(wrapInXForm(parts), 'text/xml');

describe('Handle NO_LABEL placeholders', () => {
  it('removes labels and itext text nodes that are only NO_LABEL', () => {
    const doc = getXmlDocWith({
      itextInnerXml: `
        <itext>
          <translation lang="en">
            <text id="lbl1">
              <value>NO_LABEL</value>
            </text>
            <text id="lbl2">
              <value>Some label</value>
            </text>
          </translation>
        </itext>
      `,
      bodyInnerXml: `
        <group>
          <input ref="/data/a">
            <label ref="jr:itext('lbl1')"/>
          </input>
          <input ref="/data/b">
            <label ref="jr:itext('lbl2')"/>
          </input>
        </group>
      `
    });

    removeNoLabelNodes(doc);

    expect(getNodes(doc, `${XPATH_MODEL}/itext/translation/text`)).to.have.length(1);
    expect(getNodes(doc, `${XPATH_MODEL}/itext/translation/text[@id='lbl1']`)).to.be.empty;
    expect(getNodes(doc, `${XPATH_MODEL}/itext/translation/text[@id='lbl2']`)).to.have.length(1);

    expect(getNodes(doc, `${XPATH_BODY}/group/input`)).to.have.length(2);
    expect(getNodes(doc, `${XPATH_BODY}/group/input/label`)).to.have.length(1);
    expect(getNodes(doc, `${XPATH_BODY}/group/input/label[@ref="jr:itext('lbl1')"]`)).to.be.empty;
    expect(getNodes(doc, `${XPATH_BODY}/group/input/label[@ref="jr:itext('lbl2')"]`)).to.have.length(1);
  });

  it('keeps label when text has other values, but removes NO_LABEL values', () => {
    const doc = getXmlDocWith({
      itextInnerXml: `
        <itext>
          <translation lang="en">
            <text id="lbl3">
              <value>NO_LABEL</value>
              <value form="image">jr://images/some.png</value>
            </text>
          </translation>
        </itext>
      `,
      bodyInnerXml: `
        <input ref="/data/c">
          <label ref="jr:itext('lbl3')"/>
        </input>
      `
    });

    removeNoLabelNodes(doc);

    expect(getNodes(doc, `${XPATH_MODEL}/itext/translation/text/value`)).to.have.length(1);
    expect(getNodes(doc, `${XPATH_MODEL}/itext/translation/text/value[@form='image']`)).to.have.length(1);

    expect(getNodes(doc, `${XPATH_BODY}/input/label[@ref="jr:itext('lbl3')"]`)).to.have.length(1);
  });

  it('handles multiple translations with NO_LABEL by removing all and associated labels', () => {
    const doc = getXmlDocWith({
      itextInnerXml: `
        <itext>
          <translation lang="en">
            <text id="lbl4">
              <value>NO_LABEL</value>
            </text>
          </translation>
          <translation lang="fr">
            <text id="lbl4">
              <value>NO_LABEL</value>
            </text>
          </translation>
        </itext>
      `,
      bodyInnerXml: `
        <input ref="/data/d">
          <label ref="jr:itext('lbl4')"/>
        </input>
      `
    });

    removeNoLabelNodes(doc);

    expect(getNodes(doc, `${XPATH_MODEL}/itext/translation/text`)).to.be.empty;
    expect(getNodes(doc, `${XPATH_BODY}/input/label`)).to.be.empty;
  });
});
