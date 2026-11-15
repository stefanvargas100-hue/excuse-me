// Batch 27: stage features. Tsukiji shoppers and porters, Skytree lift arrivals, Baggage carousel waiters, Gate Change boards.
// Every feature comes from the seeded stream, the chunk position or the run clock, never from where a racer is.  node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness.js');
const TSUKIJI = 7, SKYTREE = 8, BAGGAGE = 10, GATE = 11;
const game = (level, seed, mode = 'classic') => { const E = load(undefined, { seed }); E.setLevel(level); E.start(mode); if (mode === 'race') E.S.race.countT = 0; return E; };
const course = (E, z1 = E.LV.goal - 16) => { E.S.people = []; for (let z = 0; z < z1; z += 4) E.genChunk(z); };
const spanX = p => { let lo = Infinity, hi = -Infinity; for (const c of p.circles) { lo = Math.min(lo, p.x + c.ox - c.r); hi = Math.max(hi, p.x + c.ox + c.r); } return [lo, hi]; };
const spanZ = p => { let lo = Infinity, hi = -Infinity; for (const c of p.circles) { lo = Math.min(lo, p.z + (c.oz || 0) - c.r); hi = Math.max(hi, p.z + (c.oz || 0) + c.r); } return [lo, hi]; };

/* ---------- Tsukiji: shoppers ---------- */
test('about a third of the Tsukiji crowd are shoppers who stop at the stalls', () => {
  let shop = 0, all = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const E = game(TSUKIJI, seed); course(E);
    const crowd = E.S.people.filter(p => !p.prop && !p.porter);
    all += crowd.length; shop += crowd.filter(p => p.shopper && p.photo > 0).length;
  }
  const share = shop / all;
  assert.ok(share > 0.24 && share < 0.43, 'shopper share ' + share.toFixed(2));
});

/* ---------- Tsukiji: porters ---------- */
const porters = E => E.S.people.filter(p => p.porter && !p.dead);
const patches = E => E.S.people.filter(p => p.wetPatch);
function checkPorter(E, p) {
  const [lo, hi] = spanX(p), half = E.LV.half;
  assert.ok(hi - lo <= 0.9 + 1e-9, 'porter and cart at most 0.9 m wide: ' + (hi - lo).toFixed(2));
  assert.ok(Math.max(half - hi, lo + half) >= 1.9, 'at least 1.9 m clear on one side');
  for (const w of patches(E)) {
    const [zl, zh] = spanZ(p), wz0 = w.z - w.depth / 2, wz1 = w.z + w.depth / 2, wx0 = w.x - w.width / 2, wx1 = w.x + w.width / 2;
    if (zh > wz0 && zl < wz1) assert.ok(hi <= wx0 || lo >= wx1, 'porter on a wet patch at z ' + p.z.toFixed(1));
  }
}

test('porters push a cart ahead of them your way at about 1.0 m/s, narrow enough to pass, and never on a wet patch', () => {
  let seen = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const E = game(TSUKIJI, seed, 'race'); course(E);
    for (const p of porters(E)) {
      seen++;
      assert.equal(p.v0, 1.0); assert.equal(p.vz, 1.0); assert.equal(p.vx, 0); assert.equal(p.hz, 1);
      const cart = p.circles.filter(c => c.oz > 0.3);
      assert.ok(cart.length >= 2, 'a cart ahead of the porter');
      assert.ok(Math.max(...p.circles.map(c => c.oz + c.r)) >= 1.4, 'a long obstacle');
      checkPorter(E, p);
    }
  }
  assert.ok(seen >= 12, 'porters appear: ' + seen);
  for (const id of [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11]) { const E = game(id, 3); course(E, 300); assert.equal(porters(E).length, 0, 'no porters on stage ' + id); }
});

test('at most one porter per 30 m, at every moment of a bot race, and none ever on a wet patch or knocked off line', () => {
  for (const seed of [2, 5, 9]) {
    const E = load(undefined, { seed }); E.storage.excuseme_botlvl = '2'; E.setLevel(TSUKIJI);
    E.start('race'); E.S.race.countT = 0; E.S.race.bots.splice(4);
    let most = 0;
    for (let i = 0; i < 30 * 160 && !E.S.race.bots.every(b => b.done); i++) {
      const live = E.S.race.bots.filter(b => !b.done); E.S.pz = Math.max(0, Math.min(...live.map(b => b.z)) - 6); E.S.me.z = E.S.pz; E.S.ghostT = 9;
      E.tick(1 / 30);
      if (i % 15) continue;
      const ps = porters(E).sort((a, b) => a.z - b.z); most = Math.max(most, ps.length);
      for (let k = 1; k < ps.length; k++) assert.ok(ps[k].z - ps[k - 1].z >= 30, 'porters ' + (ps[k].z - ps[k - 1].z).toFixed(1) + ' m apart');
      for (const p of ps) { checkPorter(E, p); assert.equal(p.vx, 0, 'a porter keeps a straight line'); assert.equal(p.vz, 1.0); }
    }
    assert.ok(most >= 2, 'several porters on the course at once');
  }
});

