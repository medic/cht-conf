const { expect } = require('chai');
const {
  replaceBase64ImageDynamicDefaults,
  replaceItemSetsWithMedia
} = require('../../../src/lib/convert-forms/handle-media');
const { createXformDoc, createXformString, serializeToString } = require('../../fn/convert-forms.utils');

describe('Handle media', () => {
  describe('Handle default base64 images', () => {
    it('moves dynamic default value to instance for display-base64-image fields', () => {
      const body = `
        <input ref="/data/image_field" appearance="display-base64-image">
          <label>Image Field</label>
        </input>
      `;
      const doc = createXformDoc({
        model: `
          <instance>
            <data id="abc">
              <image_field type="binary"/>
            </data>
          </instance>
          <setvalue ref="/data/image_field" value="iVBORw0KGgoVORK5CYII=" event="odk-instance-first-load"/>
        `,
        body
      });

      replaceBase64ImageDynamicDefaults(doc);

      const expectedDoc = createXformString({
        model: `
          <instance>
            <data id="abc">
              <image_field type="binary">iVBORw0KGgoVORK5CYII=</image_field>
            </data>
          </instance>`,
        body
      });
      expect(serializeToString(doc)).xml.to.equal(expectedDoc);
    });

    it('does not affect fields without the display-base64-image appearance', () => {
      const opts = {
        model: `
          <instance>
            <data id="abc">
              <image_field type="binary"/>
              <other_field type="binary"/>
            </data>
          </instance>
          <setvalue ref="/data/image_field" value="iVBORw0KGgoVORK5CYII=" event="odk-instance-first-load"/>
          <setvalue ref="/data/other_field" value="iVBORw0KGgoVORK5CYII=" event="odk-instance-first-load"/>
        `,
        body: `
          <input ref="/data/image_field" appearance="some-other-appearance">
            <label>Image Field</label>
          </input>
          <input ref="/data/other_field"/>
        `
      };
      const doc = createXformDoc(opts);

      replaceBase64ImageDynamicDefaults(doc);

      const expectedDoc = createXformString(opts);
      expect(serializeToString(doc)).xml.to.equal(expectedDoc);
    });

    it('does not affect input fields that are not present in the instance', () => {
      const opts = {
        model: `
          <instance>
            <data id="abc">
              <other_image_field type="binary"/>
            </data>
          </instance>
          <setvalue ref="/data/image_field" value="iVBORw0KGgoVORK5CYII=" event="odk-instance-first-load"/>
        `,
        body: `
          <input ref="/data/image_field" appearance="display-base64-image">
            <label>Image Field</label>
          </input>
        `
      };
      const doc = createXformDoc(opts);

      replaceBase64ImageDynamicDefaults(doc);

      const expectedDoc = createXformString(opts);
      expect(serializeToString(doc)).xml.to.equal(expectedDoc);
    });

    it('does not affect display-base64-image fields without dynamic default values', () => {
      const opts = {
        model: `
          <instance>
            <data id="abc">
              <image_field/>
              <other_field type="binary"/>
              <another_field type="binary"/>
            </data>
          </instance>
          <setvalue ref="/data/other_field" value="" event="odk-instance-first-load" />
          <setvalue ref="/data/another_field" value="iVBORw0KGasdfasdfgoVORK5CYII=" />`,
        body: `
          <input ref="/data/image_field" appearance="display-base64-image">
            <label>Image Field</label>
          </input>
          <input ref="/data/other_field" appearance="display-base64-image"/>
          <input ref="/data/another_field" appearance="display-base64-image"/>`
      };
      const doc = createXformDoc(opts);

      replaceBase64ImageDynamicDefaults(doc);

      const expectedDoc = createXformString(opts);
      expect(serializeToString(doc)).xml.to.equal(expectedDoc);
    });

    it('handles multiple display-base64-image fields with defaults', () => {
      const body = `
        <input ref="/data/image1_field" appearance="other-appearance display-base64-image">
          <label>Image 1</label>
        </input>
        <group appearance="field-list summary" ref="/data/group">
          <input ref="/data/group/image2_field" appearance="display-base64-image some-other-appearance">
            <label>Image 2</label>
          </input>
        </group>
        <input ref="/data/image3_field" appearance="display-base64-image"/>
      `;
      const doc = createXformDoc({
        model: `
          <instance>
            <data id="abc">
              <image1_field/>
              <group>
                <image2_field/>
              </group>
              <image3_field/>
            </data>
          </instance>
          <setvalue ref="/data/image1_field" value="iVBORw0KGasdfasdfgoVORK5CYII=" event="odk-instance-first-load"/>
          <setvalue ref="/data/group/image2_field" value="iasdfsVRw0KGgoVORK5CYII===" event="odk-instance-first-load"/>
          <setvalue ref="/data/image3_field" value="sdfojapsour90j23223==" event="odk-instance-first-load"/>
        `,
        body
      });

      replaceBase64ImageDynamicDefaults(doc);

      const expectedDoc = createXformString({
        model: `
          <instance>
            <data id="abc">
              <image1_field>iVBORw0KGasdfasdfgoVORK5CYII=</image1_field>
              <group>
                <image2_field>iasdfsVRw0KGgoVORK5CYII===</image2_field>
              </group>
              <image3_field>sdfojapsour90j23223==</image3_field>
            </data>
          </instance>`,
        body
      });

      expect(serializeToString(doc)).xml.to.equal(expectedDoc);
    });
  });

  describe('Handle choices with media', () => {
    it('replaces itemset with item elements for instances with media', () => {
      const model = `
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
        </instance>
      `;
      const doc = createXformDoc({
        model,
        body: `
          <select1 ref="/data/choice">
            <itemset nodeset="instance('animals_labeled')/root/item">
              <label ref="jr:itext('itextId')"/>
              <value ref="name"/>
            </itemset>
          </select1>
        `
      });

      replaceItemSetsWithMedia(doc);

      const expectedDoc = createXformString({
        model,
        body: `
        <select1 ref="/data/choice">
          <item>
            <label ref="jr:itext('animals_labeled-1')"/>
            <value>choice1</value>
          </item>
          <item>
            <label ref="jr:itext('animals_labeled-2')"/>
            <value>choice2</value>
          </item>
          <item>
            <label ref="jr:itext('animals_labeled-3')"/>
            <value>choice3</value>
          </item>
        </select1>`
      });
      expect(serializeToString(doc)).xml.to.equal(expectedDoc);
    });

    it('does not replace itemsets that do not reference instances with media', () => {
      const opts = {
        model: `
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
          </instance>
        `,
        body: `
          <select1 ref="/data/choice">
            <itemset nodeset="instance('animals_labeled')/root/item">
              <label ref="jr:itext('itextId')"/>
              <value ref="name"/>
            </itemset>
          </select1>
        `
      };
      const doc = createXformDoc(opts);

      replaceItemSetsWithMedia(doc);

      const expectedDoc = createXformString(opts);
      expect(serializeToString(doc)).xml.to.equal(expectedDoc);
    });

    it('does not replace itemsets for text nodes with non-standard id', () => {
      const opts = {
        model: `
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
          </instance>
        `,
        body: `
          <select1 ref="/data/choice">
            <itemset nodeset="instance('animals_labeled')/root/item">
              <label ref="jr:itext('itextId')"/>
              <value ref="name"/>
            </itemset>
          </select1>
        `
      };
      const doc = createXformDoc(opts);

      replaceItemSetsWithMedia(doc);

      const expectedDoc = createXformString(opts);
      expect(serializeToString(doc)).xml.to.equal(expectedDoc);
    });

    it('does not replace itemsets when the instance does not exist', () => {
      const opts = {
        model: `
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
          </instance>
        `,
        body: `
          <select1 ref="/data/choice">
            <itemset nodeset="instance('wrong_animals_labeled')/root/item">
              <label ref="jr:itext('itextId')"/>
              <value ref="name"/>
            </itemset>
          </select1>
        `
      };
      const doc = createXformDoc(opts);

      replaceItemSetsWithMedia(doc);

      const expectedDoc = createXformString(opts);
      expect(serializeToString(doc)).xml.to.equal(expectedDoc);
    });

    it('handles multiple selects with media', () => {
      const model = `
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
        </instance>
      `;
      const doc = createXformDoc({
        model,
        body: `
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

      const expectedDoc = createXformString({
        model,
        body: `
          <select1 ref="/data/choice1">
            <item>
              <label ref="jr:itext('animals_labeled-1')"/>
              <value>choice1</value>
            </item>
          </select1>
          <group ref="/data/more_choices">
            <select1 ref="/data/choice2">
              <item>
                <label ref="jr:itext('cars_labeled-1')"/>
                <value>car1</value>
              </item>
            </select1>
            <select1 ref="/data/choice4">
              <item>
                <label ref="jr:itext('animals_labeled-1')"/>
                <value>choice1</value>
              </item>
            </select1>
          </group>
          <select1 ref="/data/choice3">
            <item>
              <label ref="jr:itext('planes_labeled-1')"/>
              <value>plane1</value>
            </item>
          </select1>
        `
      });
      expect(serializeToString(doc)).xml.to.equal(expectedDoc);
    });
  });
});
