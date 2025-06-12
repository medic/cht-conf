const { expect } = require('chai');
const rewire = require('rewire');
const MoveContactsAction = rewire('../../src/fn/move-contacts');

describe('move-contacts', () => {
  describe('parseExtraArgs', () => {
    const parseExtraArgs = MoveContactsAction.__get__('parseExtraArgs');
    it('undefined arguments', () => {
      expect(() => parseExtraArgs(__dirname, undefined)).to.throw('required list of contacts');
    });

    it('empty arguments', () => expect(() => parseExtraArgs(__dirname, [])).to.throw('required list of contacts'));

    it('contacts only', () => expect(() => parseExtraArgs(__dirname, ['--contacts=a']))
      .to.throw('required parameter parent'));

    it('contacts and parents', () => {
      const args = ['--contacts=food,is,tasty', '--parent=bar', '--docDirectoryPath=/', '--force=hi'];
      expect(parseExtraArgs(__dirname, args)).to.deep.eq({
        sourceIds: ['food', 'is', 'tasty'],
        destinationId: 'bar',
        force: true,
        docDirectoryPath: '/',
      });
    });
  });
});
