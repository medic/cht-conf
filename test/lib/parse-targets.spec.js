const path = require('path');
const fs = require('fs');
const os = require('os');
const { expect } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const parseTargets = require('../../src/lib/parse-targets');

describe('parse-targets', () => {
  let dir;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cht-targets-')); });
  afterEach(() => { fs.rmSync(dir, { recursive: true }); });

  const writeJs = (rel, body) => {
    fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  };
  const writeJson = (rel, obj) => {
    fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), JSON.stringify(obj));
  };

  it('returns empty items when nothing is defined', () => {
    expect(parseTargets(dir)).to.deep.equal({ enabled: true, items: [] });
  });

  it('reads legacy targets.js base file', () => {
    writeJs('targets.js', 'module.exports = [{ id: "a", type: "count", goal: 1 }];');
    const result = parseTargets(dir);
    expect(result.items.map(t => t.id)).to.deep.equal(['a']);
    expect(result.enabled).to.equal(true);
  });

  it('reads targets/*.js directory files', () => {
    writeJs('targets/base.js', 'module.exports = [{ id: "b", type: "count", goal: 1 }];');
    const result = parseTargets(dir);
    expect(result.items.map(t => t.id)).to.deep.equal(['b']);
  });

  it('merges base file first then directory files', () => {
    writeJs('targets.js', 'module.exports = [{ id: "a", type: "count", goal: 1 }];');
    writeJs('targets/z.js', 'module.exports = [{ id: "z", type: "count", goal: 1 }];');
    const result = parseTargets(dir);
    expect(result.items.map(t => t.id)).to.deep.equal(['a', 'z']);
  });

  it('returns legacy targets.json verbatim when no directory files exist', () => {
    writeJson('targets.json', {});
    expect(parseTargets(dir)).to.deep.equal({});
  });

  it('throws when targets.json coexists with the targets/ directory (no silent merge)', () => {
    writeJson('targets.json', { enabled: false, items: [{ id: 'j' }] });
    writeJs('targets/extra.js', 'module.exports = [{ id: "e", type: "count", goal: 1 }];');
    expect(() => parseTargets(dir)).to.throw(/targets\.json is deprecated/);
  });

  it('throws if both targets.json and targets.js exist', () => {
    writeJson('targets.json', {});
    writeJs('targets.js', 'module.exports = [];');
    expect(() => parseTargets(dir)).to.throw(/both/);
  });

  it('picks only whitelisted target fields from js files', () => {
    writeJs('targets.js', 'module.exports = [{ id: "a", type: "count", goal: 1, secret: "x" }];');
    const result = parseTargets(dir);
    expect(result.items[0]).to.not.have.property('secret');
    expect(result.items[0]).to.include({ id: 'a', type: 'count', goal: 1 });
  });

  it('keeps percentage_count_translation_key (whitelist derived from schema)', () => {
    writeJs('targets.js',
      'module.exports = [{ id: "a", type: "percent", goal: 1, percentage_count_translation_key: "k" }];');
    const result = parseTargets(dir);
    expect(result.items[0]).to.have.property('percentage_count_translation_key', 'k');
  });

  it('warns that targets.json is deprecated', () => {
    writeJson('targets.json', {});
    const mod = rewire('../../src/lib/parse-targets');
    const warn = sinon.spy();
    mod.__set__('warn', warn);

    mod(dir);

    expect(warn.calledWithMatch(/targets\.json is deprecated/)).to.equal(true);
  });

  it('does not warn from parse-targets when only targets.js is present (avoids double warning)', () => {
    writeJs('targets.js', 'module.exports = [];');
    const mod = rewire('../../src/lib/parse-targets');
    const warn = sinon.spy();
    mod.__set__('warn', warn);

    mod(dir);

    expect(warn.called).to.equal(false);
  });
});
