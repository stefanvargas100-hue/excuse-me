// Batch 27e (independent review): gaps the builder's tests leave open. Tests only; no source changed.  node --test
// A racer bumps a steady walker (a Tsukiji porter, a Skytree lift passenger) in three ways: walking into its back, into its side, and
// standing in its way. The builder's tests only meet porters by chance in bot races and never put a racer on the Skytree deck.
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness.js');
const SKYTREE = 8, TSUKIJI = 7;
const WAYS = ['behind', 'side', 'ahead'];

test('a racer who bumps a lift passenger mid-deck does not change its pace or its line, and it still stops at the glass', () => {
  let bumped = 0;
  for (const seed of [3, 7, 11]) for (const way of WAYS) {
    const E = load(undefined, { seed }); E.setLevel(SKYTREE); E.start('race'); E.S.race.countT = 0; E.S.race.bots = []; E.S.people = [];
    E.runEvent('lift');
    const p = E.S.people.filter(q => q.lift).sort((a, b) => a.z - b.z)[0], z0 = p.z, half = E.LV.half;
    for (let i = 0; i < 60 * 60 && p.x < 0; i++) { E.S.pz = 0; E.S.me.z = 0; E.tick(1 / 60); }   // let it walk out to mid-deck
    assert.ok(p.x >= 0 && p.x < 1.5, 'mid-deck: ' + p.x);
    E.S.ghostT = 0;
    if (way === 'behind') { E.S.px = p.x - 0.45; E.S.pz = z0; }       // it walks into the player's chest
    else if (way === 'side') { E.S.px = p.x + 0.1; E.S.pz = z0 - 0.5; }   // the player walks into its side
    else { E.S.px = p.x + 0.45; E.S.pz = z0; }                        // the player stands in its way
    let hit = false;
    for (let i = 0; i < 60 * 2; i++) {
      E.S.me.z = E.S.pz; E.S.speed = way === 'side' ? 2.5 : 0; E.S.vx = 0;
      E.tick(1 / 60); hit = hit || p.hit;
      assert.equal(p.vx, 1.25, way + ': pace unchanged'); assert.equal(p.z, z0, way + ': line unchanged');
    }
    if (hit) bumped++;
    for (let i = 0; i < 60 * 30 && p.vx !== 0; i++) { E.S.pz = 0; E.S.me.z = 0; E.S.px = 0; E.tick(1 / 60); }
    assert.ok(Math.abs(p.x - (half - 0.35)) < 0.02, 'at the glass: ' + p.x.toFixed(3)); assert.equal(p.vx, 0);
  }
  assert.ok(bumped >= 6, 'the racer really did bump the passenger: ' + bumped + ' of 9');
});

test('a racer who bumps a porter from behind, the side or the front does not change its pace or its line', () => {
  let bumped = 0;
  for (const seed of [2, 5]) for (const way of WAYS) {
    const E = load(undefined, { seed }); E.setLevel(TSUKIJI); E.start('race'); E.S.race.countT = 0; E.S.race.bots = []; E.S.people = [];
    for (let z = 14; z < 200; z += 4) E.genChunk(z);
    const p = E.S.people.find(q => q.porter), x0 = p.x, s = p.x > 0 ? -1 : 1;
    E.S.people = [p]; E.S.ghostT = 0;
    if (way === 'behind') { E.S.px = p.x; E.S.pz = p.z - 0.5; }
    else if (way === 'side') { E.S.px = p.x + s * 0.9; E.S.pz = p.z + 0.9; }
    else { E.S.px = p.x; E.S.pz = p.z + 2.3; }
    let hit = false;
    for (let i = 0; i < 60 * 4; i++) {
      E.S.me.z = E.S.pz; E.S.speed = way === 'behind' ? 2.5 : way === 'side' ? 1.5 : 0; E.S.vx = way === 'side' ? -s * 1.2 : 0;
      E.tick(1 / 60); hit = hit || p.hit;
      assert.equal(p.vx, 0, way + ': pushed sideways'); assert.equal(p.x, x0); assert.equal(p.vz, 1.0);
    }
    if (hit) bumped++;
  }
  assert.ok(bumped >= 5, 'the racer really did bump the porter: ' + bumped + ' of 6');
});

// Check 5: the builder's with-and-without test compares only where everyone stands at the end. This one also compares the score,
// the clock, the energy, the bump count, the standings, the pick-ups and the banner, at every second, and checks the boards really
// were flipped (the timer was live and the board was drawn) during the run it compares.
test('the gate-change boards leave every number in the run alone, second by second', () => {
  const GATE = 11;
  const run = keep => {
    const E = load(undefined, { seed: 6 }); E.setLevel(GATE); E.start('race'); E.S.race.countT = 0;
    const rows = []; let live = 0;
    for (let i = 0; i < 60 * 40; i++) {
      if (i === 600) E.runEvent('gatechange');
      if (!keep) delete E.S.boardFlipUntil;
      E.tick(1 / 60); if (i % 20 === 0) E.render();
      if (E.S.boardFlipUntil > E.S.time) live++;
      if (i % 60 === 0) rows.push(JSON.stringify([E.S.time, E.S.score, E.S.energy, E.S.bumps, E.S.chain, E.S.px, E.S.pz, E.S.speed, E.S.banner && E.S.banner.text, E.S.race.place, E.S.race.bots.map(b => [b.x, b.z, b.speed]), (E.S.race.pickups || []).map(p => [p.x, p.z, p.got]), E.S.people.length]));
    }
    return { rows, live };
  };
  const a = run(true), b = run(false);
  assert.ok(a.live > 60, 'the board timer was live for ' + a.live + ' ticks');
  assert.deepEqual(a.rows, b.rows);
});
