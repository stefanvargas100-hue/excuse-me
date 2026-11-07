// Risk pays in races: combos and near misses give real speed and stamina. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');
const DT = 1 / 30;

function atGo() { const E = load(); E.setLevel(0); E.start(false, 'race'); for (let i = 0; i < 91; i++) E.tick(DT); E.S.people.length = 0; return E; }
// someone you just walked past, dx metres to the side (body radius .25 each, so gap = dx - .5)
const passBy = (E, dx) => { const p = E.mkPerson(E.S.px + dx, E.S.pz - 0.1); E.onPass(p); return p; };

test('a long combo is worth real speed: x8 is about 28 percent faster', () => {
  const E = atGo();
  const x8 = E.racePace(21, 100), x2 = E.racePace(3, 100);
  assert.ok(x8 >= 1.27 && x8 <= 1.3, 'x8 ' + x8.toFixed(3));
  assert.ok(x2 >= 1.035 && x2 <= 1.05, 'x2 ' + x2.toFixed(3));
});

test('a razor-thin pass gives a speed burst of about 25 percent for 2 seconds', () => {
  const E = atGo();
  assert.strictEqual(E.nearMul(E.S), 1);
  passBy(E, 0.6);
  assert.ok(E.nearMul(E.S) >= 1.24 && E.nearMul(E.S) <= 1.26, 'burst ' + E.nearMul(E.S));
  for (let i = 0; i < 50; i++) E.tick(DT);
  assert.ok(E.nearMul(E.S) > 1, 'still on after 1.6 s');
  for (let i = 0; i < 20; i++) E.tick(DT);
  assert.strictEqual(E.nearMul(E.S), 1, 'over after 2.3 s');
});

test('a close pass gives a smaller burst, a wide pass gives none', () => {
  const E = atGo();
  passBy(E, 1.3); assert.strictEqual(E.nearMul(E.S), 1, 'wide pass: nothing');
  passBy(E, 0.8); assert.ok(E.nearMul(E.S) >= 1.11 && E.nearMul(E.S) <= 1.13, 'close ' + E.nearMul(E.S));
});

test('a close pass never weakens a stronger burst already running, and a razor upgrades a close one', () => {
  const E = atGo();
  passBy(E, 0.6); const big = E.nearMul(E.S);
  passBy(E, 0.8); assert.strictEqual(E.nearMul(E.S), big);
  const F = atGo(); passBy(F, 0.8); passBy(F, 0.6); assert.ok(F.nearMul(F.S) >= 1.24);
});

test('near misses refill a real chunk of stamina', () => {
  const E = atGo(); E.S.energy = 10;
  passBy(E, 0.6); assert.ok(E.S.energy >= 30, 'razor: ' + E.S.energy);
  E.S.energy = 10; passBy(E, 0.8); assert.ok(E.S.energy >= 20 && E.S.energy < 30, 'close: ' + E.S.energy);
});

test('the burst makes you actually walk faster, and a bump cancels it', () => {
  const E = atGo(); for (let i = 0; i < 90; i++) E.tick(DT);
  const base = E.S.speed;
  passBy(E, 0.6); for (let i = 0; i < 30; i++) E.tick(DT);
  assert.ok(E.S.speed > base * 1.15, 'faster: ' + base.toFixed(2) + ' -> ' + E.S.speed.toFixed(2));
  E.S.nearT = 1.5; E.S.nearAmt = 0.25;
  const p = E.mkPerson(E.S.px, E.S.pz + 0.3); p.vz = 0; E.S.people.push(p); E.tick(DT); E.tick(DT);
  if (E.S.bumpT > 0) assert.strictEqual(E.nearMul(E.S), 1, 'a bump ends the burst');
});

test('outside a race a near miss does not change your speed', () => {
  const E = load(); E.setLevel(0); E.start(false, 'classic'); for (let i = 0; i < 30; i++) E.tick(DT);
  E.S.people.length = 0; passBy(E, 0.6);
  assert.strictEqual(E.nearMul(E.S), 1);
});
