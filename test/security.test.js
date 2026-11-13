// Batch 23: the Airport Cup grows to four stages. Shared checks for all three new stages live here; each stage's own challenge
// has its own file (this one, baggage.test.js, gatechange.test.js). node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');
const { load, PROTO } = require('./harness.js');
const ENTRY = path.resolve(__dirname, '../game/rounds/round-02/batch-23-evidence/lane-entry.js');
const L = seed => load(ENTRY, { seed });
const SEC = 9, BAG = 10, GATE = 11;

test('the Airport Cup has four stages, appended without moving any index', () => {
  const E = L(1);
  assert.equal(E.LEVELS.slice(0, 9).map(l => l.id).join(), 'airport,nyc,shibuya,park,bridge,subway,takeshita,tsukiji,skytree');
  assert.equal(JSON.stringify(E.LEVELS.slice(9).map(l => [l.id, l.city, l.goal, l.half])), JSON.stringify([['security', 'Airport', 450, 6], ['baggage', 'Airport', 480, 7], ['gatechange', 'Airport', 600, 6]]));
  for (const i of [SEC, BAG, GATE]) {
    const lv = E.LEVELS[i];
    assert.equal(E.STAGE_STYLE[lv.id], 'space');
    assert.equal(JSON.stringify(lv.music), JSON.stringify(E.LEVELS[0].music), lv.name + ' uses the Airport music progression');
    assert.ok(!E.beltInfo(lv.id), lv.name + ' has no moving belts');
    const m = E.MEDAL_TIMES[lv.id];
    assert.ok(m && m.gold < m.silver && m.silver < m.bronze, lv.name + ' medal times');
    assert.equal(E.medalFor(lv.id, m.gold), 'gold'); assert.equal(E.medalFor(lv.id, m.bronze + 1), null);
  }
});

test('the wire protocol was bumped for the new stages', () => assert.ok(PROTO >= 13));

test('stages 0-8 keep their crowds and random sequences exactly (hashes taken on the batch-23 base)', () => {
  const want = { 0: '3f7e047c7707', 1: 'd4743f08f1ac', 2: '59945a779e87', 3: '9079be63b784', 4: '81dbfea4259d', 5: 'ea786705b797', 6: 'a6b7c7954ade', 7: 'a3179a0bf731', 8: '0aa81b43bfba' };
  for (let level = 0; level < 9; level++) {
    const h = crypto.createHash('sha1');
    for (const mode of ['classic', 'race']) {
      const E = load(undefined, { seed: 21 + level }); E.setLevel(level); E.start(mode); if (mode === 'race') E.S.race.countT = 0;
      for (let i = 0; i < 500; i++) E.tick(1 / 30);
      h.update(JSON.stringify(E.S.people.map(p => [p.x.toFixed(3), p.z.toFixed(3), p.prop || ''])) + JSON.stringify(mode === 'race' ? E.S.race.bots.map(b => [b.x.toFixed(3), b.z.toFixed(3)]) : []));
    }
    assert.equal(h.digest('hex').slice(0, 12), want[level], 'stage ' + level);
  }
});

test('Daily and Weekly stay capped at the first five stages', () => {
  const R = load(path.join(__dirname, 'entries/rotation-entry.js'));
  for (let d = 1; d <= 28; d++) for (const m of ['2026-11', '2026-12', '2027-05']) assert.ok(R.dailyLevel(m + '-' + String(d).padStart(2, '0')) < 5);
  for (let w = 1; w <= 52; w++) assert.ok(R.weeklyLevel('2027-W' + String(w).padStart(2, '0')) < 5);
});

/* ---------- Security Lanes ---------- */
const secGame = (seed, mode = 'classic') => { const E = L(seed); E.setLevel(SEC); E.start(mode); return E; };

