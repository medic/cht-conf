const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  findAutoIncludeFiles,
  findTasksExtensions,
  findTargetsExtensions,
  findContactSummaryExtensions,
} = require('../../src/lib/auto-include');

describe('auto-include', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cht-conf-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true });
  });

  describe('findTasksExtensions', () => {
    it('should find *.tasks.js files', () => {
      fs.writeFileSync(path.join(testDir, 'tasks.js'), 'module.exports = [];');
      fs.writeFileSync(path.join(testDir, 'stock.tasks.js'), 'module.exports = [];');
      fs.writeFileSync(path.join(testDir, 'vaccination.tasks.js'), 'module.exports = [];');

      const result = findTasksExtensions(testDir);

      expect(result).to.have.length(2);
      expect(result[0]).to.include('stock.tasks.js');
      expect(result[1]).to.include('vaccination.tasks.js');
    });

    it('should exclude tasks.js itself', () => {
      fs.writeFileSync(path.join(testDir, 'tasks.js'), 'module.exports = [];');

      const result = findTasksExtensions(testDir);

      expect(result).to.have.length(0);
    });

    it('should return empty array for non-existent directory', () => {
      const result = findTasksExtensions('/non/existent/path');

      expect(result).to.deep.equal([]);
    });

    it('should sort files alphabetically for deterministic order', () => {
      fs.writeFileSync(path.join(testDir, 'z-last.tasks.js'), '');
      fs.writeFileSync(path.join(testDir, 'a-first.tasks.js'), '');
      fs.writeFileSync(path.join(testDir, 'm-middle.tasks.js'), '');

      const result = findTasksExtensions(testDir);

      expect(path.basename(result[0])).to.equal('a-first.tasks.js');
      expect(path.basename(result[1])).to.equal('m-middle.tasks.js');
      expect(path.basename(result[2])).to.equal('z-last.tasks.js');
    });
  });

  describe('findTargetsExtensions', () => {
    it('should find *.targets.js files', () => {
      fs.writeFileSync(path.join(testDir, 'targets.js'), 'module.exports = [];');
      fs.writeFileSync(path.join(testDir, 'stock.targets.js'), 'module.exports = [];');

      const result = findTargetsExtensions(testDir);

      expect(result).to.have.length(1);
      expect(result[0]).to.include('stock.targets.js');
    });

    it('should exclude targets.js itself', () => {
      fs.writeFileSync(path.join(testDir, 'targets.js'), 'module.exports = [];');

      const result = findTargetsExtensions(testDir);

      expect(result).to.have.length(0);
    });
  });

  describe('findContactSummaryExtensions', () => {
    it('should find *.contact-summary.js files', () => {
      fs.writeFileSync(path.join(testDir, 'contact-summary.templated.js'), 'module.exports = {};');
      fs.writeFileSync(path.join(testDir, 'stock.contact-summary.js'), 'module.exports = {};');

      const result = findContactSummaryExtensions(testDir);

      expect(result).to.have.length(1);
      expect(result[0]).to.include('stock.contact-summary.js');
    });

    it('should exclude contact-summary.templated.js', () => {
      fs.writeFileSync(path.join(testDir, 'contact-summary.templated.js'), 'module.exports = {};');

      const result = findContactSummaryExtensions(testDir);

      expect(result).to.have.length(0);
    });
  });

  describe('findAutoIncludeFiles', () => {
    it('should only return files, not directories', () => {
      fs.writeFileSync(path.join(testDir, 'real.tasks.js'), '');
      fs.mkdirSync(path.join(testDir, 'fake.tasks.js'));

      const result = findAutoIncludeFiles(testDir, '.tasks.js', 'tasks.js');

      expect(result).to.have.length(1);
      expect(result[0]).to.include('real.tasks.js');
    });
  });
});
