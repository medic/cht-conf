const rewire = require('rewire');
const { expect } = require('chai');

const repositoryFactory = rewire('../../src/lib/repository-factory');

describe('repository factory', () => {
  describe('parseLocalUrl', () => {
    const parseLocalUrl = repositoryFactory.__get__('parseLocalUrl');
    it('basic', () =>
      expect(parseLocalUrl('http://admin:pass@localhost:5988/medic').href).to.eq('http://admin:pass@localhost:5988/'));
    
    it('updates port', () =>
      expect(parseLocalUrl('http://admin:pass@localhost:5984/medic').href).to.eq('http://admin:pass@localhost:5988/'));

    it('ignores path', () =>
      expect(parseLocalUrl('http://admin:pass@localhost:5984/foo').href).to.eq('http://admin:pass@localhost:5988/'));
  });
});