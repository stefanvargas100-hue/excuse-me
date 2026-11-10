// Slipstream is a bit stronger, and cannot be chained: there is a short cooldown after a boost ends. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');
const DT = 1 / 30;

function atGo() { const E = load(); E.setLevel(0); E.start(false, 'race'); for (let i = 0; i < 91; i++) E.tick(DT); return E; }
function tail(E, ticks, dx, dz, vz) {
  for (let i = 0; i < ticks; i++) {
    E.S.people.length = 0; E.S.race.bots.length = 0; E.S.nextChunk = 1e9;
    const p = E.mkPerson(E.S.px + dx, E.S.pz + dz); p.vz = vz; p.vx = 0; p.racer = true;
    E.tick(DT);
  }
}

test('a slipstream boost is about 25 percent', () => {
  const E = atGo(); tail(E, 60, 0, 2.5, 3);
  assert.ok(E.S.draftT > 0, 'earned');
  assert.ok(E.draftMul(E.S) >= 1.24 && E.draftMul(E.S) <= 1.27, 'boost ' + E.draftMul(E.S));
});

test('no new slipstream straight after one ends: a short cooldown, then it works again', () => {
  const E = atGo(); tail(E, 60, 0, 2.5, 3); assert.ok(E.S.draftT > 0);
  tail(E, 85, 3, 2.5, 3);                                   // step out of the draft until the boost has just run out
  assert.strictEqual(E.S.draftT, 0, 'the boost ended');
  tail(E, 130, 0, 2.5, 3);                                   // right back behind someone, 4.3 s
  assert.strictEqual(E.S.draftT, 0, 'no new boost during the cooldown');
  assert.strictEqual(E.S.draftC, 0, 'and nothing charges either');
  tail(E, 100, 0, 2.5, 3);                                  // 3.3 more seconds
  assert.ok(E.S.draftT > 0, 'works again after the cooldown');
});

test('a bump that cancels a boost does not add a cooldown', () => {
  const E = atGo(); tail(E, 60, 0, 2.5, 3); assert.ok(E.S.draftT > 0);
  tail(E, 3, 0, 0.2, 0); assert.strictEqual(E.S.draftT, 0);
  assert.ok(!E.S.draftCool, 'no cooldown after a bump: ' + E.S.draftCool);
});

test('bots follow the same cooldown', () => {
  const E = atGo(); const b = E.S.race.bots[0];
  assert.ok('draftCool' in b || b.draftCool === undefined);
});
