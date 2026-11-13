// Batch 23: Baggage Claim (stage 10). Bags and trolleys spill across the walkway from the carousel side, with a gap. node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { load } = require('./harness.js');
const ENTRY = path.resolve(__dirname, '../game/rounds/round-02/batch-23-evidence/lane-entry.js');
const BAG = 10;
const game = (seed, mode = 'classic') => { const E = load(ENTRY, { seed }); E.setLevel(BAG); E.start(mode); if (mode === 'race') E.S.race.countT = 0; return E; };

test('a bag spill is announced, starts beyond SPAWN_FAR, keeps its items 4.6 m apart and uses the carousel side', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const E = game(seed); E.S.people = [];
    E.runEvent('bagspill');
    assert.equal(E.S.banner.text, 'BAGS SPILLING ACROSS THE WALKWAY');
    const items = E.S.people.filter(p => p.drive).sort((a, b) => a.z - b.z);
    assert.ok(items.length >= 5 && items.length <= 6);
    assert.ok(items[0].z - E.S.pz >= 66, 'spawns beyond SPAWN_FAR');
    for (let i = 1; i < items.length; i++) assert.ok(items[i].z - items[i - 1].z >= 4.6 - 1e-9, 'a gap between items');
    for (const p of items) { assert.ok(p.x < -E.LV.half, 'starts at the carousel side'); assert.ok(p.drive > 0 && p.quiet); assert.ok(p.circles.length >= 1); }
  }
});

test('items cross the walkway and clear it, and at every moment a wide gap stays open across the whole burst', () => {
  for (const seed of [8, 9, 10]) {
    const E = game(seed, 'race'); E.S.people = []; E.S.race.bots = [];
    E.runEvent('bagspill');
    const items = E.S.people.filter(p => p.drive), zLast = Math.max(...items.map(p => p.z)), live = p => !p.dead && E.S.people.includes(p);
    let widest = 0, moving = 0;
    for (let i = 0; i < 60 * 40 && items.some(live); i++) {
      E.S.pz = zLast - 10; E.S.me.z = E.S.pz; E.S.ghostT = 9;   // everything has been triggered; this player passes through, we only watch the burst
      E.tick(1 / 60);
      // project every circle of every live item onto the walkway: the largest free stretch is the gap
      const spans = [];
      for (const p of items) if (live(p)) for (const c of p.circles) spans.push([Math.max(-E.LV.half, p.x + c.ox - c.r), Math.min(E.LV.half, p.x + c.ox + c.r)]);
      spans.sort((u, v) => u[0] - v[0]);
      let at = -E.LV.half, gap = 0;
      for (const [lo, hi] of spans) { if (hi <= lo) continue; gap = Math.max(gap, lo - at); at = Math.max(at, hi); }
      gap = Math.max(gap, E.LV.half - at); widest = Math.max(widest, spans.length);
      if (spans.length) moving++;
      assert.ok(gap >= 2.4, 'free gap ' + gap.toFixed(2) + ' m with ' + spans.length + ' circles on the walkway');
    }
    assert.ok(!items.some(live), 'every item crossed and left');
    assert.ok(moving > 60 && widest >= 2, 'the burst was really on the walkway');
  }
});

test('the spill depends on nothing about the racers', () => {
  const snaps = [];
  for (const px of [-4, 4]) { const E = game(9); E.S.people = []; E.S.px = px; E.runEvent('bagspill'); snaps.push(JSON.stringify(E.S.people.map(p => [p.x, p.z, p.drive, p.prop]))); }
  assert.equal(snaps[0], snaps[1]);
});

test('moving items collide like people: a racer standing in the way is bumped', () => {
  const E = game(3, 'race'); E.S.people = []; E.S.race.bots = [];
  const item = E.mk(-2, 20, { prop: 'bagslide', circles: [{ ox: 0, oz: 0, r: 0.38 }], drive: 3, driveAt: 99, len: 0.4, quiet: true });
  E.S.px = 0; let bumped = false;
  for (let i = 0; i < 180 && !bumped; i++) { E.S.pz = 19.9; E.S.me.z = 19.9; E.S.speed = 0; E.tick(1 / 60); bumped = E.S.bumps > 0; }
  assert.ok(item.driving && bumped, 'bumped by a moving bag');
});

test('baggage rendering at several positions, with the burst on screen', () => {
  const E = game(2); E.S.people = [];
  E.runEvent('bagspill'); const z = E.S.people.find(p => p.drive).z;
  for (const pz of [0, 80, z - 20, z - 8, E.LV.goal - 5]) { E.S.pz = pz; E.S.me.z = pz; for (const p of E.S.people) if (p.drive) p.driving = true; E.tick(1 / 60); E.render(); }
});

test('seven Medium bots finish Baggage Claim within 600 simulated seconds on 3 fixed seeds, and the bags are crossed', () => {
  for (const seed of [1, 2, 3]) {
    const E = load(ENTRY, { seed }); E.storage.excuseme_botlvl = '1'; E.setLevel(BAG);
    E.start('race', undefined, { cup: { model: { bots: [] } } }); E.S.cup = null;
    assert.equal(E.S.race.bots.length, 7);
    for (let i = 0; i < 600 * 30 && !E.S.race.bots.every(b => b.done); i++) {
      E.S.pz = Math.max(0, Math.min(...E.S.race.bots.filter(b => !b.done).map(b => b.z)) - 20); E.tick(1 / 30);
      for (const b of E.S.race.bots) assert.ok(Math.abs(b.x) <= E.LV.half - 0.4 + 1e-6);
    }
    assert.ok(E.S.race.bots.every(b => b.done), 'seed ' + seed);
  }
});

test('bots at every difficulty finish Baggage Claim; Classic and Race play through it', () => {
  const medians = [];
  for (const diff of [0, 1, 2]) {
    const times = [];
    for (const seed of [1, 2]) {
      const E = load(ENTRY, { seed }); E.storage.excuseme_botlvl = String(diff); E.setLevel(BAG);
      E.start('race', undefined, { cup: { model: { bots: [] } } }); E.S.cup = null; E.S.race.countT = 0;
      for (let i = 0; i < 36000 && !E.S.race.bots.every(b => b.done); i++) { E.S.pz = Math.max(0, Math.min(...E.S.race.bots.filter(b => !b.done).map(b => b.z)) - 20); E.tick(1 / 60); }
      assert.ok(E.S.race.bots.every(b => b.done)); times.push(...E.S.race.bots.map(b => b.finishT));
    }
    times.sort((a, b) => a - b); medians.push(+times[Math.floor(times.length / 2)].toFixed(1));
  }
  console.log(JSON.stringify({ stage: 'baggage', medianEasyMediumHard: medians }));
  const C = game(4); C.S.pz = C.LV.goal; C.S.me.z = C.S.pz; C.S.people = []; C.tick(1 / 60); assert.ok(C.S.endless);
  const E = game(4, 'race'); E.S.race.bots = [];
  for (let i = 0; i < 15000 && !E.S.race.finished; i++) { E.S.people = []; E.tick(1 / 60); }
  assert.ok(E.S.race.finished);
});
