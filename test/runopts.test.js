// B0: per-run options decide what a run may change (XP, tallies, records, ghosts, scores, outfit). node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');
const DT = 1 / 30;

const begin = (E, mode, run) => { E.setLevel(0); E.start(mode, undefined, run ? { run } : undefined); for (let i = 0; i < 91; i++) E.tick(DT); E.S.people.length = 0; };
const finishRace = E => { E.S.pz = E.LV.goal + 1; E.tick(DT); for (let i = 0; i < 60; i++) E.tick(DT); };
const snapshot = E => JSON.stringify({ tally: E.tallySnapshot(), xp: E.xp(), keys: Object.keys(E.storage).filter(k => /best|ghost|tally|xp|played/.test(k)).sort().map(k => [k, E.storage[k]]) });

test('an ordinary run keeps the standard policy', () => {
  const E = load(); begin(E, 'race');
  assert.strictEqual(E.S.run.category, 'standard');
  assert.strictEqual(JSON.stringify(E.S.run.policy), JSON.stringify({ xp: true, progress: true, records: true, scores: true, ghosts: true }));
});

test('a practice run cannot pay XP, move tallies, write bests or ghosts', () => {
  const E = load(); begin(E, 'race', { category: 'practice' });
  assert.strictEqual(E.S.run.category, 'practice');
  const before = snapshot(E);
  E.S.passed = 5; E.onPass(E.mkPerson(E.S.px + 0.6, E.S.pz - 0.1));   // a pass would normally count toward unlocks
  E.keys.l = false; finishRace(E);
  assert.strictEqual(E.S.xpGained || 0, 0, 'no xp');
  assert.strictEqual(snapshot(E), before, 'xp, tallies, bests and ghosts untouched');
});

test('control: the same race as a standard run does change xp, tallies and bests', () => {
  const E = load(); begin(E, 'race');
  const before = snapshot(E);
  E.onPass(E.mkPerson(E.S.px + 0.6, E.S.pz - 0.1)); finishRace(E);
  assert.notStrictEqual(snapshot(E), before);
  assert.ok(E.S.xpGained > 0);
});

test('a practice classic run cannot write a best score or ghost either', () => {
  const E = load(); begin(E, 'classic', { category: 'practice' });
  const before = snapshot(E);
  E.S.score = 5000; E.onPass(E.mkPerson(E.S.px + 0.6, E.S.pz - 0.1)); E.quitRun();
  assert.strictEqual(snapshot(E), before);
  assert.strictEqual(E.S.newBest, false);
});

test('a supplied outfit changes that run only; the saved outfit stays', () => {
  const E = load(); const saved = JSON.stringify(E.LOOK);
  const base = load(); begin(base, 'race');
  begin(E, 'race', { category: 'practice', outfit: { shirt: '#123456', body: 'f', build: 'strong' } });
  assert.strictEqual(E.S.me.shirt, '#123456');
  assert.strictEqual(E.S.me.body, 'f');
  assert.notDeepStrictEqual(E.S.race.me, base.S.race.me, 'stats follow the supplied outfit');
  assert.strictEqual(JSON.stringify(E.LOOK), saved, 'saved outfit untouched');
  E.toMenu();
  assert.strictEqual(JSON.stringify(E.LOOK), saved);
  assert.strictEqual(E.storage.excuseme_look, undefined);
  E.start('race'); assert.strictEqual(E.S.me.shirt, E.LOOK.shirt, 'the next ordinary run uses the saved outfit');
});

test('the same seed rebuilds the same layout, a different seed does not', () => {
  const lay = seed => { const E = load(); E.setLevel(0); E.start('race', undefined, { run: { category: 'practice', seed } }); return JSON.stringify(E.S.people.map(p => [p.x.toFixed(3), p.z.toFixed(3)])); };
  const a = lay('lesson-1'), b = lay('lesson-1'), c = lay('lesson-2');
  assert.strictEqual(a, b); assert.notStrictEqual(a, c);
  assert.ok(JSON.parse(a).length > 5);
});

test('record keys: standard keeps the legacy key, other categories and rules never share it', () => {
  const E = load();
  const k = E.recordKey;
  const std = { category: 'standard', rules: 1 };
  assert.strictEqual(k('excuseme_race_best_airport', std), 'excuseme_race_best_airport');
  const keys = new Set([k('x', std), k('x', { category: 'challenge', rules: 1 }), k('x', { category: 'challenge', rules: 2 }), k('x', { category: 'standard', rules: 2 })]);
  assert.strictEqual(keys.size, 4);
});

test('practice setup is not mistaken for a daily/weekly try and never uses one up', () => {
  const E = load(); begin(E, 'race', { category: 'practice' });
  assert.strictEqual(E.hasPlayed('daily'), false); assert.strictEqual(E.hasPlayed('weekly'), false);
});

test('friendcup explicitly isolates all ordinary rewards and records', () => {
  const vm = require('node:vm'), esbuild = require('esbuild');
  const source = "import { POLICIES, makeRun } from './src/sim/runopts.js'; globalThis.result = { policy: POLICIES.friendcup, run: makeRun({category:'friendcup'}) };";
  const context = {};
  vm.runInNewContext(esbuild.buildSync({ stdin: { contents: source, resolveDir: process.cwd() }, bundle: true, format: 'iife', write: false }).outputFiles[0].text, context);
  const expected = { xp: false, progress: false, records: false, scores: false, ghosts: false };
  assert.deepStrictEqual(JSON.parse(JSON.stringify(context.result.policy)), expected);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(context.result.run.policy)), expected);
});