test('porters come from the seed and the course clock, not from where the racers are', () => {
  const snaps = [];
  for (const px of [-3, 3]) { const E = game(TSUKIJI, 4, 'race'); E.S.px = px; course(E); snaps.push(JSON.stringify(porters(E).map(p => [p.x, p.z]))); }
  assert.equal(snaps[0], snaps[1]);
  // a porter generated later is placed where it would have walked to, so the spacing holds whatever the pace
  const a = game(TSUKIJI, 4, 'race'); course(a); const b = game(TSUKIJI, 4, 'race'); b.S.time = 7; course(b);
  const za = porters(a).map(p => p.z), zb = porters(b).map(p => p.z);
  assert.deepEqual(zb.map((z, i) => +(z - za[i]).toFixed(9)), za.map(() => 7));
});

/* ---------- Skytree: lift arrivals ---------- */
const lifters = E => E.S.people.filter(p => p.lift);
test('a lift arrival is announced, lights doors in the exhibit wall and sends 6 to 8 people across, 4.6 m or more apart', () => {
  assert.ok(game(SKYTREE, 1).LV.events.includes('lift'));
  for (let seed = 1; seed <= 25; seed++) {
    const E = game(SKYTREE, seed); E.S.people = [];
    E.runEvent('lift');
    assert.equal(E.S.banner.text, 'LIFT ARRIVING: VISITORS CROSSING');
    const ps = lifters(E).sort((a, b) => a.z - b.z);
    assert.ok(ps.length >= 6 && ps.length <= 8, ps.length + ' people');
    assert.ok(ps[0].z - E.S.pz >= 66, 'beyond SPAWN_FAR');
    for (let i = 1; i < ps.length; i++) assert.ok(ps[i].z - ps[i - 1].z >= 4.6 - 1e-9, 'one at a time');
    for (const p of ps) { assert.ok(p.x <= -E.LV.half, 'still inside the lift'); assert.ok(p.vx > 0 && p.vz === 0); }
    assert.equal(E.S.lifts.length, ps.length);
    for (const [i, l] of E.S.lifts.entries()) { assert.equal(l.z, ps[i].z); assert.ok(l.out > E.S.time); }
  }
});

test('lift passengers step out, cross the deck on their own line and stand at the windows', () => {
  for (const seed of [3, 7]) {
    const E = game(SKYTREE, seed, 'race'); E.S.people = []; E.S.race.bots = [];
    E.runEvent('lift');
    const ps = lifters(E), z0 = ps.map(p => p.z);
    let crossing = 0;
    for (let i = 0; i < 60 * 40; i++) {
      E.S.pz = 0; E.S.me.z = 0; E.tick(1 / 60);
      const on = ps.filter(p => p.x > -E.LV.half && p.x < E.LV.half - 0.5).length;
      crossing = Math.max(crossing, on);
      ps.forEach((p, k) => assert.equal(p.z, z0[k], 'walks straight across'));
    }
    assert.ok(crossing >= 2, 'people were out on the deck');
    for (const p of ps) { assert.ok(p.x > E.LV.half - 1, 'at the window: ' + p.x.toFixed(2)); assert.equal(p.vx, 0); assert.ok(p.fx > 0.9, 'facing the view'); }
  }
});

test('the lift arrival depends on nothing about the racers', () => {
  const snaps = [];
  for (const px of [-5, 5]) { const E = game(SKYTREE, 8); E.S.people = []; E.S.px = px; E.runEvent('lift'); snaps.push(JSON.stringify([lifters(E).map(p => [p.x, p.z, p.vx]), E.S.lifts])); }
  assert.equal(snaps[0], snaps[1]);
});

