const { expect } = require('chai');
const path = require('path');
const fs = require('fs');
const os = require('os');
const sinon = require('sinon');
const rewire = require('rewire');
const {
  findConfigFiles,
  collectConfigFiles,
  findTasksFiles,
  findTargetsFiles,
  findContactSummaryFiles,
} = require('../../src/lib/auto-include');

describe('auto-include', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cht-conf-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true });
  });

  const writeFile = (dir, name, content = 'module.exports = [];') => {
    fs.mkdirSync(path.join(testDir, dir), { recursive: true });
    fs.writeFileSync(path.join(testDir, dir, name), content);
  };

  describe('findTasksFiles', () => {
    it('finds all *.js files in the tasks directory', () => {
      writeFile('tasks', 'base.js');
      writeFile('tasks', 'stock.js');

      const result = findTasksFiles(testDir);

      expect(result).to.have.length(2);
      expect(result[0]).to.include(path.join('tasks', 'base.js'));
      expect(result[1]).to.include(path.join('tasks', 'stock.js'));
    });

    it('returns empty array when the tasks directory is absent', () => {
      expect(findTasksFiles(testDir)).to.deep.equal([]);
    });

    it('sorts files alphabetically for deterministic order', () => {
      writeFile('tasks', 'z-last.js');
      writeFile('tasks', 'a-first.js');
      writeFile('tasks', 'm-middle.js');

      const result = findTasksFiles(testDir).map(p => path.basename(p));

      expect(result).to.deep.equal(['a-first.js', 'm-middle.js', 'z-last.js']);
    });

    it('ignores non-js files and subdirectories', () => {
      writeFile('tasks', 'base.js');
      writeFile('tasks', 'notes.txt', 'hello');
      fs.mkdirSync(path.join(testDir, 'tasks', 'nested'));

      const result = findTasksFiles(testDir).map(p => path.basename(p));

      expect(result).to.deep.equal(['base.js']);
    });
  });

  describe('findTargetsFiles', () => {
    it('finds *.js files in the targets directory', () => {
      writeFile('targets', 'base.js');
      expect(findTargetsFiles(testDir).map(p => path.basename(p))).to.deep.equal(['base.js']);
    });
  });

  describe('findContactSummaryFiles', () => {
    it('finds *.js files in the contact-summary directory', () => {
      writeFile('contact-summary', 'base.js');
      expect(findContactSummaryFiles(testDir).map(p => path.basename(p))).to.deep.equal(['base.js']);
    });
  });

  describe('findConfigFiles', () => {
    it('returns absolute paths', () => {
      writeFile('tasks', 'base.js');
      const [result] = findConfigFiles(testDir, 'tasks');
      expect(path.isAbsolute(result)).to.equal(true);
    });

    it('surfaces non-ENOENT errors instead of silently returning []', () => {
      // A plain file where a directory is expected makes readdirSync throw
      // ENOTDIR; config that exists but cannot be read must fail loudly.
      fs.writeFileSync(path.join(testDir, 'tasks'), 'not a directory');
      expect(() => findConfigFiles(testDir, 'tasks')).to.throw(/ENOTDIR/);
    });
  });

  describe('collectConfigFiles', () => {
    const opts = { baseFilename: 'tasks.js', subdir: 'tasks', label: 'tasks' };

    it('orders the deprecated base file first, then directory files alphabetically', () => {
      fs.writeFileSync(path.join(testDir, 'tasks.js'), 'module.exports = [];');
      writeFile('tasks', 'a.js');
      writeFile('tasks', 'b.js');

      const result = collectConfigFiles(testDir, opts).map(p => path.basename(p));

      expect(result).to.deep.equal(['tasks.js', 'a.js', 'b.js']);
    });

    it('omits the base file when it does not exist', () => {
      writeFile('tasks', 'base.js');
      const result = collectConfigFiles(testDir, opts).map(p => path.basename(p));
      expect(result).to.deep.equal(['base.js']);
    });

    it('warns the base file is deprecated and logs each directory file when log is true', () => {
      fs.writeFileSync(path.join(testDir, 'tasks.js'), 'module.exports = [];');
      writeFile('tasks', 'a.js');
      const mod = rewire('../../src/lib/auto-include');
      const warn = sinon.spy();
      const info = sinon.spy();
      mod.__set__('warn', warn);
      mod.__set__('info', info);

      mod.collectConfigFiles(testDir, { ...opts, log: true });

      expect(warn.calledWithMatch(/tasks\.js is deprecated/)).to.equal(true);
      expect(info.calledWithMatch(/Including tasks: a\.js/)).to.equal(true);
    });

    it('does not log when log is false (default)', () => {
      fs.writeFileSync(path.join(testDir, 'tasks.js'), 'module.exports = [];');
      const mod = rewire('../../src/lib/auto-include');
      const warn = sinon.spy();
      mod.__set__('warn', warn);

      mod.collectConfigFiles(testDir, opts);

      expect(warn.called).to.equal(false);
    });
  });
});
