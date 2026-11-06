// Endless classic, one-try daily and weekly runs, and the shared crowd. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');

const DT = 1 / 30;
const clearNear = E => { for (const p of E.S.people) if (Math.abs(p.z - E.S.pz) < 3.5) p.dead = true; };   // keeps the runner alive without touching the crowd that is spawning

for (const lv of [0, 1, 2]) {
  test(`stage ${lv}: classic has no finish line and no clock, you go on until you bump`, () => {
    const E = load(); E.setLevel(lv); E.start('classic');
    assert.strictEqual(E.S.endless, true);
    const goal = E.LEVELS[lv].goal;
    for (let i = 0; i < 30 * 400; i++) { clearNear(E); E.tick(DT); if (E.state !== 'play') break; }   // 400 s: longer than any old time limit
    assert.strictEqual(E.state, 'play', 'still running after 400 s');
    assert.ok(E.S.pz > goal, 'went past the old finish line (' + goal + ' m): ' + E.S.pz.toFixed(0));
    assert.ok(E.S.people.filter(p => !p.prop).length > 5, 'there is still a crowd out there past the goal');
  });
}

test('classic ends when you bump into someone', () => {
  const E = load(); E.setLevel(0); E.start('classic');
  for (let i = 0; i < 120; i++) E.tick(DT);
  const p = E.S.people.find(q => !q.prop); p.x = E.S.px; p.z = E.S.pz + 0.2; p.vx = p.vz = 0;
  for (let i = 0; i < 5; i++) E.tick(DT);
  assert.strictEqual(E.state, 'over');
});

test('week keys look like 2026-W45 and change on Monday', () => {
  const E = load();
  assert.match(E.weekKey(new Date(2026, 10, 5)), /^\d{4}-W\d{2}$/);
  assert.strictEqual(E.weekKey(new Date(2026, 10, 2)), E.weekKey(new Date(2026, 10, 8)), 'Monday to Sunday is one week');
  assert.notStrictEqual(E.weekKey(new Date(2026, 10, 8)), E.weekKey(new Date(2026, 10, 9)), 'the next Monday is a new week');
  assert.strictEqual(E.weekKey(new Date(2026, 0, 1)), '2026-W01');
});

for (const mode of ['daily', 'weekly']) {
  test(`${mode} run: endless, and only one try per ${mode === 'daily' ? 'day' : 'week'}`, () => {
    const E = load(); E.setLevel(1);
    assert.strictEqual(E.hasPlayed(mode), false);
    E.start(mode);
    assert.strictEqual(E.state, 'play');
    assert.strictEqual(E.S.endless, true);
    assert.strictEqual(E.hasPlayed(mode), true, 'starting uses up the try');
    // bump to end the run, then try again
    for (let i = 0; i < 90; i++) E.tick(DT);
    const p = E.S.people.find(q => !q.prop); p.x = E.S.px; p.z = E.S.pz + 0.2; p.vx = p.vz = 0;
    for (let i = 0; i < 5; i++) E.tick(DT);
    assert.strictEqual(E.state, 'over');
    E.start(mode);
    assert.strictEqual(E.state, 'over', 'a second try is refused');
    E.start('classic');
    assert.strictEqual(E.state, 'play', 'classic is still open');
  });
}

test('daily and weekly are tracked separately', () => {
  const E = load(); E.setLevel(0);
  E.start('daily'); assert.strictEqual(E.hasPlayed('weekly'), false);
  E.start('weekly'); assert.strictEqual(E.hasPlayed('weekly'), true);
});

test('everyone on the same daily run meets the same crowd, whatever pace they take', () => {
  const run = steer => {
    const E = load(); E.setLevel(1); E.start('daily');
    for (let i = 0; i < 30 * 70; i++) {
      if (steer) { E.keys.r = (i % 150) < 60; E.keys.l = (i % 150) >= 75 && (i % 150) < 135; E.keys.last = E.keys.r ? 'r' : 'l'; if (i % 200 === 40) E.action('M'); }
      clearNear(E); E.tick(DT); if (E.state !== 'play') break;
    }
    return { sums: E.S.chunkSum, z: E.S.pz };
  };
  const a = run(false), b = run(true);
  const common = Object.keys(a.sums).filter(k => k in b.sums);
  assert.ok(common.length > 20, 'enough chunks to compare: ' + common.length);
  assert.ok(b.z !== a.z, 'the two runs really did go at different paces');
  for (const k of common) assert.strictEqual(a.sums[k], b.sums[k], 'chunk at ' + k + ' m differs');
});
