const { expect } = require('chai');
const fs = require('../../src/lib/sync-fs');
const sinon = require('sinon');
const userPrompt = require('../../src/lib/user-prompt');
const { warn } = require('../../src/lib/log');

describe('sync-fs', () => {

  describe('#withoutExtension()', () => {

    [
      ['person.xml', 'person'],
      ['person.abc.xml', 'person.abc'],
    ].forEach(([input, expected]) => {

      it(`should convert ${input} to ${expected}`, () => {
        expect(fs.withoutExtension(input), expected);
      });
    });
  });

  describe('#isDirectoryEmpty()', () => {
    afterEach(() => {
      sinon.restore();
    });

    it('should return true for an empty directory', () => {
      const readdirSyncStub = sinon.stub(fs.fs, 'readdirSync').returns([]);

      const emptyDir = 'path/to/empty/directory';
      expect(fs.isDirectoryEmpty(emptyDir)).to.be.true;

      expect(readdirSyncStub.calledWith(emptyDir)).to.be.true;
    });

    it('should return false for a non-empty directory', () => {
      const readdirSyncStub = sinon.stub(fs.fs, 'readdirSync').returns(['file1', 'file2']);

      const nonEmptyDir = 'path/to/non-empty/directory';
      expect(fs.isDirectoryEmpty(nonEmptyDir)).to.be.false;

      expect(readdirSyncStub.calledWith(nonEmptyDir)).to.be.true;
    });
  });

  describe('#warnIfDirectoryIsNotEmpty()', () => {
    afterEach(() => {
      sinon.restore();
    });

    const warnSpy = sinon.spy(warn);

    it('should not trigger warning if directory is empty', () => {
      const dir = 'emptyDirectory';
      const warningMsg = 'This is a warning message';

      sinon.stub(fs.fs, 'readdirSync').returns([]);
      sinon.stub(userPrompt, 'keyInYN').returns(true);

      fs.warnIfDirectoryIsNotEmpty(dir, warningMsg);

      expect(userPrompt.keyInYN.called).to.be.false;
    });

    it('should trigger warning and user prompt if directory is not empty', () => {
      const dir = 'nonEmptyDirectory';
      const warningMsg = 'This is a warning message';

      sinon.stub(fs.fs, 'readdirSync').returns(['file1']);
      sinon.stub(userPrompt, 'keyInYN').returns(true);

      expect(() => fs.warnIfDirectoryIsNotEmpty(dir, warningMsg)).to.not.throw();

      expect(warnSpy.calledWith(warningMsg));
      expect(userPrompt.keyInYN.calledWith('Are you sure you want to continue?')).to.be.true;
    });

    it('should throw an error if user chooses not to continue', () => {
      const dir = 'nonEmptyDirectory';
      const warningMsg = 'This is a warning message';

      sinon.stub(fs.fs, 'readdirSync').returns(['file1']);
      sinon.stub(userPrompt, 'keyInYN').returns(false);

      expect(() => fs.warnIfDirectoryIsNotEmpty(dir, warningMsg)).to.throw('User aborted execution.');

      expect(warnSpy.calledWith(warningMsg));
      expect(userPrompt.keyInYN.calledWith('Are you sure you want to continue?')).to.be.true;
    });
  });
});