test('every stretch has 3 or 4 lanes, at least one open and at least one closed, and the pattern is seeded', () => {
  const sigs = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    const E = secGame(seed), E2 = secGame(seed); let sig = '';
    for (let i = 0; i < 4; i++) {
      const s = E.secStretch(i), t = E2.secStretch(i);
      assert.ok(s, 'stretch ' + i + ' exists on a 450 m course');
      assert.ok(s.n === 3 || s.n === 4);
      assert.ok(s.open.some(Boolean), 'an open lane in stretch ' + i + ' seed ' + seed);
      assert.ok(s.open.some(o => !o), 'something is closed in stretch ' + i);
      assert.ok(s.w >= 3 && s.divs.length === s.n - 1);
      assert.equal(s.open.join(), t.open.join()); sig += s.n + s.open.map(Number).join('');
    }
    assert.equal(secGame(seed, 'race').secStretch(4), null, 'a race of 450 m has four stretches');
    sigs.add(sig);
  }
  assert.ok(sigs.size > 10, 'different seeds give different lanes');
});

test('lane lights, closed gates and rope lines exist as soon as the stretch is generated', () => {
  const E = secGame(5); E.S.people = [];
  for (let z = 0; z < 120; z += 4) E.genChunk(z);   // covers stretch 0 (70-110)
  const s = E.secStretch(0), lights = E.S.people.filter(p => p.prop === 'lanelight'), gates = E.S.people.filter(p => p.prop === 'scangate');
  assert.equal(lights.length, s.n); assert.equal(gates.length, s.n);
  for (let j = 0; j < s.n; j++) {
    assert.equal(lights.find(p => Math.abs(p.x - E.secLaneX(s, j)) < 1e-6).open, s.open[j]);
    const g = gates.find(p => Math.abs(p.x - E.secLaneX(s, j)) < 1e-6);
    assert.equal(g.circles.length === 0, s.open[j], 'only a closed lane has a solid gate');
  }
  const ropes = E.S.people.filter(p => p.prop === 'secrope');
  for (const d of s.divs) assert.ok(ropes.filter(p => p.x === d).length >= 8, 'rope along divider ' + d);
});

test('the rope lines stop the player crossing inside a stretch, and not between stretches', () => {
  const E = secGame(7); E.S.people = [];
  const s = E.secStretch(0), d = s.divs[0], start = E.secLaneX(s, 0);
  E.S.pz = s.z0 + 2; E.S.px = start; E.S.me.z = E.S.pz;
  E.fire('keydown', { code: 'ArrowRight', key: 'ArrowRight' });
  for (let i = 0; i < 120; i++) { E.S.people = []; E.tick(1 / 60); assert.ok(E.S.px <= d - 0.3 + 1e-6, 'held back at x=' + E.S.px); }
  assert.ok(E.S.px > d - 0.45, 'pressed up against the rope');
  const F = secGame(7); F.S.people = []; F.S.pz = s.z1 + 10; F.S.px = start; F.S.me.z = F.S.pz;
  F.fire('keydown', { code: 'ArrowRight', key: 'ArrowRight' });
  for (let i = 0; i < 90; i++) { F.S.people = []; F.tick(1 / 60); }
  assert.ok(F.S.px > d + 0.5, 'free to change lane between stretches');
});

test('the crowd stays out of closed lanes and off the ropes', () => {
  const E = secGame(3); let seen = 0;
  for (let i = 0; i < 1500; i++) {
    E.S.pz = Math.min(E.LV.goal - 30, E.S.pz + 0.2); E.S.me.z = E.S.pz; E.tick(1 / 60);
    for (let k = 0; k < 4; k++) {
      const s = E.secStretch(k);
      for (const p of E.S.people) if (!p.prop && !p.dead && p.z > s.z0 + 1 && p.z < s.rope1 - 1) {
        seen++;
        assert.ok(s.open[E.secLaneOf(s, p.x)], 'a person in a closed lane at z=' + p.z.toFixed(1));
        for (const d of s.divs) assert.ok(Math.abs(p.x - d) > 0.25, 'a person on a rope line');
      }
    }
  }
  assert.ok(seen > 100, 'people were checked');
});

