// Scenery on all three stages (render/nycdetail.js, airportdetail.js, shibuyadetail.js) is decoration only: it must draw without
// errors anywhere on the street, and drawing it must never change the simulation. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');
const DT = 1 / 30;

const STAGES = [[0, 'Terminal B'], [1, 'Fifth Avenue'], [2, 'Shibuya Crossing']];

const run = (lv, seed, renderEvery) => {
  const E = load(undefined, { seed });
  E.setLevel(lv); E.start('classic');
  for (let i = 0; i < 900; i++) { E.tick(DT); if (renderEvery && i % renderEvery === 0) E.render(); }
  const S = E.S;
  return { pz: S.pz, px: S.px, score: S.score, people: S.people.map(p => [p.x.toFixed(4), p.z.toFixed(4)].join(',')).join(';'), cars: S.cars.length };
};

for (const [lv, name] of STAGES) {
  test(name + ': drawing the scenery does not change the simulation (same seed, same run, with and without rendering)', () => {
    assert.deepStrictEqual(run(lv, 2024, 3), run(lv, 2024, 0));
  });

  test(name + ': draws without errors along its length, from wall to wall', () => {
    {
      const E = load(undefined, { seed: 7 });
      E.setLevel(lv); E.start('classic');
      const S = E.S, w = E.LV.half - 0.5;
      for (const z of [0, 13, 40, 89, 95, 100, 181, 250, 333, 480, 575]) {
        for (const x of [-w, 0, w]) {
          S.pz = z; S.me.z = z; S.px = x; S.me.x = x; S.camX = x;
          for (let i = 0; i < 3; i++) E.tick(DT);
          assert.doesNotThrow(() => E.render(), name + ' render at z=' + z + ' x=' + x);
        }
      }
    }
  });
}

test('a race (belts, bots) draws the airport scenery too', () => {
  const E = load(undefined, { seed: 11 });
  E.setLevel(0); E.start('race');
  for (let i = 0; i < 120; i++) E.tick(DT);
  assert.doesNotThrow(() => E.render());
});

// Time of day and weather (render/weather.js): every variant draws on its stage, picking is stable for a seed, and drawing never changes the run.
test('every weather variant draws without errors on its stage', () => {
  const E = load(undefined, { seed: 5 });
  for (const [lv, id] of [[0, 'airport'], [1, 'nyc'], [2, 'shibuya']]) {
    E.setLevel(lv); E.start('classic');
    for (const [v] of E.VARIANTS[id]) { E.setVariant(v); for (let i = 0; i < 3; i++) E.tick(DT); assert.doesNotThrow(() => E.render(), id + ' ' + v); }
  }
});

test('the weather for a daily seed is the same every time and is always one of the stage\'s variants', () => {
  const E = load(undefined, { seed: 5 });
  for (const id of ['airport', 'nyc', 'shibuya']) {
    const names = E.VARIANTS[id].map(e => e[0]);
    for (const seed of ['2026-11-07', '2026-11-08', '2026-W45']) {
      const a = E.pickVariant(id, seed, Math.random), b = E.pickVariant(id, seed, Math.random);
      assert.strictEqual(a, b); assert.ok(names.includes(a));
    }
  }
});

test('weather does not change the simulation', () => {
  const go = (v) => { const E = load(undefined, { seed: 2024 }); E.setLevel(2); E.start('classic'); E.setVariant(v); for (let i = 0; i < 600; i++) { E.tick(DT); if (i % 3 === 0) E.render(); } const S = E.S; return [S.pz, S.px, S.score, S.people.length].join(','); };
  assert.strictEqual(go('rain'), go('night'));
});

// A daily run must show the sky for its date even if the same stage was already on screen with a random look (the menu draws it first).
test('a daily run gets the sky for its date, whatever was on screen before', () => {
  const realNow = Date.now;
  try {
    for (const [lv, id] of [[0, 'airport'], [1, 'nyc'], [2, 'shibuya']]) {
      const E = load(undefined, { seed: 9 });
      // find out which sky today's date gives this stage, then force the casual pick before it to be a different one
      E.setLevel(lv); E.start('daily'); const seed = E.S.seed; assert.ok(seed);
      const want = E.pickVariant(id, seed);
      const other = [...Array(9973).keys()].find(v => E.pickVariant(id, null, () => v / 9973) !== want);
      Date.now = () => other;
      const F = load(undefined, { seed: 9 });
      F.setLevel(lv); F.start('classic'); F.render();
      assert.notStrictEqual(F.variantOf(), want, 'the casual look should differ for this check to mean anything');
      F.start('daily'); F.render();
      assert.strictEqual(F.variantOf(), want, id);
      Date.now = realNow;
    }
  } finally { Date.now = realNow; }
});

test('restarting straight away picks the look again, even after a very short run', () => {
  const realNow = Date.now;
  try {
    const E = load(undefined, { seed: 9 });
    E.setLevel(1);
    const day = [...Array(9973).keys()].find(v => E.pickVariant('nyc', null, () => v / 9973) === 'day');
    const gold = [...Array(9973).keys()].find(v => E.pickVariant('nyc', null, () => v / 9973) === 'golden');
    Date.now = () => day; E.start('classic'); E.render(); assert.strictEqual(E.variantOf(), 'day');
    Date.now = () => gold; E.start('classic'); E.render(); assert.strictEqual(E.variantOf(), 'golden');
  } finally { Date.now = realNow; }
});
