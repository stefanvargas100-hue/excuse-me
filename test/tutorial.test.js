// The tutorial's skill steps (perfect dash, perfect "Excuse me") can be completed by a player. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');

const DT = 1 / 30;
const key = (E, type, k) => E.fire(type, { key: k });
const press = (E, k) => { key(E, 'keydown', k); key(E, 'keyup', k); };
const ahead = E => E.S.people.filter(p => !p.prop && !p.dead && p.z - E.S.pz > 0.1).sort((a, b) => a.z - b.z)[0];

function run(E, maxTicks, until, each) {
  for (let i = 0; i < maxTicks; i++) { each && each(); E.tick(DT); if (until()) return true; }
  return false;
}

test('the tutorial can be finished by dashing and shouting at the right moment', () => {
  const E = load(); delete E.storage.excuseme_tut;
  E.setLevel(0); E.start(false, 'classic');
  assert.ok(E.S.tut, 'tutorial is running');
  E.S.tut.step = 4; E.S.tut.t = 1;   // jump to the plain "Excuse me" step
  E.tick(DT);
  press(E, ' ');                      // Space says "Excuse me"
  assert.ok(run(E, 30, () => E.S.tut.step === 5), 'plain shout moves on to the dash step');

  // dash step: walk at the practice person, dash sideways at the last moment
  assert.ok(run(E, 900, () => !E.S.tut || E.S.tut.step === 6, () => {
    const p = ahead(E);
    if (p && p.z - E.S.pz < 1.4 && Math.abs(p.x - E.S.px) < 0.4) { press(E, 'd'); press(E, 'd'); }
  }), 'perfect dash moves on to the shout step');

  // shout step: shout right before touching the person ahead
  assert.ok(run(E, 900, () => !E.S.tut, () => {
    const p = ahead(E);
    if (p && p.z - E.S.pz < 2.0 && Math.abs(p.x - E.S.px) < 0.5) press(E, ' ');
  }), 'perfect shout ends the tutorial');
});

test('a perfect shout made in an earlier step does not skip the shout step', () => {
  const E = load(); delete E.storage.excuseme_tut;
  E.setLevel(0); E.start(false, 'classic');
  E.S.tutPerfectShout = true;
  E.S.tut.step = 5; E.S.tut.t = 1; E.S.perfectT = 1;
  E.tick(DT); E.tick(DT);
  assert.strictEqual(E.S.tut.step, 6);
  E.S.tut.t = 1; E.tick(DT);
  assert.strictEqual(E.S.tut.step, 6, 'still waiting for a shout during this step');
});
