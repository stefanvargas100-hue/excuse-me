// Fifth Avenue scenery (render/nycdetail.js) is decoration only: it must draw without errors anywhere on the street, and drawing it
// must never change the simulation. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');
const DT = 1 / 30;

const NYC = 1;
const run = (seed, renderEvery) => {
  const E = load(undefined, { seed });
  E.setLevel(NYC); E.start('classic');
  for (let i = 0; i < 900; i++) { E.tick(DT); if (renderEvery && i % renderEvery === 0) E.render(); }
  const S = E.S;
  return { pz: S.pz, px: S.px, score: S.score, people: S.people.map(p => [p.x.toFixed(4), p.z.toFixed(4)].join(',')).join(';'), cars: S.cars.length };
};

test('drawing the avenue scenery does not change the simulation (same seed, same run, with and without rendering)', () => {
  const plain = run(2024, 0), drawn = run(2024, 3);
  assert.deepStrictEqual(drawn, plain);
});

test('the avenue draws without errors along its whole length and from the kerb to the wall', () => {
  const E = load(undefined, { seed: 7 });
  E.setLevel(NYC); E.start('classic');
  const S = E.S;
  for (const z of [0, 13, 40, 89, 95, 100, 181, 250, 333, 480, 575]) {
    for (const x of [-4.2, 0, 4.2]) {
      S.pz = z; S.me.z = z; S.px = x; S.me.x = x; S.camX = x;
      for (let i = 0; i < 3; i++) E.tick(DT);
      assert.doesNotThrow(() => E.render(), 'render at z=' + z + ' x=' + x);
    }
  }
});

test('the other two stages still draw (the scenery hooks only run on the avenue)', () => {
  for (const lv of [0, 2]) {
    const E = load(undefined, { seed: 3 });
    E.setLevel(lv); E.start('classic');
    for (let i = 0; i < 60; i++) E.tick(DT);
    assert.doesNotThrow(() => E.render());
  }
});
