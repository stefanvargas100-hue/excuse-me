// Airport walkway: the reverse belt is gentle, nobody walks it the wrong way, nobody gets stuck at the end. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');
const DT = 1 / 30;

// Airport race, past the countdown, with the player standing on plain floor next to the first walkway stretch (z 30 to 76).
function atGo() { const E = load(); E.setLevel(0); E.start(false, 'race'); for (let i = 0; i < 91; i++) E.tick(DT); E.S.people.length = 0; E.S.race.bots.length = 0; E.S.nextChunk = 1e9; return E; }
const REV_X = 4.9, FWD_X = 3.2;
const beltAt = (E, x, z) => (x >= 1.9 && x <= 3.9 ? 1 : x > 3.9 && x <= 5.9 ? -1 : 0) * (z > 30 && (z - 30) % 100 < 46 ? 1 : 0);

test('walking on the reverse belt still moves you forward at a decent pace', () => {
  const E = atGo(); E.S.px = REV_X; E.S.pz = 40; E.S.speed = 3;
  const z0 = E.S.pz; for (let i = 0; i < 60; i++) { E.S.px = REV_X; E.tick(DT); }
  const v = (E.S.pz - z0) / 2;
  assert.ok(v >= 2.3, 'forward speed on the reverse belt: ' + v.toFixed(2) + ' m/s');
  assert.ok(v < 3.0, 'but still slower than plain floor: ' + v.toFixed(2));
});

test('the reverse belt can slow you down but never carry you backwards', () => {
  const E = atGo(); E.S.px = REV_X; E.S.pz = 40; E.S.speed = 0.4; E.S.bumpT = 5;   // just bumped: crawling
  for (let i = 0; i < 10; i++) { E.S.px = REV_X; E.tick(DT); assert.ok(E.S.speed + E.S.belt >= 0, 'net ' + (E.S.speed + E.S.belt).toFixed(2)); }
});

test('the belt that goes your way still carries you', () => {
  const E = atGo(); E.S.px = FWD_X; E.S.pz = 40; E.S.speed = 3;
  for (let i = 0; i < 10; i++) { E.S.px = FWD_X; E.tick(DT); }
  assert.ok(E.S.belt > 1, 'carried: ' + E.S.belt);
});

test('nobody walks or rides the reverse belt: the crowd is never generated there', () => {
  const E = load(); E.setLevel(0); E.start(false, 'race');
  for (let i = 0; i < 91; i++) E.tick(DT);
  E.S.pz = 28; let seen = 0, bad = 0;
  for (let i = 0; i < 30 * 12; i++) {
    E.S.pz = Math.min(E.S.pz, 29); E.tick(DT);
    if (i % 15) continue;
    for (const p of E.S.people) if (!p.prop && p.z > 30 && p.z < 76) { seen++; if (beltAt(E, p.x, p.z) === -1) bad++; }
  }
  assert.ok(seen > 5, 'looked at people on the walkway: ' + seen);
  assert.ok(bad <= seen * 0.03, 'people on the reverse belt: ' + bad + ' of ' + seen);
});

test('someone who ends up on the reverse belt steps over to the other belt', () => {
  const E = atGo(); E.S.pz = 28;
  const p = E.mkPerson(REV_X, 50); p.hz = -1; p.hx = 0; p.v0 = 1.2; p.vz = -1.2; E.S.people.push(p);
  for (let i = 0; i < 90; i++) { E.S.pz = 28; E.tick(DT); }
  assert.ok(p.x < 3.95, 'moved to the divider: ' + p.x.toFixed(2));
});

test('people on the belt that goes your way walk your way, not against it', () => {
  const E = atGo(); E.S.pz = 28;
  const p = E.mkPerson(FWD_X, 50); p.hz = -1; p.hx = 0; p.v0 = 1.2; p.vz = -1.2; E.S.people.push(p);
  for (let i = 0; i < 60; i++) { E.S.pz = 28; E.tick(DT); }
  assert.ok(p.hz > 0, 'turned around: hz ' + p.hz);
});

test('a rider who stands still on the belt walks on at the end instead of getting stuck there', () => {
  const E = atGo(); E.S.pz = 28;
  const p = E.mkPerson(FWD_X + 0.4, 74.5); p.v0 = 0; p.belt = 1; p.hz = 1; p.hx = 0; p.vz = 0; E.S.people.push(p);
  for (let i = 0; i < 30 * 8; i++) { E.S.pz = 28; E.tick(DT); }
  assert.ok(p.z > 82, 'walked on past the end of the belt (z ' + p.z.toFixed(1) + ')');
});
