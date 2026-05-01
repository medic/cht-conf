const { expect } = require('chai');
const sinon = require('sinon');
const log = require('../../../src/lib/log');
const { removeNoLabelNodes } = require('../../../src/lib/convert-forms/handle-no-label-placeholders');
const { createXformDoc, createXformString, serializeToString } = require('../../fn/convert-forms.utils');

describe('Handle NO_LABEL placeholders', () => {
  beforeEach(() => {
    sinon.stub(log, 'warn');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('removes labels and itext text nodes that are only NO_LABEL', () => {
    const doc = createXformDoc({
      itext: `
        <translation lang="en">
          <text id="lbl1">
            <value>NO_LABEL</value>
          </text>
          <text id="lbl2">
            <value>Some label</value>
          </text>
          <text id="lbl3">
            <value>DELETE_THIS_LINE</value>
          </text>
        </translation>
      `,
      body: `
        <group>
          <input ref="/data/a">
            <label ref="jr:itext('lbl1')"/>
          </input>
          <input ref="/data/b">
            <label ref="jr:itext('lbl2')"/>
          </input>
          <input ref="/data/c">
            <label ref="jr:itext('lbl3')"/>
          </input>
        </group>
      `
    });

    removeNoLabelNodes(doc);

    expect(log.warn.callCount).to.equal(1);
    expect(log.warn.firstCall.args[0]).to.include('The "NO_LABEL" value is deprecated');

    const expectedDoc = createXformString({
      itext: `
        <translation lang="en">
          <text id="lbl2">
            <value>Some label</value>
          </text>
        </translation>
      `,
      body: `
        <group>
          <input ref="/data/a" />
          <input ref="/data/b">
            <label ref="jr:itext('lbl2')"/>
          </input>
          <input ref="/data/c" />
        </group>
      `
    });
    expect(serializeToString(doc)).xml.to.equal(expectedDoc);
  });

  it('keeps label when text has other values, but removes NO_LABEL values', () => {
    const doc = createXformDoc({
      itext: `
        <translation lang="en">
          <text id="lbl3">
            <value>NO_LABEL</value>
            <value>DELETE_THIS_LINE</value>
            <value form="image">jr://images/some.png</value>
          </text>
        </translation>
      `,
      body: `
        <input ref="/data/c">
          <label ref="jr:itext('lbl3')"/>
        </input>
      `
    });

    removeNoLabelNodes(doc);

    expect(log.warn.callCount).to.equal(1);
    expect(log.warn.firstCall.args[0]).to.include('The "NO_LABEL" value is deprecated');

    const expectedDoc = createXformDoc({
      itext: `
        <translation lang="en">
          <text id="lbl3">
            <value form="image">jr://images/some.png</value>
          </text>
        </translation>
      `,
      body: `
        <input ref="/data/c">
          <label ref="jr:itext('lbl3')"/>
        </input>
      `
    });
    expect(serializeToString(doc)).xml.to.equal(expectedDoc);
  });

  it('handles multiple translations with NO_LABEL by removing all and associated labels', () => {
    const doc = createXformDoc({
      itext: `
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
      `,
      body: `
        <input ref="/data/d">
          <label ref="jr:itext('lbl4')"/>
        </input>
      `
    });

    removeNoLabelNodes(doc);

    expect(log.warn.callCount).to.equal(1);
    expect(log.warn.firstCall.args[0]).to.include('The "NO_LABEL" value is deprecated');

    const expectedDoc = createXformDoc({
      itext: `
        <translation lang="en" />
        <translation lang="fr" />
      `,
      body: `<input ref="/data/d"/>`
    });
    expect(serializeToString(doc)).xml.to.equal(expectedDoc);
  });
});
