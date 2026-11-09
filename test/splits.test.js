const test = require('node:test');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const { load } = require('./harness.js');
const code = esbuild.buildSync({ entryPoints: ['src/sim/splits.js'], bundle: true, format: 'cjs', write: false }).outputFiles[0].text;
const mod = { exports: {} }; new Function('module', 'exports', code)(mod, mod.exports);
const { splitPoints, timeAtZ, splitText, splitColor } = mod.exports;
test('split distances are quarters of the goal', () => assert.deepEqual(splitPoints(180), [45, 90, 135]));
test('ghost time interpolates the first crossing despite backtracking', () => {
  assert.equal(timeAtZ([0, 0, 2, 10, 4, 0, 6, 20], 2, 5), 1);
  assert.equal(timeAtZ([0, 0, 0, 10], 2, 10), 2);
  assert.equal(timeAtZ([0, 5, 0, 10], 2, 3), 0);
});
test('unreached distances return null, including empty samples', () => {
  assert.equal(timeAtZ([], 0.4, 10), null);
  assert.equal(timeAtZ([0, 0, 0, 5], 0.4, 10), null);
});
test('deltas have one decimal and signs except rounded zero', () => {
  assert.equal(splitText(-0.44), '-0.4'); assert.equal(splitText(1.24), '+1.2');
  for (const n of [0, -0, 0.04, -0.04]) assert.equal(splitText(n), '0.0');
});
const key = 'excuseme_ghost_race_airport:rt1';
function begin(E, opts) { E.setLevel(0); E.start('race', undefined, opts); E.S.race.countT = 0; }
function crossing(E, fraction, time = 1) {
  E.S.pops.length = 0; E.S.pz = E.LV.goal * fraction; E.S.time = time; E.S.people.length = 0; E.S.nextChunk = E.S.pz + 100; E.tick(0);
  return E.S.pops.filter(p => /^[+-]?\d+\.\d$/.test(p.text));
}
function saved() {
  const E = load(); E.storage[key] = JSON.stringify([0, 0, 0, 1000]); begin(E);
  assert.equal(crossing(E, 0.25).length, 1, 'saved ghost produces a split (positive control)');
  return E;
}
test('saved ghost splits use recorded points even with the visible ghost cleared, and show once per run', () => {
  const E = saved(); E.S.ghost = null;
  assert.equal(crossing(E, 0.1).length, 0); assert.equal(crossing(E, 0.25).length, 0);
  let pops = crossing(E, 0.5, 0); assert.equal(pops.length, 1); assert.equal(pops[0].color, '#7ee081');
  pops = crossing(E, 0.75, 2); assert.equal(pops.length, 1); assert.equal(pops[0].color, '#ff6b6b');
  assert.equal(crossing(E, 0.75).length, 0);
  begin(E); assert.equal(crossing(E, 0.25).length, 1);
});
test('no splits without a saved best or beyond its last distance', () => {
  const E = saved(); delete E.storage[key]; begin(E); assert.equal(crossing(E, 0.75).length, 0);
  E.storage[key] = JSON.stringify([0, 0, 0, 1]); begin(E); assert.equal(crossing(E, 0.75).length, 0);
});
test('Cup, Practice, Weekly, Classic and friend rooms never show splits', () => {
  const E = saved();
  for (const category of ['cup', 'practice', 'challenge']) {
    begin(E, { run: { category } }); assert.equal(crossing(E, 0.75).length, 0, category);
  }
  E.start('classic'); assert.equal(crossing(E, 0.75).length, 0);
  begin(E); E.S.duel = {}; assert.equal(crossing(E, 0.75).length, 0, 'friend room');
});

test('split colour matches what the player reads, so a rounded level split is never red', () => {
  assert.equal(splitColor(-0.2), '#7ee081');
  assert.equal(splitColor(-0.04), '#7ee081');
  assert.equal(splitColor(0.04), '#7ee081');
  assert.equal(splitColor(0.2), '#ff6b6b');
});
