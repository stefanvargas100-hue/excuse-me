const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');
const { run } = require('../tools/belt-check.cjs');
for (const seed of [1, 2, 3, 35]) {
  test(`airport race seed ${seed} never generates reverse-belt occupants`, () => {
    const E = load(null, { seed }); E.setLevel(0); E.start(false, 'race');
    const bad = E.S.people.filter(p => !p.prop && p.x > 3.9 && p.x <= 5.9 && p.z > 30 && p.z < 76);
    assert.equal(bad.length, 0, JSON.stringify(bad.map(p => ({ x: p.x, z: p.z }))));
  });
  test(`airport race seed ${seed} preserves the moving crowd threshold`, () => {
    const r = run(seed); assert.ok(r.seen > 5); assert.ok(!r.fail, JSON.stringify(r));
  });
}