test('bots pick an open lane before every stretch, stay inside the half-width and finish at every difficulty', () => {
  const medians = [];
  for (const diff of [0, 1, 2]) {
    const times = [];
    for (const seed of [1, 2]) {
      const E = L(seed); E.storage.excuseme_botlvl = String(diff); E.setLevel(SEC);
      E.start('race', undefined, { cup: { model: { bots: [] } } }); E.S.cup = null; E.S.race.countT = 0;
      const checked = new Set();
      for (let i = 0; i < 36000 && !E.S.race.bots.every(b => b.done); i++) {
        E.S.pz = Math.max(0, Math.min(...E.S.race.bots.filter(b => !b.done).map(b => b.z)) - 20);
        E.tick(1 / 60);
        for (const [bi, b] of E.S.race.bots.entries()) {
          assert.ok(Math.abs(b.x) <= E.LV.half - 0.4 + 1e-6);
          for (let k = 0; k < 4; k++) {
            const s = E.secStretch(k);
            if (b.z >= s.z0 + 1 && b.z < s.z0 + 3 && !checked.has(bi + ':' + k)) { checked.add(bi + ':' + k); assert.ok(s.open[E.secLaneOf(s, b.x)], 'bot ' + bi + ' in a closed lane, stretch ' + k + ' seed ' + seed + ' diff ' + diff); }
          }
        }
      }
      assert.ok(E.S.race.bots.every(b => b.done));
      assert.ok(checked.size >= 20, 'most bots were sampled in each stretch: ' + checked.size);
      times.push(...E.S.race.bots.map(b => b.finishT));
    }
    times.sort((a, b) => a - b); medians.push(+times[Math.floor(times.length / 2)].toFixed(1));
  }
  console.log(JSON.stringify({ stage: 'security', medianEasyMediumHard: medians }));
});

test('seven Medium bots finish Security Lanes within 600 simulated seconds on 3 fixed seeds', () => {
  for (const seed of [1, 2, 3]) {
    const E = L(seed); E.storage.excuseme_botlvl = '1'; E.setLevel(SEC);
    E.start('race', undefined, { cup: { model: { bots: [] } } }); E.S.cup = null;
    assert.equal(E.S.race.bots.length, 7);
    for (let i = 0; i < 600 * 30 && !E.S.race.bots.every(b => b.done); i++) { E.S.pz = Math.max(0, Math.min(...E.S.race.bots.filter(b => !b.done).map(b => b.z)) - 20); E.tick(1 / 30); }
    assert.ok(E.S.race.bots.every(b => b.done), 'seed ' + seed);
  }
});

test('Classic and Race play through Security Lanes, render everywhere and the draw leaves the simulation alone', () => {
  const snap = draw => { const E = secGame(13, 'race'); E.S.race.countT = 0; E.S.race.bots = []; for (let i = 0; i < 120; i++) { E.tick(1 / 60); if (draw) E.render(); } return JSON.stringify(E.S.people.map(p => [p.x, p.z])); };
  assert.equal(snap(true), snap(false));
  const C = secGame(4); C.S.people = []; for (const z of [0, 60, 75, 100, 130, 200, 300, 440]) { C.S.pz = z; C.S.me.z = z; C.render(); }
  C.S.pz = C.LV.goal; C.S.me.z = C.S.pz; C.S.people = []; C.tick(1 / 60); assert.ok(C.S.endless);
  const E = secGame(4, 'race'); E.S.race.countT = 0; E.S.race.bots = [];
  for (let i = 0; i < 15000 && !E.S.race.finished; i++) { E.S.people = E.S.people.filter(p => p.prop === 'secrope'); E.tick(1 / 60); }
  assert.ok(E.S.race.finished, 'the player can finish alone while the ropes stay');
});

test('the lane banner event only speaks when a stretch is near and uses no racer position', () => {
  const E = secGame(2); E.S.people = [];
  const before = JSON.stringify(E.S.people); E.runEvent('lanes'); assert.equal(JSON.stringify(E.S.people), before);
});
