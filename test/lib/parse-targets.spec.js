const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const fs = require('../../src/lib/sync-fs');

let parseTargets = rewire('../../src/lib/parse-targets');

describe('parse-targets', () => {
  let fsExistsStub;
  let fsReadJsonStub;
  let originalRequire;

  beforeEach(() => {
    fsExistsStub = sinon.stub(fs, 'exists');
    fsReadJsonStub = sinon.stub(fs, 'readJson');
    // Mock require for targets.js
    originalRequire = parseTargets.__get__('require');
    parseTargets.__set__('require', sinon.stub());
  });

  afterEach(() => {
    sinon.restore();
    parseTargets.__set__('require', originalRequire);
    parseTargets = rewire('../../src/lib/parse-targets');
  });

  describe('serializeFunction', () => {
    let serializeFunction;

    beforeEach(() => {
      serializeFunction = parseTargets.__get__('serializeFunction');
    });

    it('should serialize function to string', () => {
      const fn = () => 'test';
      expect(serializeFunction(fn)).to.equal(fn.toString());
    });

    it('should return non-function values unchanged', () => {
      expect(serializeFunction('string')).to.equal('string');
      expect(serializeFunction(42)).to.equal(42);
      expect(serializeFunction(null)).to.equal(null);
      expect(serializeFunction({})).to.deep.equal({});
      expect(serializeFunction([])).to.deep.equal([]);
    });
  });

  describe('serializeTarget', () => {
    let serializeTarget;

    beforeEach(() => {
      serializeTarget = parseTargets.__get__('serializeTarget');
    });

    it('should pick specified fields and serialize function fields', () => {
      const target = {
        id: 'test-id',
        type: 'count',
        goal: 10,
        translation_key: 'key',
        passesIfGroupCount: true,
        icon: 'icon.png',
        context: () => ({ enabled: true }),
        subtitle_translation_key: 'subkey',
        dhis: () => ({ id: 'dhis-id' }),
        visible: () => false,
        aggregate: 'sum',
        extra: 'ignored'
      };

      const result = serializeTarget(target);

      expect(result).to.deep.equal({
        id: 'test-id',
        type: 'count',
        goal: 10,
        translation_key: 'key',
        passesIfGroupCount: true,
        icon: 'icon.png',
        context: '() => ({ enabled: true })', // serialized
        subtitle_translation_key: 'subkey',
        dhis: '() => ({ id: \'dhis-id\' })', // serialized
        visible: '() => false', // serialized
        aggregate: 'sum' // not serialized since it's not a function
      });
    });

    it('should handle missing function fields', () => {
      const target = {
        id: 'test-id',
        type: 'count'
      };

      const result = serializeTarget(target);

      expect(result.id).to.equal('test-id');
      expect(result.type).to.equal('count');
      expect(result.context).to.be.undefined;
    });
  });

  describe('parseTargets', () => {
    it('should return json targets if json file exists', () => {
      fsExistsStub.withArgs(sinon.match(/targets\.json$/)).returns(true);
      fsReadJsonStub.returns({ targets: 'from json' });

      const result = parseTargets('/project');

      expect(result).to.deep.equal({ targets: 'from json' });
    });

    it('should parse and serialize js targets', () => {
      fsExistsStub.withArgs(sinon.match(/targets\.json$/)).returns(false);
      fsExistsStub.withArgs(sinon.match(/targets\.js$/)).returns(true);

      const mockTargets = [
        {
          id: 'target1',
          visible: () => true,
          type: 'count'
        }
      ];

      parseTargets.__get__('require').returns(mockTargets);

      const result = parseTargets('/project');

      expect(result.enabled).to.be.true;
      expect(result.items).to.have.length(1);
      expect(result.items[0].id).to.equal('target1');
      expect(result.items[0].visible).to.equal('() => true');
      expect(result.items[0].type).to.equal('count');
    });

    it('should throw error if no targets files exist', () => {
      fsExistsStub.returns(false);

      expect(() => parseTargets('/project')).to.throw('Expected to find targets defined at one of');
    });

    it('should throw error if both json and js exist', () => {
      fsExistsStub.returns(true);

      expect(() => parseTargets('/project')).to.throw('Targets are defined at both');
    });

    it('should throw error if js file does not export array', () => {
      fsExistsStub.withArgs(sinon.match(/targets\.json$/)).returns(false);
      fsExistsStub.withArgs(sinon.match(/targets\.js$/)).returns(true);
      parseTargets.__get__('require').returns('not an array');

      expect(() => parseTargets('/project')).to.throw('Targets.js is expected to module.exports=[] an array');
    });
  });
});
