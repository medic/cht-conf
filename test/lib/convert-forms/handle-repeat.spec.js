const { expect } = require('chai');
const { removeExtraRepeatInstance, addRepeatCount } = require('../../../src/lib/convert-forms/handle-repeat');
const { createXformDoc, createXformString, serializeToString } = require('../../fn/convert-forms.utils');

describe('Handle repeats', () => {
  describe('Remove initial repeat entry', () => {
    it('removes the non-template initial entry and keeps the template node', () => {
      const doc = createXformDoc({
        primaryInstance: `
          <repeat_field jr:template=""/>
          <repeat_field><a>1</a></repeat_field>
          <not_a_repeat/>
          <not_a_repeat>
            <a>hello</a>
          </not_a_repeat>  
      `
      });

      removeExtraRepeatInstance(doc);

      const expectedDoc = createXformString({
        primaryInstance: `
          <repeat_field jr:template=""/>
          <not_a_repeat/>
          <not_a_repeat>
            <a>hello</a>
          </not_a_repeat>  
        `
      });
      expect(serializeToString(doc)).xml.to.equal(expectedDoc);
    });

    it('does nothing when there is no initial non-template entry', () => {
      const doc = createXformDoc({
        primaryInstance: `<repeat_field jr:template=""/>`
      });

      removeExtraRepeatInstance(doc);

      const expectedDoc = createXformString({
        primaryInstance: `<repeat_field jr:template=""/>`
      });
      expect(serializeToString(doc)).xml.to.equal(expectedDoc);
    });

    it('removes non-template entries across multiple (including nested) repeats', () => {
      const doc = createXformDoc({
        primaryInstance: `
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
        `
      });

      removeExtraRepeatInstance(doc);

      const expectedDoc = createXformString({
        primaryInstance: `
          <outer>
            <rep1 jr:template=""/>
            <group>
              <rep2 jr:template=""/>
            </group>
          </outer>
          <rep3 jr:template="">
            <rep4 jr:template=""/>
          </rep3>
        `
      });
      expect(serializeToString(doc)).xml.to.equal(expectedDoc);
    });
  });

  describe('Add repeat count', () => {
    it('adds repeat count field when it does not exist', () => {
      const doc = createXformDoc({
        model: `
          <instance>
            <data id="abc">
              <other_field/>
              <repeat_field/>
            </data>
          </instance>
        `,
        body: '<repeat nodeset="/data/repeat_field" jr:count="/data/other_field"></repeat>'
      });

      addRepeatCount(doc);

      const expectedDoc = createXformString({
        model: `
          <instance>
            <data id="abc">
              <other_field/>
              <repeat_field/>
              <repeat_field_count/>
            </data>
          </instance>
          <bind nodeset="/data/repeat_field_count" type="string" readonly="true()" calculate="/data/other_field" />
        `,
        body: '<repeat nodeset="/data/repeat_field" jr:count="/data/repeat_field_count"></repeat>'
      });
      expect(serializeToString(doc)).xml.to.equal(expectedDoc);
    });

    it('does nothing when repeat count field already exists', () => {
      const opts = {
        model: `
          <instance>
            <data id="abc">
              <other_field/>
              <repeat_field/>
              <repeat_field_count>0</repeat_field_count>
            </data>
          </instance>
        `,
        body: '<repeat nodeset="/data/repeat_field" jr:count="/data/other_field"></repeat>'
      };
      const doc = createXformDoc(opts);

      addRepeatCount(doc);

      const expectedDoc = createXformString(opts);
      expect(serializeToString(doc)).xml.to.equal(expectedDoc);
    });

    it('does nothing when jr:count is not a simple xpath', () => {
      const opts = {
        model: `
          <instance>
            <data id="abc">
              <other_field/>
              <repeat_field/>
            </data>
          </instance>
        `,
        body: '<repeat nodeset="/data/repeat_field" jr:count="concat(\'count\', /data/other_field)"></repeat>'
      };
      const doc = createXformDoc(opts);

      addRepeatCount(doc);

      const expectedDoc = createXformString(opts);
      expect(serializeToString(doc)).xml.to.equal(expectedDoc);
    });

    it('does nothing when repeat nodeset is missing', () => {
      const opts = {
        model: `
          <instance>
            <data id="abc">
              <other_field/>
            </data>
          </instance>
        `,
        body: '<repeat jr:count="/data/other_field"></repeat>'
      };
      const doc = createXformDoc(opts);

      addRepeatCount(doc);

      const expectedDoc = createXformString(opts);
      expect(serializeToString(doc)).xml.to.equal(expectedDoc);
    });

    it('does nothing when jr:count is already set to count field', () => {
      const opts = {
        model: `
          <instance>
            <data id="abc">
              <other_field/>
              <repeat_field/>
              <repeat_field_count>0</repeat_field_count>
            </data>
          </instance>
        `,
        body: '<repeat nodeset="/data/repeat_field" jr:count="/data/repeat_field_count"></repeat>'
      };
      const doc = createXformDoc(opts);

      addRepeatCount(doc);

      const expectedDoc = createXformString(opts);
      expect(serializeToString(doc)).xml.to.equal(expectedDoc);
    });

    it('handles multiple and nested repeats correctly', () => {
      const doc = createXformDoc({
        model: `
          <instance>
            <data id="abc">
              <other_field/>
              <first_page>
                <repeat1>
                  <another_field/>
                  <repeat2/>
                </repeat1>
                <yet_another_field/>
              </first_page>
              <repeat3/>
            </data>
          </instance>
        `,
        body: `
          <group appearance="field-list" ref="/data/first_page">
            <repeat nodeset="/data/first_page/repeat1" jr:count="/data/other_field">
              <repeat nodeset="/data/first_page/repeat1/repeat2" jr:count="/data/first_page/repeat1/another_field">
              </repeat>
            </repeat>          
          </group>
          <repeat nodeset="/data/repeat3" jr:count="/data/first_page/yet_another_field"></repeat>
        `,
      });

      addRepeatCount(doc);

      const expectedDoc = createXformString({
        model: `
          <instance>
            <data id="abc">
              <other_field/>
              <first_page>
                <repeat1>
                  <another_field/>
                  <repeat2/>
                  <repeat2_count/>
                </repeat1>
                <yet_another_field/>
                <repeat1_count/>
              </first_page>
              <repeat3/>
              <repeat3_count/>
            </data>
          </instance>
          <bind 
            nodeset="/data/first_page/repeat1_count" 
            type="string" 
            readonly="true()" 
            calculate="/data/other_field" 
          />
          <bind 
            nodeset="/data/first_page/repeat1/repeat2_count" 
            type="string" 
            readonly="true()" 
            calculate="/data/first_page/repeat1/another_field" 
          />
          <bind 
            nodeset="/data/repeat3_count" 
            type="string" 
            readonly="true()" 
            calculate="/data/first_page/yet_another_field" 
          />
        `,
        body: `
          <group appearance="field-list" ref="/data/first_page">
            <repeat nodeset="/data/first_page/repeat1" jr:count="/data/first_page/repeat1_count">
              <repeat nodeset="/data/first_page/repeat1/repeat2" jr:count="/data/first_page/repeat1/repeat2_count">
              </repeat>
            </repeat>          
          </group>
          <repeat nodeset="/data/repeat3" jr:count="/data/repeat3_count"></repeat>
        `,
      });
      expect(serializeToString(doc)).xml.to.equal(expectedDoc);
    });
  });
});
