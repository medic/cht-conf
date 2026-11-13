const { expect } = require('chai');
const { handleFormId } = require('../../../src/lib/convert-forms/handle-form-id');
const { createXformDoc, createXformString, serializeToString, FORM_ID } = require('../../fn/convert-forms.utils');

describe('Handle form id', () => {
  describe('app form', () => {
    it('does nothing when form id matches the expected id', () => {
      const opts = {
        model: `
          <instance>
            <data id="${FORM_ID}" prefix="J1!${FORM_ID}!" >
            </data>
          </instance>
        `
      };
      const doc = createXformDoc(opts);

      handleFormId(doc, `forms/app/${FORM_ID}.xml.swp`);

      const expectedDoc = createXformString(opts);
      expect(serializeToString(doc)).xml.to.equal(expectedDoc);
    });

    it('throws an error when form id does not match expected id', () => {
      const wrongId = 'wrong-id';
      const doc = createXformDoc({
        model: `
          <instance>
            <data id="${wrongId}" prefix="J1!${wrongId}!" >
            </data>
          </instance>
        `
      });

      expect(() => handleFormId(doc, `some/app/${FORM_ID}.xml.swp`)).to.throw(
        `The file name for the form [${
          FORM_ID
        }] does not match the form_id in the xlsx [${
          wrongId
        }]. Rename the form xlsx/xml files to match the form_id.`
      );
    });
  });

  describe('contact form', () => {
    it('does nothing when form id matches the expected id', () => {
      const opts = {
        model: `
          <instance>
            <data id="contact:${FORM_ID}:create" prefix="J1!${FORM_ID}!">
            </data>
          </instance>
        `
      };
      const doc = createXformDoc(opts);

      handleFormId(doc, `forms/contact/${FORM_ID}-create.xml.swp`);

      const expectedDoc = createXformString(opts);
      expect(serializeToString(doc)).xml.to.equal(expectedDoc);
    });

    ['create', 'edit'].forEach(action => {
      it(`updates xml form id when it matches the filename with the ${action} action`, () => {
        const doc = createXformDoc({
          model: `
          <instance>
            <data id="${FORM_ID}-${action}" prefix="J1!${FORM_ID}-${action}!">
            </data>
          </instance>
        `
        });

        handleFormId(doc, `forms/contact/${FORM_ID}-${action}.xml.swp`);

        const expectedDoc = createXformString({
          model: `
          <instance>
            <data id="contact:${FORM_ID}:${action}" prefix="J1!contact:${FORM_ID}:${action}!">
            </data>
          </instance>
        `
        });
        expect(serializeToString(doc)).xml.to.equal(expectedDoc);
      });
    });

    it('throws an error when form id does not match expected id', () => {
      const wrongId = 'wrong-id';
      const doc = createXformDoc({
        model: `
          <instance>
            <data id="contact:${wrongId}:create" prefix="J1!contact:${wrongId}:create!" >
            </data>
          </instance>
        `
      });

      expect(() => handleFormId(doc, `some/contact/${FORM_ID}-create.xml.swp`)).to.throw(
        `The file name for the form [${
          FORM_ID
        }-create] does not match the form_id in the xlsx [contact:${
          wrongId
        }:create]. Rename the form xlsx/xml files to match the form_id.`
      );
    });

    it('other handles forms with the PLACE_TYPE template in the xml', () => {
      const doc = createXformDoc({
        model: `
          <instance>
            <data id="contact:PLACE_TYPE:create" prefix="J1!contact:PLACE_TYPE:create!">
            </data>
          </instance>
        `
      });

      handleFormId(doc, `forms/contact/person-create.xml.swp`);

      const expectedDoc = createXformString({
        model: `
          <instance>
            <data id="contact:PLACE_TYPE:create" prefix="J1!contact:PLACE_TYPE:create!">
            </data>
          </instance>
        `
      });
      expect(serializeToString(doc)).xml.to.equal(expectedDoc);
    });
  });

  describe('training form', () => {
    it('does nothing when form id matches the expected id', () => {
      const opts = {
        model: `
          <instance>
            <data id="training:${FORM_ID}" prefix="J1!${FORM_ID}!">
            </data>
          </instance>
        `
      };
      const doc = createXformDoc(opts);

      handleFormId(doc, `forms/training/${FORM_ID}.xml.swp`);

      const expectedDoc = createXformString(opts);
      expect(serializeToString(doc)).xml.to.equal(expectedDoc);
    });

    it('updates xml form id when it matches the filename', () => {
      const doc = createXformDoc({
        model: `
          <instance>
            <data id="${FORM_ID}" prefix="J1!${FORM_ID}!">
            </data>
          </instance>
        `
      });

      handleFormId(doc, `forms/training/${FORM_ID}.xml.swp`);

      const expectedDoc = createXformString({
        model: `
          <instance>
            <data id="training:${FORM_ID}" prefix="J1!training:${FORM_ID}!">
            </data>
          </instance>
        `
      });
      expect(serializeToString(doc)).xml.to.equal(expectedDoc);
    });

    it('throws an error when form id does not match expected id', () => {
      const wrongId = 'wrong-id';
      const doc = createXformDoc({
        model: `
          <instance>
            <data id="training:${wrongId}" prefix="J1!contact:${wrongId}!" >
            </data>
          </instance>
        `
      });

      expect(() => handleFormId(doc, `some/training/${FORM_ID}.xml.swp`)).to.throw(
        `The file name for the form [${
          FORM_ID
        }] does not match the form_id in the xlsx [training:${
          wrongId
        }]. Rename the form xlsx/xml files to match the form_id.`
      );
    });
  });

  it('handles the case where a non-contact form id ends with an action', () => {
    const opts = {
      model: `
          <instance>
            <data id="${FORM_ID}-create" prefix="J1!${FORM_ID}-create!" >
            </data>
          </instance>
        `
    };
    const doc = createXformDoc(opts);

    handleFormId(doc, `forms/something/${FORM_ID}-create.xml.swp`);

    const expectedDoc = createXformString(opts);
    expect(serializeToString(doc)).xml.to.equal(expectedDoc);
  });
});
