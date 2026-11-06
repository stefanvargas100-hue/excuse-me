// Headless simulation checks: node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');

const DT = 1 / 30, CAM_BACK = 3.6, DRAW_FAR = 62;
const levels = [0, 1, 2];

function fresh(level, daily) {
  const E = load();
  E.setLevel(level);
  E.start(daily === true);
  return E;
}
function snapshot(E) {
  return JSON.stringify(E.S.people.map(p => [p.x, p.z, p.vx, p.vz, p.shirt, !!p.prop].map(v => typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : v)));
}

for (const lv of levels) {
  test(`level ${lv}: 150 s of play has no NaN positions and nobody appears inside view`, () => {
    const E = fresh(lv);
    E.tick(DT);
    let seen = new Set(E.S.people), bad = [], nan = 0;
    for (let i = 0; i < 30 * 150; i++) {
      E.tick(DT);
      if (E.state !== 'play') { E.start(); E.tick(DT); seen = new Set(E.S.people); continue; }   // restart after a bump; nobody is steering
      for (const p of E.S.people) {
        if (!seen.has(p)) {
          seen.add(p);
          const dz = p.z - E.S.pz + CAM_BACK;
          if (!p.prop && p.fadeT === undefined && dz > 0.6 && dz < DRAW_FAR) bad.push({ dz, rival: p.rival, t: E.S.time });
        }
        if (![p.x, p.z, p.vx, p.vz, p.phase].every(Number.isFinite)) nan++;
      }
    }
    assert.strictEqual(nan, 0, 'non-finite values in the crowd');
    assert.deepStrictEqual(bad, [], 'people appeared inside the visible range');
  });
}

test('the same daily seed produces the same crowd (leaderboards rely on this)', () => {
  const run = () => {
    const E = fresh(1, true);
    for (let i = 0; i < 300; i++) E.tick(DT);
    return snapshot(E);
  };
  const a = run();
  assert.ok(JSON.parse(a).length > 10, 'the crowd should not be empty');
  assert.strictEqual(a, run());
});

test('different non-daily runs produce different crowds', () => {
  const a = fresh(0), b = fresh(0);
  for (let i = 0; i < 60; i++) { a.tick(DT); b.tick(DT); }
  assert.notStrictEqual(snapshot(a), snapshot(b));
});
