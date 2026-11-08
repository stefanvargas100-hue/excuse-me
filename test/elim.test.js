// B5a: elimination races against bots. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');
const DT = 1 / 30;

const ELIM = { run: { category: 'elimination' }, elim: true };
function begin(stage = 0, seed = 5) {
  const E = load(undefined, { seed }); E.setLevel(stage); E.start('race', undefined, ELIM);
  E.S.race.countT = 0; E.S.people.length = 0; E.S.nextChunk = Infinity;   // an empty street: only the elimination rules are under test
  return E;
}
// place everyone: player at z0, bots at the given offsets
const place = (E, z0, offs) => { E.S.pz = z0; E.S.me.z = z0; E.S.race.bots.forEach((b, i) => { b.z = z0 + offs[i]; b.speed = 0; }); };
const cp = (E, k) => E.S.race.elim.cps[k];

test('checkpoints: one fewer than the field, evenly spaced, inside the course', () => {
  const E = begin();
  for (const n of [2, 3, 4, 6, 8]) {
    const cps = E.elimCheckpoints(n, 500);
    assert.strictEqual(cps.length, n - 1);
    cps.forEach((c, i) => { assert.ok(c > 0 && c < 500); if (i) assert.ok(c - cps[i - 1] >= 40, 'spacing at n=' + n); });
  }
  assert.deepStrictEqual(Array.from(E.elimCheckpoints(4, 400)), [100, 200, 300]);
});

test('last place is the one with least progress; an exact tie keeps the lower start slot', () => {
  const E = begin();
  assert.strictEqual(E.elimLast([{ slot: 0, z: 90 }, { slot: 1, z: 50 }, { slot: 2, z: 70 }]).slot, 1);
  assert.strictEqual(E.elimLast([{ slot: 0, z: 50 }, { slot: 1, z: 50 }, { slot: 2, z: 70 }]).slot, 1, 'tie: slot 0 survives');
  assert.strictEqual(E.elimLast([{ slot: 3, z: 50 }, { slot: 1, z: 50 }]).slot, 3);
});

test('an elimination race starts as a normal four-racer race with three marked checkpoints', () => {
  const E = begin();
  assert.strictEqual(E.S.race.bots.length, 3); assert.strictEqual(E.S.race.elim.cps.length, 3); assert.strictEqual(E.S.race.elim.next, 0);
  assert.strictEqual(E.S.run.category, 'elimination');
});

test('the lead racer crossing a checkpoint eliminates exactly the last racer, once', () => {
  const E = begin(); const [a, b, c] = E.S.race.bots;
  place(E, cp(E, 0) - 2, [-5, -20, 1.2]);   // b is last; c leads and is about to cross
  for (let i = 0; i < 3; i++) E.tick(DT);
  assert.strictEqual(E.S.race.elim.next, 0, 'nobody has crossed yet');
  c.z = cp(E, 0) + 0.5; E.tick(DT);
  assert.strictEqual(E.S.race.elim.out.length, 1); assert.strictEqual(E.S.race.elim.out[0].name, b.name);
  assert.ok(!E.S.race.bots.includes(b), 'removed from the field');
  for (let i = 0; i < 90; i++) E.tick(DT);
  assert.strictEqual(E.S.race.elim.out.length, 1, 'never a second elimination for the same checkpoint');
});

test('crossing two checkpoints in one step still eliminates only one racer per step', () => {
  const E = begin(); place(E, 10, [0, -1, -2]);
  E.S.race.bots[0].z = cp(E, 1) + 5;   // the leader is already past two markers
  E.tick(DT); assert.strictEqual(E.S.race.elim.out.length, 1);
  E.tick(DT); assert.strictEqual(E.S.race.elim.out.length, 2);
});

test('a warning names last place before the checkpoint', () => {
  const E = begin(); place(E, cp(E, 0) - 10, [-5, -20, 1]);
  E.tick(DT);
  assert.ok(E.S.race.elim.warned >= 0 && E.S.banner && /ELIMINATION/.test(E.S.banner.text), 'banner: ' + JSON.stringify(E.S.banner));
});

