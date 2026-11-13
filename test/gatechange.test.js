// Batch 23: Gate Change Rush (stage 11). The crowd ahead turns round, rushes toward you for a few seconds, then settles; a gap stays open. node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { load } = require('./harness.js');
const ENTRY = path.resolve(__dirname, '../game/rounds/round-02/batch-23-evidence/lane-entry.js');
const GATE = 11;
const game = (seed, mode = 'classic') => { const E = load(ENTRY, { seed }); E.setLevel(GATE); E.start(mode); if (mode === 'race') E.S.race.countT = 0; return E; };
// a populated stretch of concourse ahead of the player
const crowded = (seed, mode) => { const E = game(seed, mode); E.S.people = []; for (let z = 0; z < 140; z += 4) E.genChunk(z); if (E.S.race) E.S.race.bots = []; return E; };
const walkers = E => E.S.people.filter(p => !p.prop && !p.dead && !p.rival && p.v0 > 0);

test('the gate change is announced, turns most of the crowd ahead and leaves the rest and the stretch beside the player alone', () => {
  const E = crowded(4); E.S.pz = 20; E.S.me.z = 20;
  const ahead = walkers(E).filter(p => p.z - 20 >= 14 && p.z - 20 <= 86 && !p.follow);
  const before = new Map(walkers(E).map(p => [p, p.hz]));
  E.runEvent('gatechange');
  assert.equal(E.S.banner.text, 'GATE CHANGE! THE CROWD IS TURNING');
  const turned = ahead.filter(p => p.hz === -1 && p.settleT !== undefined);
  assert.ok(ahead.length >= 10);
  assert.ok(turned.length >= ahead.length * 0.4 && turned.length < ahead.length, 'most but not all turn: ' + turned.length + '/' + ahead.length);
  for (const p of turned) assert.ok(p.v0 >= 2.2 && p.v0 <= 2.8 && p.settleT >= 2.7 && p.settleT <= 5.6, 'brisk for a few seconds');
  for (const p of walkers(E)) if (p.z - 20 < 14) assert.equal(p.hz, before.get(p), 'people close to the player do not turn');
});

test('after a few seconds the surge settles to a normal pace', () => {
  const E = crowded(6); E.S.pz = 20; E.S.me.z = 20;
  E.runEvent('gatechange'); const surged = walkers(E).filter(p => p.settleT !== undefined);
  assert.ok(surged.length);
  const pace = new Map(surged.map(p => [p, p.v0n]));
  for (let i = 0; i < 60 * 7; i++) { E.S.pz = 20; E.S.me.z = 20; E.S.ghostT = 9; E.tick(1 / 60); }
  for (const p of surged) { if (E.S.people.includes(p) && !p.dead) { assert.equal(p.settleT, undefined); assert.equal(p.v0, pace.get(p)); } }
});

test('a gap about 2.6 m wide stays clear of every person who turns, every tick of the surge', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const E = crowded(seed); E.S.pz = 20; E.S.me.z = 20;
    E.runEvent('gatechange');
    const turned = walkers(E).filter(p => p.settleT !== undefined), xs = turned.map(p => p.x);
    // the turned people leave a lane free of them: a corridor 1.7 m wide (a person is 0.5 m) around some x, for the whole surge
    const lim = E.LV.half - 0.5;
    for (let t = 0; t < 60 * 6; t++) {
      E.S.pz = 20; E.S.me.z = 20; E.S.ghostT = 9; E.tick(1 / 60);
      const live = turned.filter(p => E.S.people.includes(p) && !p.dead && p.z - 20 > 0 && p.z - 20 < 40);
      let best = 0;
      for (let c = -lim; c <= lim; c += 0.1) { const free = live.every(p => Math.abs(p.x - c) >= 0.85 + 0.25); if (free) { best = Math.max(best, 1); break; } }
      assert.equal(best, 1, 'no clear lane at tick ' + t + ' seed ' + seed);
    }
    assert.ok(xs.length > 5);
  }
});

test('the surge depends on nothing about the racers', () => {
  const snaps = [];
  for (const px of [-3, 3]) { const E = crowded(7); E.S.pz = 20; E.S.me.z = 20; E.S.px = px; E.runEvent('gatechange'); snaps.push(JSON.stringify(E.S.people.map(p => [p.x, p.z, p.hz, p.v0, p.settleT]))); }
  assert.equal(snaps[0], snaps[1]);
});

test('gate change rendering at several positions', () => {
  const E = crowded(3); E.runEvent('gatechange');
  for (const z of [0, 40, 120, 300, 590]) { E.S.pz = z; E.S.me.z = z; E.tick(1 / 60); E.render(); }
});

test('seven Medium bots finish Gate Change Rush within 600 simulated seconds on 3 fixed seeds', () => {
  for (const seed of [1, 2, 3]) {
    const E = load(ENTRY, { seed }); E.storage.excuseme_botlvl = '1'; E.setLevel(GATE);
    E.start('race', undefined, { cup: { model: { bots: [] } } }); E.S.cup = null;
    assert.equal(E.S.race.bots.length, 7);
    for (let i = 0; i < 600 * 30 && !E.S.race.bots.every(b => b.done); i++) {
      E.S.pz = Math.max(0, Math.min(...E.S.race.bots.filter(b => !b.done).map(b => b.z)) - 20); E.tick(1 / 30);
      for (const b of E.S.race.bots) assert.ok(Math.abs(b.x) <= E.LV.half - 0.4 + 1e-6);
    }
    assert.ok(E.S.race.bots.every(b => b.done), 'seed ' + seed);
  }
});

test('bots at every difficulty finish Gate Change Rush; Classic and Race play through it', () => {
  const medians = [];
  for (const diff of [0, 1, 2]) {
    const times = [];
    for (const seed of [1, 2]) {
      const E = load(ENTRY, { seed }); E.storage.excuseme_botlvl = String(diff); E.setLevel(GATE);
      E.start('race', undefined, { cup: { model: { bots: [] } } }); E.S.cup = null; E.S.race.countT = 0;
      for (let i = 0; i < 36000 && !E.S.race.bots.every(b => b.done); i++) { E.S.pz = Math.max(0, Math.min(...E.S.race.bots.filter(b => !b.done).map(b => b.z)) - 20); E.tick(1 / 60); }
      assert.ok(E.S.race.bots.every(b => b.done)); times.push(...E.S.race.bots.map(b => b.finishT));
    }
    times.sort((a, b) => a - b); medians.push(+times[Math.floor(times.length / 2)].toFixed(1));
  }
  console.log(JSON.stringify({ stage: 'gatechange', medianEasyMediumHard: medians }));
  const C = game(4); C.S.pz = C.LV.goal; C.S.me.z = C.S.pz; C.S.people = []; C.tick(1 / 60); assert.ok(C.S.endless);
  const E = game(4, 'race'); E.S.race.bots = [];
  for (let i = 0; i < 20000 && !E.S.race.finished; i++) { E.S.people = []; E.tick(1 / 60); }
  assert.ok(E.S.race.finished);
});