/* ---------- Baggage: people waiting at the carousel ---------- */
const waiters = E => E.S.people.filter(p => p.waiting);
const groupsOf = E => {
  const ws = waiters(E).sort((a, b) => a.z - b.z), out = [];
  for (const w of ws) { const g = out[out.length - 1]; if (g && w.z - g[g.length - 1].z < 5) g.push(w); else out.push([w]); }
  return out;
};
test('groups of 3 to 5 wait along the carousel kerb, within 1.6 m of the left edge, every 40 to 60 m', () => {
  for (let seed = 1; seed <= 10; seed++) for (const mode of ['classic', 'race']) {
    const E = game(BAGGAGE, seed, mode); course(E);
    const gs = groupsOf(E), h = E.LV.half;
    assert.ok(gs.length >= 6, gs.length + ' groups');
    for (const g of gs) {
      assert.ok(g.length >= 3 && g.length <= 5, 'group of ' + g.length);
      for (const w of g) { assert.ok(w.x - 0.25 >= -h && w.x + 0.25 <= -h + 1.6, 'at the kerb: ' + w.x.toFixed(2)); assert.equal(w.v0, 0); assert.ok(w.fx < -0.9, 'watching the carousel'); }
    }
    const zs = gs.map(g => g.reduce((s, w) => s + w.z, 0) / g.length);
    for (let i = 1; i < zs.length; i++) assert.ok(zs[i] - zs[i - 1] >= 40 - 0.5 && zs[i] - zs[i - 1] <= 60 + 0.5, 'spacing ' + (zs[i] - zs[i - 1]).toFixed(1));
  }
  for (const id of [0, 7, 8, 9, 11]) { const E = game(id, 3); course(E, 300); assert.equal(waiters(E).length, 0); }
});

test('the waiting groups come from the seed and the chunk position only', () => {
  const snap = (px, ahead) => { const E = load(undefined, { seed: 99 }); E.setLevel(BAGGAGE); E.start('race', undefined, { run: { seed: 'B27' } }); E.S.race.countT = 0; E.S.px = px; E.S.pz = ahead; course(E); return JSON.stringify(waiters(E).map(w => [w.x, w.z])); };
  assert.equal(snap(-4, 0), snap(4, 50));
});

test('a bag spill never slides through a waiting group, whichever is placed first', () => {
  let near = 0;
  for (let seed = 1; seed <= 30; seed++) for (const first of ['chunks', 'spill']) {
    const E = game(BAGGAGE, seed); E.S.people = [];
    const spill = () => { for (const pz of [0, 40, 90, 140, 200, 260, 320]) { E.S.pz = pz; E.runEvent('bagspill'); } E.S.pz = 0; };
    if (first === 'spill') spill();
    for (let z = 0; z < 470; z += 4) E.genChunk(z);
    if (first === 'chunks') spill();
    const items = E.S.people.filter(p => p.drive), ws = waiters(E);
    for (const it of items) for (const w of ws) {
      const [zl, zh] = spanZ(it), gap = Math.max(zl - (w.z + 0.25), (w.z - 0.25) - zh);
      if (gap < 3) near++;
      assert.ok(gap >= 0.5, 'a ' + it.prop + ' at z ' + it.z.toFixed(2) + ' slides through a waiter at z ' + w.z.toFixed(2));
    }
  }
  assert.ok(near > 0, 'some spills were moved clear of a group');
});

/* ---------- Gate Change: the departure boards flip ---------- */
test('the gate change sets a board timer that lasts while the crowd is turning', () => {
  const E = game(GATE, 4); E.S.people = []; for (let z = 0; z < 140; z += 4) E.genChunk(z); E.S.pz = 20; E.S.me.z = 20;
  assert.ok(!(E.S.boardFlipUntil > E.S.time));
  E.runEvent('gatechange');
  const longest = Math.max(...E.S.people.filter(p => p.settleT !== undefined).map(p => p.settleT));
  assert.ok(Math.abs(E.S.boardFlipUntil - (E.S.time + longest)) < 1e-9);
  for (let i = 0; i < 60 * 7; i++) { E.S.pz = 20; E.S.me.z = 20; E.S.ghostT = 9; E.tick(1 / 60); if (i % 60 === 0) E.render(); }
  assert.ok(E.S.time > E.S.boardFlipUntil);
  assert.ok(!E.S.people.some(p => p.settleT !== undefined), 'the crowd has settled when the boards flip back');
});

test('the boards are drawing only: the run is the same with the board timer and without it', () => {
  const run = keep => {
    const E = game(GATE, 6, 'race');
    for (let i = 0; i < 60 * 40; i++) { if (i === 600) E.runEvent('gatechange'); if (!keep) delete E.S.boardFlipUntil; E.tick(1 / 60); if (i % 20 === 0) E.render(); }
    return JSON.stringify([E.S.pz, E.S.race.bots.map(b => b.z), E.S.people.map(p => [p.x, p.z])]);
  };
  assert.equal(run(true), run(false));
});

test('every new feature renders on screen without errors', () => {
  const T = game(TSUKIJI, 2, 'race'); course(T); const p = porters(T)[0]; T.S.pz = p.z - 6; T.S.me.z = T.S.pz; T.render();
  const S = game(SKYTREE, 2); S.S.people = []; S.runEvent('lift'); for (let i = 0; i < 60 * 15; i++) { S.S.ghostT = 9; S.tick(1 / 60); } S.S.pz = S.S.lifts[0].z - 10; S.render();
  const B = game(BAGGAGE, 2); course(B); B.S.pz = waiters(B)[0].z - 8; B.render();
});
