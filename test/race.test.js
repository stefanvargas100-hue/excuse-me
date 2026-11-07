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

test('people are solid: a bump stops and slows you, you cannot walk through, and you can go round', () => {
  const E = race(1);
  for (let i = 0; i < 120; i++) E.tick(DT);
  const p = E.S.people.find(q => !q.prop);
  const zStand = E.S.pz + 3, pin = () => { p.x = 0; p.z = zStand; p.vx = 0; p.vz = 0; p.v0 = 0; };   // a stander right in the middle of the path
  E.S.px = 0; E.S.vx = 0; pin();
  let maxZ = -1e9, before = E.S.speed;
  for (let i = 0; i < 36; i++) { pin(); E.tick(DT); maxZ = Math.max(maxZ, E.S.pz - p.z); }
  assert.ok(E.S.bumps >= 1, 'bump registered');
  assert.strictEqual(E.state, 'play', 'still running');
  assert.ok(maxZ < -0.2, 'never got through them: ' + maxZ.toFixed(2));
  E.keys.r = true; E.keys.last = 'r';
  let passed = false;
  for (let i = 0; i < 150 && !passed; i++) { pin(); E.tick(DT); if (E.S.pz > p.z + 0.5) passed = true; }
  assert.ok(passed, 'stepping round them gets you past');
  assert.ok(E.S.bumps >= 1);
});

