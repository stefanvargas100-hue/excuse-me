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

test('quitting from the pause menu keeps your best score and distance', () => {
  const E = load(); E.setLevel(0); E.start('classic');
  for (let i = 0; i < 150; i++) { clearNear(E); E.tick(DT); }
  const sc = Math.floor(E.S.score), z = Math.floor(E.S.pz);
  assert.ok(sc > 0);
  E.pauseGame(); E.quitRun(); E.toMenu();
  assert.ok(E.tallyOf('bestScore') >= sc, 'score kept');
  assert.ok(E.tallyOf('far_airport') >= z - 1, 'distance kept');
  assert.strictEqual(E.storage['excuseme_best_airport:cm2'], String(sc));
});

test('quitting a daily run saves its score and the try stays used', () => {
  const E = load(); E.setLevel(0); E.start('daily');
  for (let i = 0; i < 90; i++) { clearNear(E); E.tick(DT); }
  E.pauseGame(); E.quitRun(); E.toMenu();
  assert.strictEqual(E.hasPlayed('daily'), true);
  assert.strictEqual(E.tallyOf('dailyRuns'), 1);
});

function aheadOf(E, dz, dx) { E.S.people.length = 0; E.S.nextChunk = 1e9; return E.mkPerson(E.S.px + (dx || 0), E.S.pz + dz); }
const going = () => { const E = load(); E.setLevel(0); E.start('classic'); for (let i = 0; i < 30; i++) { E.S.people.length = 0; E.tick(DT); } return E; };

test('a near miss refills stamina, a razor more than a close call', () => {
  const pass = gap => { const E = going(); E.S.energy = 50; const p = aheadOf(E, 0.3, 0.5 + gap); p.vz = 0; p.v0 = 0; for (let i = 0; i < 6; i++) { p.x = E.S.px + 0.5 + gap; p.vx = 0; E.tick(DT); } return E.S.energy; };
  const razor = pass(0.05), close = pass(0.3), wide = pass(1.0);
  assert.ok(razor > close && close > wide, [razor, close, wide].map(v => v.toFixed(1)).join(' '));
});

test('a last-moment dash is free and fast; an early one costs stamina as usual', () => {
  const E = going(); E.S.energy = 5; aheadOf(E, 1.0, 0); const before = E.S.energy;
  E.action('R');
  assert.ok(E.S.perfectT > 0, 'perfect'); assert.strictEqual(E.S.energy, before, 'free, even when too tired for a normal dash');
  assert.strictEqual(E.tallyOf('perfectDashes'), 1);
  const F = going(); F.S.energy = 60; aheadOf(F, 8, 0);
  F.action('R');
  assert.strictEqual(F.S.perfectT, 0); assert.strictEqual(F.S.energy, 40);
});

test('a well-timed Excuse me moves more people and recharges sooner', () => {
  const row = first => { const E = going(); E.S.people.length = 0; E.S.nextChunk = 1e9; const ps = []; for (let i = 0; i < 7; i++) ps.push(E.mkPerson(E.S.px, E.S.pz + first + i * 0.9)); E.shout(); return { moved: ps.filter(p => p.aside > 0).length, cd: E.S.shoutCD, n: E.tallyOf('perfectShouts') }; };
  const timed = row(1.5), early = row(3.5);
  assert.strictEqual(timed.n, 1); assert.strictEqual(early.n, 0);
  assert.ok(timed.moved > early.moved, timed.moved + ' vs ' + early.moved);
  assert.ok(timed.cd < early.cd);
});

for (const lv of [0, 1, 2]) for (const kind of ['parade', 'queue']) {
  test('stage ' + lv + ': a ' + kind + ' always leaves a way through', () => {
    for (let k = 0; k < 8; k++) {
      const E = load(); E.setLevel(lv); E.start('classic'); E.tick(DT);
      E.S.people.length = 0;
      E.runEvent(kind);
      const near = E.S.people.filter(p => !p.prop), lim = E.LEVELS[lv].half - 0.5, xs = near.map(p => p.x).concat([-lim, lim]).sort((a, b) => a - b);
      assert.ok(xs.length > 4, 'a real line of people');
      let gap = 0; for (let i = 1; i < xs.length; i++) gap = Math.max(gap, xs[i] - xs[i - 1]);
      assert.ok(gap >= 1.2, 'gap wide enough to walk through: ' + gap.toFixed(2));
      for (let i = 0; i < 60; i++) { E.tick(DT); E.render(); }
      assert.ok(E.S.people.every(p => Number.isFinite(p.x) && Number.isFinite(p.z)));
    }
  });
}

test('ghost: your best classic run comes back as a see-through runner', () => {
  const E = load(); E.setLevel(0); E.start('classic');
  assert.strictEqual(E.S.ghost, null, 'no ghost before a first run');
  for (let i = 0; i < 300; i++) { clearNear(E); E.tick(DT); }
  const z = E.S.pz;
  E.pauseGame(); E.quitRun(); E.toMenu();
  E.start('classic');
  assert.ok(E.S.ghost, 'ghost is back');
  for (let i = 0; i < 150; i++) { clearNear(E); E.tick(DT); }
  assert.ok(E.S.ghost.z > 5 && E.S.ghost.z < z, 'moving along the old run: ' + E.S.ghost.z.toFixed(1));
  E.render();
  const before = E.S.ghost.z; E.start('daily');
  assert.strictEqual(E.S.ghost, null, 'no ghost in a daily run');
  assert.ok(before > 0);
});

