const { expect } = require('chai');
const rewire = require('rewire');
const /*ernesto*/che/*Guevara?*/ = rewire('../../src/lib/configurable-hierarchy-enforcement');
const log = require('../../src/lib/log');
log.level = log.LEVEL_INFO;

describe('configurable hierarchy enforcement', () => {
  const scenario = async (contact_types, contactType, parentType) => {
    const mockDb = { get: () => ({ settings: { contact_types } }) };
    const enforcer = await che(mockDb);
    return enforcer({ type: contactType }, { type: parentType });
  };

  it('no defined rules yields no error', async () => expect(await scenario(undefined, 'person', 'health_center')).to.be.undefined);
  
  it('no defined rules yields not defined', async () => expect(await scenario([], 'person', 'health_center')).to.include('not define'));
  it('no valid parent yields not defined', async () => expect(await scenario([undefined], 'person', 'health_center')).to.include('not define'));
  
  it('valid parent yields no error', async () => {
    const actual = await scenario([{
      id: 'person',
      parents: ['health_center'],
    }], 'person', 'health_center');

    expect(actual).to.be.undefined;
  });

  it('no contact type yields undefined error', async () => expect(await scenario([])).to.include('undefined'));
  it('no parent type yields undefined error', async () => expect(await scenario([], 'person')).to.include('undefined'));

  it('no valid parents yields not defined', async () => expect(await scenario([{
    id: 'person',
    parents: ['district_hospital'],
  }], 'person', 'health_center')).to.include('does not allow parent'));
});
