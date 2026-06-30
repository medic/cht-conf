const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const rewire = require('rewire');

const compileContactSummary = require('../../../src/lib/compilation/compile-contact-summary');

const BASE_DIR = path.join(__dirname, '../../data/compile-contact-summary');

const evalInContext = (js, contact, reports, lineage) => new Function(
  'contact', 'reports', 'lineage', js
)(contact, reports, lineage);

describe('compile-contact-summary', () => {
  const options = { minifyScripts: true };

  it('emits empty config when no contact-summary files exist', async () => {
    const compiled = await compileContactSummary(`${BASE_DIR}/empty`, {});
    const result = evalInContext(compiled, { type: 'person' }, [], []);
    expect(result).to.deep.equal({ fields: [], cards: [], context: {} });
  });

  it('compiles config from the contact-summary directory', async () => {
    const compiled = await compileContactSummary(`${BASE_DIR}/directory`, options);
    const result = evalInContext(compiled, { type: 'person' }, [], []);

    expect(result.fields.map(f => f.label)).to.deep.equal(['name']);
    expect(result.cards.map(c => c.label)).to.deep.equal(['base.card']);
    expect(result.context).to.deep.equal({ muted: false });
  });

  it('templated script', async () => {
    const compiled = await compileContactSummary(`${BASE_DIR}/templated`, options);

    const contact = {
      foo: 'bar',
      type: 'person',
      date_of_birth: 1500,
    };
    const result = evalInContext(compiled, contact, {}, []);
    expect(result).to.deep.eq({
      fields: [
        {
          label: 'testing',
          value: 5,
        },
        {
          filter: 'age',
          label: 'contact.age',
          value: 1500,
          width: 3,
        },
      ],
      context: {
        foo: 'bar',
        muted: false,
      },
      cards: [
        {
          fields: [],
          label: 'card1'
        }
      ],
    });

    const otherContact = { type: 'clinic' };
    const otherResult = evalInContext(compiled, otherContact, {}, []);
    expect(otherResult).to.deep.eq({
      fields: [
        {
          label: 'not.a.person',
          value: 'clinic',
          width: 3,
        },
      ],
      context: {
        foo: 'bar',
        muted: undefined,
      },
      cards: [
        {
          fields: [],
          label: 'card2',
        }
      ],
    });
  });

  it('configurable hierarchies', async () => {
    const compiled = await compileContactSummary(`${BASE_DIR}/configurable-hierarchies`, options);

    const patient = {
      type: 'contact',
      contact_type: 'patient',
      date_of_birth: 'Oct 10 2015',
    };
    const resultPatient = evalInContext(compiled, patient, {}, []);
    expect(resultPatient).to.deep.equal({
      fields: [
        {
          label: 'testing',
          value: 5,
        },
        {
          filter: 'age',
          label: 'contact.age',
          value: 'Oct 10 2015',
          width: 3,
        },
        {
          label: 'everyone.except.chw',
          value: 100,
          width: 3,
        },
      ],
      context: {
        foo: 'bar',
        muted: false,
      },
      cards: [
        {
          fields: [],
          label: 'for.patient'
        }
      ],
    });

    const chw = {
      type: 'contact',
      contact_type: 'chw',
      phone: '555 8758',
    };
    const resultChw = evalInContext(compiled, chw, {}, []);
    expect(resultChw).to.deep.equal({
      fields: [
        {
          filter: 'phone',
          label: 'contact.phone',
          value: '555 8758',
        },
      ],
      context: {
        foo: 'bar',
        muted: false,
      },
      cards: [
        {
          fields: [],
          label: 'for.chw'
        }
      ],
    });

    const clinic = {
      type: 'contact',
      contact_type: 'clinic',
      place_id: '22222',
    };
    const resultClinic = evalInContext(compiled, clinic, {}, []);
    expect(resultClinic).to.deep.equal({
      fields: [
        {
          label: 'everyone.except.chw',
          value: 100,
          width: 3,
        },
        {
          label: 'contact.place_id',
          value: '22222',
          width: 2,
        },
      ],
      context: {
        foo: 'bar',
        muted: false,
      },
      cards: [
        {
          fields: [],
          label: 'for.clinic'
        }
      ],
    });
  });

  it('merges context, fields and cards from contact-summary/*.js with the templated base most preferred', async () => {
    const compiled = await compileContactSummary(`${BASE_DIR}/with-extensions`, options);

    const contact = { type: 'person' };
    const result = evalInContext(compiled, contact, {}, []);

    // Context has both base and extension vars; base is most preferred (first-writer-wins)
    expect(result.context.baseVar).to.equal('from-base');
    expect(result.context.extensionVar).to.equal('from-extension');
    expect(result.context.overrideMe).to.equal('base-value');

    // Fields include both, base first
    expect(result.fields).to.have.length(2);
    expect(result.fields[0].label).to.equal('base.field');
    expect(result.fields[1].label).to.equal('extension.field');

    // Cards include both, base first
    expect(result.cards).to.have.length(2);
    expect(result.cards[0].label).to.equal('base.card');
    expect(result.cards[1].label).to.equal('extension.card');
  });

  it('warns that contact-summary.templated.js is deprecated', async () => {
    const mod = rewire('../../../src/lib/compilation/compile-contact-summary');
    const warn = sinon.spy();
    mod.__set__('warn', warn);

    await mod(`${BASE_DIR}/templated`, options);

    expect(warn.calledWithMatch(/contact-summary\.templated\.js is deprecated/)).to.equal(true);
  });
});
