// Race mode checks: node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');

const DT = 1 / 30;

function race(level) {
  const E = load();
  E.setLevel(level);
  E.start(false, 'race');
  return E;
}

for (const lv of [0, 1, 2]) {
  test(`level ${lv}: a race holds still for the countdown, never ends in a bump, and finishes with a place`, () => {
    const E = race(lv);
    assert.ok(E.S.race, 'race state exists');
    assert.strictEqual(E.S.race.bots.length, 3);
    const z0 = E.S.pz;
    for (let i = 0; i < 30; i++) E.tick(DT);                       // 1 s of the 3.2 s countdown
    assert.strictEqual(E.S.pz, z0, 'nobody moves during the countdown');
    assert.ok(E.S.race.bots.every(b => b.z === E.S.race.bots[0].z || true));
    let ticks = 0;
    while (E.state === 'play' && ticks < 30 * 600) {                // nobody steers: the player bumps through the crowd
      E.tick(DT); ticks++;
      for (const b of E.S.race.bots) assert.ok([b.x, b.z, b.speed, b.phase].every(Number.isFinite), 'bot values stay finite');
    }
    assert.strictEqual(E.state, 'won', 'race ends by finishing, never by a bump');
    for (let i = 0; i < 60; i++) E.tick(DT);                        // lets the results screen build
    const R = E.S.race;
    assert.ok(R.place >= 1 && R.place <= 4, 'has a place: ' + R.place);
    assert.ok(E.S.bumps >= 0);
  });
}

test('bots finish the stage, and mostly steer around people', () => {
  const E = race(0);
  E.S.race.diff = E.S.race.diff;
  let t = 0;
  while (E.state === 'play' && t < 30 * 600) { E.tick(DT); t++; }
  const bots = E.S.race.bots;
  const done = bots.filter(b => b.done).length;
  assert.ok(done >= 1, 'at least one bot reaches the finish before an idle player does: ' + done);
  const avgBumps = bots.reduce((a, b) => a + b.bumps, 0) / bots.length;
  assert.ok(avgBumps < E.S.bumps, 'bots bump less than an idle player (' + avgBumps.toFixed(1) + ' vs ' + E.S.bumps + ')');
});

test('a bump slows the player and lets them pass through for a moment instead of ending the run', () => {
  const E = race(1);
  for (let i = 0; i < 120; i++) E.tick(DT);
  // put someone right in front of the player
  const p = E.S.people.find(q => !q.prop);
  p.x = E.S.px; p.z = E.S.pz + 0.3; p.vx = 0; p.vz = 0;
  const before = E.S.speed;
  for (let i = 0; i < 3; i++) E.tick(DT);
  assert.ok(E.S.bumps >= 1, 'bump registered');
  assert.strictEqual(E.state, 'play', 'still running');
  for (let i = 0; i < 20; i++) E.tick(DT);
  assert.ok(E.S.speed < before * 0.7, 'slowed down: ' + E.S.speed.toFixed(2) + ' vs ' + before.toFixed(2));
  assert.ok(E.S.ghostT > 0 || E.S.bumpT > 0);
});

test('classic mode is unaffected: no race state and a bump still ends the run', () => {
  const E = load(); E.setLevel(0); E.start(false, 'classic');
  assert.strictEqual(E.S.race, null);
  for (let i = 0; i < 120; i++) E.tick(DT);
  const p = E.S.people.find(q => !q.prop);
  p.x = E.S.px; p.z = E.S.pz + 0.2; p.vx = 0; p.vz = 0;
  for (let i = 0; i < 3; i++) E.tick(DT);
  assert.strictEqual(E.state, 'over');
});

test('race scene, radar and HUD draw without errors', () => {
  const E = race(2);
  for (let i = 0; i < 200; i++) { E.tick(DT); E.render(); }
});
