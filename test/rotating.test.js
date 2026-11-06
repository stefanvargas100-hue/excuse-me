// Rotating daily and weekly challenges. node --test
const test = require('node:test');
const assert = require('node:assert');
const path = require('path'), esbuild = require('esbuild');

function load() {
  const out = esbuild.buildSync({ entryPoints: [path.join(__dirname, '..', 'src', 'save', 'rotating.js')], bundle: true, format: 'cjs', write: false, logLevel: 'silent' }).outputFiles[0].text;
  const m = { exports: {} }; new Function('module', 'exports', 'require', out)(m, m.exports, require);
  return m.exports;
}
const { createRotating, challengesFor } = load();
const memStore = () => { const d = {}; return { get: (k, f) => (k in d ? d[k] : f), set: (k, v) => { d[k] = v; } }; };
const make = (st, keys, onDone) => createRotating({ store: st || memStore(), keys: keys || { daily: () => '2026-11-06', weekly: () => '2026-W45' }, onComplete: onDone });

test('everyone gets the same challenges for a day: 3 distinct daily, 2 distinct weekly', () => {
  const a = challengesFor('daily', '2026-11-06'), b = challengesFor('daily', '2026-11-06');
  assert.deepStrictEqual(a, b);
  assert.strictEqual(a.length, 3);
  assert.strictEqual(new Set(a.map(c => c.tally)).size, 3, 'three different things');
  assert.strictEqual(challengesFor('weekly', '2026-W45').length, 2);
});

test('the challenges change from day to day and the weekly ones are bigger', () => {
  const sets = new Set(); for (let d = 1; d <= 20; d++) sets.add(challengesFor('daily', '2026-11-' + String(d).padStart(2, '0')).map(c => c.id).join());
  assert.ok(sets.size >= 10, 'variety across days: ' + sets.size);
  const t = n => challengesFor('daily', '2026-11-06').concat(challengesFor('weekly', '2026-W45')).find(c => c.tally === n);
  const day = challengesFor('daily', '2026-11-06')[0], week = challengesFor('weekly', '2026-W45')[0];
  assert.ok(week.target >= day.target || week.tally !== day.tally);
});

test('only what you do while the challenge is active counts, and progress is saved', () => {
  const st = memStore(), r = make(st);
  const c = r.list().find(x => x.period === 'daily');
  r.add(c.tally, 3);
  assert.strictEqual(make(st).list().find(x => x.id === c.id).progress, 3, 'survives a restart');
  r.add('not-a-challenge', 99);   // ignored
});

test('finishing a challenge reports it once and counts it in the total', () => {
  const done = [], r = make(null, null, c => done.push(c.id));
  const c = r.list().find(x => x.period === 'daily');
  r.add(c.tally, c.target - 1); assert.strictEqual(done.length, 0);
  r.add(c.tally, 1); r.add(c.tally, 5);
  assert.deepStrictEqual(done, [c.id]);
  const item = r.list().find(x => x.id === c.id);
  assert.strictEqual(item.done, true);
  assert.strictEqual(item.progress, item.target, 'progress is capped at the target');
  assert.strictEqual(r.completedTotal(), 1);
});

test('a new day starts fresh but keeps your lifetime total', () => {
  const st = memStore(); let day = '2026-11-06';
  const keys = { daily: () => day, weekly: () => '2026-W45' };
  const r1 = make(st, keys); const c = r1.list().find(x => x.period === 'daily'); r1.add(c.tally, c.target);
  day = '2026-11-07';
  const r2 = make(st, keys);
  assert.ok(r2.list().filter(x => x.period === 'daily').every(x => x.progress === 0 && !x.done), 'fresh day');
  assert.strictEqual(r2.completedTotal(), 1);
});

// ---- "next unlock" line on the results screen, through the real game ----
const { load: loadGame } = require('./harness.js');
test('next goal is the unfinished challenge you are closest to', () => {
  const E = loadGame();
  assert.strictEqual(E.nextGoal(), null, 'nothing started, nothing to show');
  E.track('razor', 90);    // Shades: 90 / 100
  E.track('passes', 200);  // Beanie: 200 / 1000
  const g = E.nextGoal();
  assert.strictEqual(g.name, 'Shades');
  assert.strictEqual(g.remaining, 10);
  E.track('razor', 10);    // Shades unlocked, next closest takes over
  assert.notStrictEqual(E.nextGoal().name, 'Shades');
});

test('rotating challenges count real play through track()', () => {
  const E = loadGame();
  const c = E.rotatingList().find(x => x.period === 'daily');
  E.track(c.tally, 2);
  assert.strictEqual(E.rotatingList().find(x => x.id === c.id).progress, 2);
});
