const { expect } = require('chai');
const rewire = require('rewire');
const Mergeremove = rewire('../../src/fn/merge-contacts');
const parseExtraArgs = Mergeremove.__get__('parseExtraArgs');

describe('merge-contacts', () => {
  describe('parseExtraArgs', () => {
    it('undefined arguments', () => {
      expect(() => parseExtraArgs(__dirname, undefined)).to.throw('required contact');
    });

    it('empty arguments', () => expect(() => parseExtraArgs(__dirname, [])).to.throw('required contact'));

    it('remove only', () => expect(() => parseExtraArgs(__dirname, ['--remove=a'])).to.throw('required contact'));

    it('remove and keeps', () => {
      const args = ['--sources=food,is,tasty', '--destination=bar', '--docDirectoryPath=/', '--force=hi'];
      expect(parseExtraArgs(__dirname, args)).to.deep.eq({
        sourceIds: ['food', 'is', 'tasty'],
        destinationId: 'bar',
        disableUsers: false,
        mergePrimaryContacts: false,
        force: true,
        docDirectoryPath: '/',
      });
    });
  });
});
