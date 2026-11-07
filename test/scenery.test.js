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
