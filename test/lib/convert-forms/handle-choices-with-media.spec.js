const { expect } = require('chai');
const { DOMParser } = require('@xmldom/xmldom');

const { getNodes, XPATH_BODY, getNode } = require('../../../src/lib/forms-utils');
const { replaceItemSetsWithMedia } = require('../../../src/lib/convert-forms/handle-choices-with-media');

const parser = new DOMParser();

const wrapInXForm = ({ modelInnerXml = '', bodyInnerXml = '' }) => `
<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms/" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <h:head>
    <model>
      ${modelInnerXml}
    </model>
  </h:head>
  <h:body>
    ${bodyInnerXml}
  </h:body>
</h:html>`;

const getXmlDocWith = (parts) => parser.parseFromString(wrapInXForm(parts), 'text/xml');

describe('Handle choices with media', () => {
  it('replaces itemset with item elements for instances with media', () => {
    const doc = getXmlDocWith({
      modelInnerXml: `
        <itext>
          <translation lang="en">
            <text id="animals_labeled-1">
              <value form="image">jr://images/croc.png</value>
            </text>
            <text id="animals_labeled-2">
              <value form="image">jr://images/eagle.png</value>
            </text>
            <text id="animals_labeled-3">
              <value form="image">jr://images/frog.png</value>
            </text>
          </translation>
        </itext>
        <instance id="animals_labeled">
          <root>
            <item>
              <itextId>animals_labeled-1</itextId>
              <name>choice1</name>
            </item>
            <item>
              <itextId>animals_labeled-2</itextId>
              <name>choice2</name>
            </item>
            <item>
              <itextId>animals_labeled-3</itextId>
              <name>choice3</name>
            </item>
          </root>
        </instance>`,
      bodyInnerXml: `
        <select1 ref="/data/choice">
          <itemset nodeset="instance('animals_labeled')/root/item">
            <label ref="jr:itext('itextId')"/>
            <value ref="name"/>
          </itemset>
        </select1>`
    });

    replaceItemSetsWithMedia(doc);

    expect(getNodes(doc, `${XPATH_BODY}/select1/itemset`)).to.be.empty;
    expect(getNodes(doc, `${XPATH_BODY}/select1/item`)).to.have.length(3);
    const itemLabels = getNodes(doc, `${XPATH_BODY}/select1/item/label`);
    expect(itemLabels).to.have.length(3);
    expect(itemLabels.map(n => n.getAttribute('ref'))).to.deep.equal([
      'jr:itext(\'animals_labeled-1\')',
      'jr:itext(\'animals_labeled-2\')',
      'jr:itext(\'animals_labeled-3\')'
    ]);
    const itemValues = getNodes(doc, `${XPATH_BODY}/select1/item/value`);
    expect(itemValues).to.have.length(3);
    expect(itemValues.map(n => n.textContent)).to.deep.equal([
      'choice1',
      'choice2',
      'choice3'
    ]);
  });

  it('does not replace itemsets that do not reference instances with media', () => {
    const doc = getXmlDocWith({
      modelInnerXml: `
        <itext>
          <translation lang="en">
            <text id="animals_labeled-1">
              <value>Croc</value>
            </text>
          </translation>
        </itext>
        <instance id="animals_labeled">
          <root>
            <item>
              <itextId>animals_labeled-1</itextId>
              <name>choice1</name>
            </item>
          </root>
        </instance>`,
      bodyInnerXml: `
        <select1 ref="/data/choice">
          <itemset nodeset="instance('animals_labeled')/root/item">
            <label ref="jr:itext('itextId')"/>
            <value ref="name"/>
          </itemset>
        </select1>`
    });

    replaceItemSetsWithMedia(doc);

    expect(getNodes(doc, `${XPATH_BODY}/select1/itemset`)).to.have.length(1);
    expect(getNodes(doc, `${XPATH_BODY}/select1/item`)).to.be.empty;
  });

  it('does not replace itemsets for text nodes with non-standard id', () => {
    const doc = getXmlDocWith({
      modelInnerXml: `
        <itext>
          <translation lang="en">
            <text id="animals_labeled1">
              <value form="image">jr://images/croc.png</value>
            </text>
          </translation>
        </itext>
        <instance id="animals_labeled">
          <root>
            <item>
              <itextId>animals_labeled-1</itextId>
              <name>choice1</name>
            </item>
          </root>
        </instance>`,
      bodyInnerXml: `
        <select1 ref="/data/choice">
          <itemset nodeset="instance('animals_labeled')/root/item">
            <label ref="jr:itext('itextId')"/>
            <value ref="name"/>
          </itemset>
        </select1>`
    });

    replaceItemSetsWithMedia(doc);

    expect(getNodes(doc, `${XPATH_BODY}/select1/itemset`)).to.have.length(1);
    expect(getNodes(doc, `${XPATH_BODY}/select1/item`)).to.be.empty;
  });

  it('does not replace itemsets when the instance does not exist', () => {
    const doc = getXmlDocWith({
      modelInnerXml: `
        <itext>
          <translation lang="en">
            <text id="animals_labeled-1">
              <value form="image">jr://images/croc.png</value>
            </text>
          </translation>
        </itext>
        <instance id="animals_labeled">
          <root>
            <item>
              <itextId>animals_labeled-1</itextId>
              <name>choice1</name>
            </item>
          </root>
        </instance>`,
      bodyInnerXml: `
        <select1 ref="/data/choice">
          <itemset nodeset="instance('wrong_animals_labeled')/root/item">
            <label ref="jr:itext('itextId')"/>
            <value ref="name"/>
          </itemset>
        </select1>`
    });

    replaceItemSetsWithMedia(doc);

    expect(getNodes(doc, `${XPATH_BODY}/select1/itemset`)).to.have.length(1);
    expect(getNodes(doc, `${XPATH_BODY}/select1/item`)).to.be.empty;
  });

  it('handles multiple selects with media', () => {
    const doc = getXmlDocWith({
      modelInnerXml: `\`
        <itext>
          <translation lang="en">
            <text id="animals_labeled-1">
              <value form="image">jr://images/croc.png</value>
              <value>Croc</value>
            </text>
            <text id="cars_labeled-1">
              <value form="audio">jr://audio/rev.mp3</value>
              <value>Croc</value>
            </text>
            <text id="planes_labeled-1">
              <value form="video">jr://video/sample.mp4</value>
              <value>Croc</value>
            </text>
          </translation>
          <translation lang="es">
            <text id="animals_labeled-1">
              <value form="image">jr://images/croc.png</value>
              <value>Croc</value>
            </text>
          </translation>
        </itext>
        <instance id="animals_labeled">
          <root>
            <item>
              <itextId>animals_labeled-1</itextId>
              <name>choice1</name>
            </item>
          </root>
        </instance>
        <instance id="cars_labeled">
          <root>
            <item>
              <itextId>cars_labeled-1</itextId>
              <name>car1</name>
            </item>
          </root>
        </instance>
        <instance id="planes_labeled">
          <root>
            <item>
              <itextId>planes_labeled-1</itextId>
              <name>plane1</name>
            </item>
          </root>
        </instance>`,
      bodyInnerXml: `
        <select1 ref="/data/choice1">
          <itemset nodeset="instance('animals_labeled')/root/item">
            <label ref="jr:itext('itextId')"/>
            <value ref="name"/>
          </itemset>
        </select1>
        <group ref="/data/more_choices">
          <select1 ref="/data/choice2">
            <itemset nodeset="instance('cars_labeled')/root/item">
              <label ref="jr:itext('itextId')"/>
              <value ref="name"/>
            </itemset>
          </select1>
          <select1 ref="/data/choice4">
            <itemset nodeset="instance('animals_labeled')/root/item">
              <label ref="jr:itext('itextId')"/>
              <value ref="name"/>
            </itemset>
          </select1>
        </group>
        <select1 ref="/data/choice3">
          <itemset nodeset="instance('planes_labeled')/root/item">
            <label ref="jr:itext('itextId')"/>
            <value ref="name"/>
          </itemset>
        </select1>`
    });

    replaceItemSetsWithMedia(doc);

    expect(getNodes(doc, `${XPATH_BODY}//select1/itemset`)).to.be.empty;
    expect(getNodes(doc, `${XPATH_BODY}//select1/item`)).to.have.length(4);
    const choice1Label = getNode(doc, `${XPATH_BODY}/select1[@ref="/data/choice1"]/item/label`);
    expect(choice1Label.getAttribute('ref')).to.equal('jr:itext(\'animals_labeled-1\')');
    const choice1Value = getNode(doc, `${XPATH_BODY}/select1[@ref="/data/choice1"]/item/value`);
    expect(choice1Value.textContent).to.equal('choice1');
    const choice2Label = getNode(doc, `${XPATH_BODY}/group/select1[@ref="/data/choice2"]/item/label`);
    expect(choice2Label.getAttribute('ref')).to.equal('jr:itext(\'cars_labeled-1\')');
    const choice2Value = getNode(doc, `${XPATH_BODY}/group/select1[@ref="/data/choice2"]/item/value`);
    expect(choice2Value.textContent).to.equal('car1');
    const choice3Label = getNode(doc, `${XPATH_BODY}/select1[@ref="/data/choice3"]/item/label`);
    expect(choice3Label.getAttribute('ref')).to.equal('jr:itext(\'planes_labeled-1\')');
    const choice3Value = getNode(doc, `${XPATH_BODY}/select1[@ref="/data/choice3"]/item/value`);
    expect(choice3Value.textContent).to.equal('plane1');
    const choice4Label = getNode(doc, `${XPATH_BODY}/group/select1[@ref="/data/choice4"]/item/label`);
    expect(choice4Label.getAttribute('ref')).to.equal('jr:itext(\'animals_labeled-1\')');
    const choice4Value = getNode(doc, `${XPATH_BODY}/group/select1[@ref="/data/choice4"]/item/value`);
    expect(choice4Value.textContent).to.equal('choice1');
  });
});