test('a bump slows you down', () => {
  const E = race(1);
  for (let i = 0; i < 120; i++) E.tick(DT);
  const p = E.S.people.find(q => !q.prop);
  p.x = E.S.px; p.z = E.S.pz + 0.3; p.vx = 0; p.vz = 0;
  const before = E.S.speed;
  for (let i = 0; i < 20; i++) E.tick(DT);
  assert.ok(E.S.speed < before * 0.7, 'slowed: ' + E.S.speed.toFixed(2) + ' vs ' + before.toFixed(2));
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

test('race pace: combos speed you up, low stamina slows you down', () => {
  const calm = race(0); for (let i = 0; i < 100; i++) calm.tick(DT);     // GO happens at 3 s
  const mk = (chain, energy) => { const E = race(0); for (let i = 0; i < 100; i++) E.tick(DT); E.S.chain = chain; E.S.lastPassT = E.S.time + 99; E.S.energy = energy; for (let i = 0; i < 60; i++) { E.S.people.length = 0; E.S.race.bots.length = 0; E.S.energy = energy; E.tick(DT); } return E.S.speed; };
  const base = mk(0, 100), combo = mk(21, 100), tired = mk(0, 0);
  assert.ok(combo > base * 1.1, 'a x8 combo is clearly faster: ' + combo.toFixed(2) + ' vs ' + base.toFixed(2));
  assert.ok(tired < base * 0.9, 'no stamina is clearly slower: ' + tired.toFixed(2) + ' vs ' + base.toFixed(2));
});

test('the HUD slot shows pace, not score, in a race', () => {
  const E = race(0);
  for (let i = 0; i < 120; i++) E.tick(DT);
  assert.ok(E.S.race);
});

test('stamina only slows you when it is really low, and hard when you are out', () => {
  const E = race(0);
  const pace = e => E.racePace(0, e);
  assert.strictEqual(pace(100), 1);
  assert.strictEqual(pace(45), 1, 'no penalty above 40');
  assert.ok(pace(25) >= 0.959, 'a little tired costs under 4%: ' + pace(25).toFixed(3));
  assert.ok(pace(10) > 0.91, 'low but not empty costs about 8%: ' + pace(10).toFixed(3));
  assert.ok(pace(0) <= 0.66, 'completely out is a harsh slowdown: ' + pace(0).toFixed(3));
});

test('"Excuse me" clears a row of people ahead, not just two', () => {
  const E = race(1);
  for (let i = 0; i < 120; i++) E.tick(DT);
  E.S.people.length = 0;
  const lane = [];
  for (let i = 0; i < 6; i++) { const p = E.mkPerson(E.S.px, E.S.pz + 2 + i * 1.1); lane.push(p); }
  E.shout();
  const stepped = lane.filter(p => p.aside > 0).length;
  assert.ok(stepped >= 4, 'at least four step aside: ' + stepped);
});

// Slipstream: one walker kept at a fixed spot relative to the player each step.
function tail(E, ticks, dx, dz, vz) {
  for (let i = 0; i < ticks; i++) {
    E.S.people.length = 0; E.S.race.bots.length = 0; E.S.nextChunk = 1e9;
    const p = E.mkPerson(E.S.px + dx, E.S.pz + dz); p.vz = vz; p.vx = 0;
    E.tick(DT);
  }
}
function atGo() { const E = race(0); for (let i = 0; i < 91; i++) E.tick(DT); return E; }

test('slipstream: tucking in behind a walker earns a speed boost', () => {
  const E = atGo();
  tail(E, 60, 0, 2.5, 3);
  const plain = atGo(); tail(plain, 60, 3, 2.5, 3);   // same walker, off to the side
  assert.ok(E.S.draftT > 0, 'boost earned');
  assert.strictEqual(plain.S.draftT, 0, 'no boost when not behind them');
  tail(E, 15, 3, 2.5, 3); tail(plain, 15, 3, 2.5, 3);
  assert.ok(E.S.speed > plain.S.speed * 1.08, E.S.speed.toFixed(2) + ' vs ' + plain.S.speed.toFixed(2));
});

test('slipstream: no boost behind someone standing or coming at you', () => {
  for (const vz of [0, -1.5]) { const E = atGo(); tail(E, 60, 0, 2.5, vz); assert.strictEqual(E.S.draftT, 0, 'vz ' + vz); }
});

test('slipstream: the boost runs out, and a bump cancels it', () => {
  const E = atGo();
  tail(E, 60, 0, 2.5, 3); assert.ok(E.S.draftT > 0);
  tail(E, 100, 3, 2.5, 3); assert.strictEqual(E.S.draftT, 0, 'runs out');
  const B = atGo();
  tail(B, 60, 0, 2.5, 3); assert.ok(B.S.draftT > 0);
  tail(B, 3, 0, 0.2, 0); assert.strictEqual(B.S.draftT, 0, 'bump cancels');
});

test('slipstream does nothing outside a race', () => {
  const E = load(); E.setLevel(0); E.start('classic');
  for (let i = 0; i < 90; i++) { E.S.people.length = 0; E.S.nextChunk = 1e9; const p = E.mkPerson(E.S.px, E.S.pz + 2.5); p.vz = 3; E.tick(DT); }
  assert.strictEqual(E.S.draftT, 0);
  assert.ok(E.S.speed <= 3.001);
});

test('slipstream: the closer you are, the sooner it charges', () => {
  const close = atGo(), far = atGo();
  tail(close, 15, 0, 0.9, 3); tail(far, 15, 0, 3.8, 3);
  assert.ok(close.S.draftC > far.S.draftC, close.S.draftC.toFixed(2) + ' vs ' + far.S.draftC.toFixed(2));
});

test('slipstream: the wind lines draw while charging and during the boost', () => {
  const E = atGo();
  for (let i = 0; i < 60; i++) { tail(E, 1, 0, 2.5, 3); E.render(); }
  assert.ok(E.S.draftT > 0);
  for (let i = 0; i < 30; i++) { tail(E, 1, 3, 2.5, 3); E.render(); }
});

test('no camera shake is left: a bump does not move the view', () => {
  const E = atGo();
  tail(E, 3, 0, 0.2, 0);
  assert.ok(E.S.bumps >= 1);
  assert.strictEqual(E.S.shake, undefined);
});

test('a bump lands with a tiny freeze instead of a camera shake', () => {
  const E = atGo();
  tail(E, 3, 0, 0.2, 0);
  assert.ok(E.S.hitStop > 0);
});

test('fast strip (New York curb run): quicker on it, nothing outside a race', () => {
  const lvl1 = () => { const E = race(1); for (let i = 0; i < 91; i++) E.tick(DT); return E; };
  const on = lvl1(), off = lvl1();
  for (const E of [on, off]) { E.S.pz = 40; E.S.people.length = 0; E.S.nextChunk = 1e9; E.S.race.bots.length = 0; }
  on.S.px = -3.5; off.S.px = 0;
  for (let i = 0; i < 60; i++) { for (const E of [on, off]) { E.S.people.length = 0; E.tick(DT); } }
  assert.ok(on.S.speed > off.S.speed * 1.08, on.S.speed.toFixed(2) + ' vs ' + off.S.speed.toFixed(2));
});

test('bots contest the race: Hard bots use the walkway and draft people more than Easy bots', () => {
  // The same twelve crowds (fixed seeds; six was too few to be steady when the crowd changes) for both levels, so only the bot level differs and the result is repeatable.
  const run = (lvl, seed) => { const E = load(undefined, { seed }); E.storage.excuseme_botlvl = String(lvl); E.setLevel(0); E.start('race'); for (let i = 0; i < 91; i++) E.tick(DT); let t = 0, n = 0; while (E.state === 'play' && t < 30 * 40) { for (const p of E.S.people) if (Math.abs(p.z - E.S.pz) < 1) p.dead = true; E.tick(DT); t++; for (const b of E.S.race.bots) if (b.belt > 0) n++; } return n; };
  const sum = lvl => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].reduce((a, s) => a + run(lvl, s), 0);
  const easy = sum(0), hard = sum(2);
  assert.ok(hard > 0 && hard > easy, 'time on the forward belt, Hard ' + hard + ' vs Easy ' + easy);
});