test('pausing or the countdown cannot eliminate anyone', () => {
  const E = begin(); place(E, 1, [0, 0, 0]); E.S.race.bots[0].z = cp(E, 0) + 5;
  E.pauseGame(); for (let i = 0; i < 60; i++) E.tick(DT);
  assert.strictEqual(E.S.race.elim.out.length, 0);
  const F = load(undefined, { seed: 5 }); F.setLevel(0); F.start('race', undefined, ELIM);   // still counting down
  F.S.race.bots[0].z = F.S.race.elim.cps[0] + 5; F.tick(DT);
  assert.strictEqual(F.S.race.elim.out.length, 0);
});

test('an eliminated bot no longer moves, steers, collides or takes pickups', () => {
  const E = begin(); const [a, b, c] = E.S.race.bots; place(E, cp(E, 0) - 2, [-5, -20, 3]); c.z = cp(E, 0) + 0.5; E.tick(DT);
  const z = b.z; for (let i = 0; i < 120; i++) E.tick(DT); assert.strictEqual(b.z, z);
  assert.ok(!E.S.race.bots.includes(b));
});

test('being last at a checkpoint ends your race at once with the right place and a small XP award', () => {
  const E = begin(); place(E, cp(E, 0) - 20, [10, 12, 14]);   // you are far behind
  const xp0 = E.xp(), races0 = E.tallyOf('races'), wins0 = E.tallyOf('wins');
  E.S.race.bots[2].z = cp(E, 0) + 0.5; E.tick(DT);
  assert.strictEqual(E.state, 'lost'); assert.strictEqual(E.S.race.place, 4); assert.ok(E.S.race.elimOut);
  for (let i = 0; i < 90; i++) E.tick(DT);
  assert.strictEqual(E.S.xpGained, 6, 'xp ' + E.S.xpGained); assert.ok(E.xp() >= xp0 + 6);
  assert.strictEqual(E.tallyOf('races'), races0 + 1); assert.strictEqual(E.tallyOf('wins'), wins0, 'no race-win credit');
  const xp1 = E.xp(); for (let i = 0; i < 90; i++) E.tick(DT); assert.strictEqual(E.xp(), xp1, 'paid once');
});

test('surviving every checkpoint wins as soon as one racer is left', () => {
  const E = begin(); place(E, 0, [-5, -6, -7]);
  for (let k = 0; k < 3; k++) { E.S.pz = cp(E, k) + 0.5; E.S.me.z = E.S.pz; E.S.race.bots.forEach((b, i) => { b.z = Math.min(b.z, E.S.pz - 5 - i); }); E.tick(DT); }
  assert.strictEqual(E.S.race.elim.out.length, 3); assert.strictEqual(E.state, 'won'); assert.strictEqual(E.S.race.place, 1);
  for (let i = 0; i < 90; i++) E.tick(DT);
  assert.strictEqual(E.S.xpGained, 11);
  assert.strictEqual(E.S.race.board[0].me, true); assert.ok(E.S.race.board.slice(1).every(r => r.out), 'the rest show as eliminated, latest first');
});

test('no race record, ghost or "race win" credit comes from an elimination race', () => {
  const E = begin(); const keys0 = Object.keys(E.storage).join();
  place(E, 0, [-5, -6, -7]);
  for (let k = 0; k < 3; k++) { E.S.pz = cp(E, k) + 0.5; E.S.me.z = E.S.pz; E.S.race.bots.forEach((b, i) => { b.z = Math.min(b.z, E.S.pz - 5 - i); }); E.tick(DT); }
  for (let i = 0; i < 90; i++) E.tick(DT);
  const added = Object.keys(E.storage).filter(k => !keys0.includes(k));
  assert.ok(!added.some(k => /race_best|ghost/.test(k)), 'new keys: ' + added);
  assert.strictEqual(E.tallyOf('wins'), 0);
});

test('Race again keeps the format', () => {
  const E = begin(); E.restartRun(); assert.ok(E.S.race.elim); assert.strictEqual(E.S.run.category, 'elimination');
});

test('a normal bot race is unchanged: no checkpoints', () => {
  const E = load(undefined, { seed: 5 }); E.setLevel(0); E.start('race');
  assert.ok(!E.S.race.elim);
});
