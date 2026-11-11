// B4: route choices (barrier line with a tight direct opening and a wide detour), on every stage. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');
const DT = 1 / 30;
const STAGES = [[0, 'airport'], [1, 'nyc'], [2, 'shibuya'], [4, 'bridge']];

const raceAt = (stage = 0, seed = 4) => { const E = load(undefined, { seed }); E.setLevel(stage); E.start('race'); return E; };
const ropes = E => E.S.people.filter(p => p.prop === 'rope');
const build = (E, z) => { while (E.S.nextChunk < z + 12) { E.genChunk(E.S.nextChunk); E.S.nextChunk += 4; } };

test('route data: both openings are wide enough, the street is never closed, the detour alternates sides', () => {
  const E = raceAt();
  for (const [, id] of STAGES) {
    const zones = E.routeZones(id); assert.ok(zones.length >= 2, id);
    for (const z of zones) {
      const op = E.routeOpenings(id, z);
      assert.strictEqual(op.length, 2);
      const widths = op.map(([a, b]) => b - a).sort((a, b) => a - b);
      assert.ok(widths[0] >= 1.0, id + ' direct opening ' + widths[0]); assert.ok(widths[1] >= 1.4, id + ' detour opening ' + widths[1]);
      assert.ok(op[0][1] <= op[1][0], id + ' openings do not overlap');
    }
    assert.ok(new Set(zones.map(z => z.side)).size === 2, id + ' detour alternates sides');
  }
});

test('zones keep clear of the stage\'s own features: walkway glass, crossings, fast strips', () => {
  const E = raceAt();
  for (const z of E.routeZones('airport')) for (const dz of [-8, 0]) assert.strictEqual(E.beltAt('airport', 3, z.z + dz) + E.beltAt('airport', 3, z.z + dz - 0.1), 0, 'belt near airport ' + z.z);
  for (const z of E.routeZones('nyc')) {
    for (let d = -6; d <= 1; d += 1) assert.ok(!E.onStrip('nyc', -3.5, z.z + d), 'nyc strip at ' + (z.z + d));
    const cross = Math.round((z.z - 90) / 90) * 90 + 90; assert.ok(z.z - cross > 16 || cross - z.z > 4, 'nyc crossing at ' + cross + ' vs zone ' + z.z);
  }
  for (const z of E.routeZones('shibuya')) for (let d = -6; d <= 1; d += 1) assert.ok(!E.onStrip('shibuya', 0, z.z + d), 'shibuya strip at ' + (z.z + d));
});

test('barriers and queues appear in bot races only, never in Classic or Daily', () => {
  for (const [lv, id] of STAGES) {
    const z = E0(id);
    const E = raceAt(lv); build(E, z + 10);
    assert.ok(ropes(E).length >= 3, id + ' barriers in a race: ' + ropes(E).length);
    const C = load(undefined, { seed: 4 }); C.setLevel(lv); C.start('classic'); while (C.S.nextChunk < z + 20) { C.genChunk(C.S.nextChunk); C.S.nextChunk += 4; }
    assert.strictEqual(ropes(C).length, 0, id + ' classic');
  }
  function E0(id) { return raceAt().routeZones(id)[0].z; }
});

test('the barrier line is solid; the direct opening and the detour are passable on every stage', () => {
  for (const [lv, id] of STAGES) {
    const E0 = raceAt(lv), zone = E0.routeZones(id)[0], cfg = E0.routeCfg(id);
    const tryX = x => {
      const E = raceAt(lv); build(E, zone.z + 20); E.S.race.countT = 0;
      E.S.people = E.S.people.filter(p => p.prop === 'rope');   // nothing else in the way: only the geometry is under test
      E.S.px = x; E.S.pz = zone.z - 14; E.S.speed = 3;
      for (let i = 0; i < 240; i++) { E.S.px = x; E.S.vx = 0; E.tick(DT); E.S.people = E.S.people.filter(p => p.prop === 'rope'); }
      return { pz: E.S.pz, bumps: E.S.bumps };
    };
    const solid = -zone.side * (cfg.half - 0.6);   // on the side away from the detour, well inside the barrier
    assert.ok(tryX(solid).bumps >= 1, id + ': the barrier stops you at x=' + solid);
    for (const x of [0, zone.side * cfg.detourX]) { const r = tryX(x); assert.ok(r.pz > zone.z + 5 && r.bumps === 0, id + ' opening at x=' + x + ' passes cleanly: ' + JSON.stringify(r)); }
  }
});

test('bots get through every zone, with its queue, on several seeds', () => {
  for (const [lv, id] of STAGES) for (const seed of [1, 2, 3]) {
    const E = raceAt(lv, seed), zone = E.routeZones(id)[0]; build(E, zone.z + 25); E.S.race.countT = 0;
    E.S.race.bots.forEach((b, i) => { b.z = zone.z - 16 + i * 0.4; b.x = (i - 1) * 1.4; });
    E.S.pz = zone.z - 30; E.S.px = 0;
    for (let i = 0; i < 1000; i++) { E.S.px = E.S.race.bots[0].x; E.S.pz = Math.max(E.S.pz, zone.z - 30); E.tick(DT); E.S.race.bots.forEach(b => { b.ghostT = 0; }); }
    for (const b of E.S.race.bots) assert.ok(b.z > zone.z + 6, id + ' seed ' + seed + ' bot ' + b.name + ' stuck at ' + b.z.toFixed(1) + ' (zone ' + zone.z + ')');
  }
});

test('the same seed and inputs give the same result whether or not the scene is drawn', () => {
  for (const [lv, id] of STAGES) {
    const run = draw => {
      const E = raceAt(lv, 6), zone = E.routeZones(id)[0]; build(E, zone.z + 20); E.S.race.countT = 0; E.S.pz = zone.z - 14; E.S.px = 0;
      for (let i = 0; i < 300; i++) { if (i % 20 === 0) E.S.px = ((i / 20) % 3 - 1) * 1.0; E.tick(DT); if (draw) E.render(DT); }
      return JSON.stringify([E.S.px.toFixed(3), E.S.pz.toFixed(3), E.S.bumps, E.S.race.bots.map(b => b.z.toFixed(2))]);
    };
    assert.strictEqual(run(false), run(true), id);
  }
});

test('every barrier draws without errors, near and far', () => {
  for (const [lv, id] of STAGES) {
    const E = raceAt(lv), zone = E.routeZones(id)[0]; build(E, zone.z + 20); E.S.race.countT = 0;
    for (const d of [-40, -9, -3, 6]) { E.S.pz = zone.z + d; E.S.px = 0; E.tick(DT); E.render(DT); }
  }
});

test('a stage with routes keeps its race records and ghosts under a versioned key', () => {
  for (const [lv, id] of STAGES) {
    const E = raceAt(lv); E.storage['excuseme_race_best_' + id] = '55.00';
    E.S.race.countT = 0; E.S.people.length = 0;
    E.S.pz = E.LV.goal + 1; for (let i = 0; i < 90; i++) E.tick(DT);
    assert.strictEqual(E.storage['excuseme_race_best_' + id], '55.00', id + ': the old record is preserved, not overwritten');
    assert.ok(E.storage['excuseme_race_best_' + id + ':rt1:standard:r2'], id + ': a new record lives under the versioned key');
  }
});

