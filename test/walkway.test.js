// Airport moving walkway: two belts side by side, one each way. People stand on the right and pass on the left. node --test
const test = require('node:test');
const assert = require('node:assert');
const path = require('path'), esbuild = require('esbuild');
const { load } = require('./harness.js');
const DT = 1 / 30;

function loadStrips() {
  const out = esbuild.buildSync({ entryPoints: [path.join(__dirname, '..', 'src', 'config', 'strips.js')], bundle: true, format: 'cjs', write: false, logLevel: 'silent' }).outputFiles[0].text;
  const m = { exports: {} }; new Function('module', 'exports', 'require', out)(m, m.exports, require); return m.exports;
}
const { beltAt, BELT_SPEED, BELT_BACK, beltInfo, onStrip, contain } = loadStrips();

const atGo = (lv = 0, mode = 'race') => { const E = load(); E.setLevel(lv); E.start(false, mode); if (mode === 'race') for (let i = 0; i < 91; i++) E.tick(DT); return E; };

test('belt geometry: one belt each way side by side, only inside the walkway stretches, only at the airport', () => {
  const B = beltInfo('airport');
  assert.ok(B && BELT_SPEED > 0.8 && BELT_SPEED < 2);
  assert.ok(BELT_BACK > 0.4 && BELT_BACK < BELT_SPEED, 'the belt coming back pulls less than the one going your way: ' + BELT_BACK);
  const z = B.start + 10;
  assert.strictEqual(beltAt('airport', (B.fwd[0] + B.fwd[1]) / 2, z), 1, 'forward belt');
  assert.strictEqual(beltAt('airport', (B.rev[0] + B.rev[1]) / 2, z), -1, 'reverse belt');
  assert.strictEqual(B.fwd[1], B.rev[0], 'side by side');
  assert.ok(B.fwd[0] > 1, 'the middle of the corridor, where you start, is plain floor');
  assert.strictEqual(beltAt('airport', -5, z), 0, 'plain floor elsewhere');
  assert.strictEqual(beltAt('airport', B.fwd[0] + 0.5, B.start - 5), 0, 'before the stretch');
  assert.strictEqual(beltAt('airport', B.fwd[0] + 0.5, B.start + B.len + 3), 0, 'after the stretch');
  assert.strictEqual(beltAt('airport', B.fwd[0] + 0.5, B.start + B.every + 5), 1, 'the next stretch');
  assert.strictEqual(beltAt('nyc', 3, z), 0); assert.strictEqual(beltAt('shibuya', 3, z), 0);
  assert.strictEqual(onStrip('airport', 3.0, z), false, 'the old fast lane is gone from the airport');
});

function overGround(E, x, ticks) {
  const B = beltInfo('airport');
  E.S.px = x; E.S.pz = B.start + 8; E.S.vx = 0; E.S.race.bots.length = 0; E.S.nextChunk = 1e9;
  const z0 = E.S.pz;
  for (let i = 0; i < ticks; i++) { E.S.people.length = 0; E.S.px = x; E.tick(DT); }
  return (E.S.pz - z0) / (ticks * DT);
}
test('the forward belt carries you faster, the reverse belt carries you back, plain floor is normal', () => {
  const B = beltInfo('airport'), mid = r => (r[0] + r[1]) / 2;
  const plain = overGround(atGo(), -3, 45), fwd = overGround(atGo(), mid(B.fwd), 45), rev = overGround(atGo(), mid(B.rev), 45);
  assert.ok(fwd > plain + BELT_SPEED * 0.8, 'forward ' + fwd.toFixed(2) + ' vs ' + plain.toFixed(2));
  assert.ok(rev < plain - BELT_BACK * 0.8 && rev > plain - BELT_SPEED, 'reverse ' + rev.toFixed(2) + ' vs ' + plain.toFixed(2));
});

test('the speedometer counts the belt: S.belt is the belt speed you are on', () => {
  const B = beltInfo('airport'), E = atGo();
  overGround(E, (B.fwd[0] + B.fwd[1]) / 2, 5); assert.strictEqual(E.S.belt, BELT_SPEED);
  overGround(E, (B.rev[0] + B.rev[1]) / 2, 5); assert.strictEqual(E.S.belt, -BELT_BACK);
  overGround(E, -3, 5); assert.strictEqual(E.S.belt, 0);
});

test('belts are race only: classic ignores them', () => {
  const B = beltInfo('airport'), E = atGo(0, 'classic');
  E.S.px = (B.fwd[0] + B.fwd[1]) / 2; E.S.pz = B.start + 8;
  E.tick(DT); assert.ok(!E.S.belt);
});

test('people standing on a belt are carried along with it', () => {
  const B = beltInfo('airport'), E = atGo();
  E.S.people.length = 0; E.S.nextChunk = 1e9; E.S.race.bots.length = 0;
  E.S.px = -6; E.S.pz = B.start + 8;
  const p = E.mkPerson(3.9, B.start + 12); p.v0 = 0; p.vx = 0; p.vz = 0; const z0 = p.z;
  const q = E.mkPerson(-4, B.start + 12); q.v0 = 0; q.vx = 0; q.vz = 0; const zq = q.z;
  for (let i = 0; i < 30; i++) E.tick(DT);
  assert.ok(Math.abs((p.z - z0) - BELT_SPEED) < 0.25, 'rider moved ' + (p.z - z0).toFixed(2));
  assert.ok(Math.abs(q.z - zq) < 0.05, 'someone on plain floor did not');
});

test('riders keep to the right and pass on the left on the belt that goes your way, and nobody rides the reverse belt', () => {
  const B = beltInfo('airport'), E = atGo();
  E.S.pz = B.start + 70; E.tick(DT);   // the second walkway comes into view, so there is plenty to check
  const riders = E.S.people.filter(p => p.belt);
  assert.ok(riders.length >= 6, 'the crowd includes belt riders: ' + riders.length);
  const fwdStand = riders.filter(p => p.belt === 1 && p.v0 === 0), fwdWalk = riders.filter(p => p.belt === 1 && p.v0 > 0);
  assert.ok(fwdStand.length && fwdWalk.length, 'both kinds present on the forward belt');
  assert.strictEqual(riders.filter(p => p.belt === -1).length, 0, 'nobody rides the reverse belt');
  const mid = (a, b) => (a + b) / 2;
  assert.ok(fwdStand.every(p => p.x > mid(B.fwd[0], B.fwd[1])), 'forward belt: standers on the right (high x)');
  assert.ok(fwdWalk.every(p => p.x < mid(B.fwd[0], B.fwd[1]) && p.hz > 0), 'forward belt: walkers on the left, walking along');
  assert.ok(fwdStand.every(p => p.fz > 0), 'standers face the way their belt goes');
});

test('everyone meets the same riders (a friend race stays fair), and other modes have none', () => {
  const sig = E => E.S.people.filter(p => p.belt).map(p => [p.belt, p.v0 === 0, +p.x.toFixed(2), +p.z.toFixed(1)].join()).join('|');
  const a = atGo(), b = atGo();
  // seed both like a duel so the crowd is deterministic
  const d = () => { const E = load(); E.startDuel({ seed: 'AAAA:1', level: 0, friend: { name: 'P', look: {} }, send() {} }); return E; };
  assert.strictEqual(sig(d()), sig(d()), 'same seed, same riders');
  assert.ok(sig(d()).length > 20);
  const c = atGo(0, 'classic'); assert.ok(!c.S.people.some(p => p.belt), 'classic has no belt riders');
  const n = atGo(1); assert.ok(!n.S.people.some(p => p.belt), 'other stages have none');
});

test('bots ride the forward belt and are carried; they stay off the reverse belt more than Easy bots do', () => {
  const B = beltInfo('airport'), E = atGo();
  const b = E.S.race.bots[0]; b.x = (B.fwd[0] + B.fwd[1]) / 2; b.z = B.start + 8; b.speed = 0; b.vx = 0;
  const z0 = b.z; E.S.people.length = 0; E.S.nextChunk = 1e9;
  for (let i = 0; i < 30; i++) { E.S.people.length = 0; b.x = (B.fwd[0] + B.fwd[1]) / 2; E.tick(DT); }
  assert.ok(b.belt === BELT_SPEED, 'bot knows it is on the belt: ' + b.belt);
  assert.ok(b.z - z0 > BELT_SPEED * 0.8);
});

test('the walkway draws without errors, in view and from the side', () => {
  const B = beltInfo('airport'), E = atGo();
  for (const z of [B.start - 5, B.start + 3, B.start + 20, B.start + B.len - 2, B.start + B.len + 4]) for (const x of [-4, 0, 1, 3, 4.2]) { E.S.px = x; E.S.pz = z; E.tick(DT); E.render(); }
});

/* ---------- glass railings: once you are on the walkway you are locked in, but you can still change belts ---------- */
test('contain(): walls on the two outer edges only, inside the walkway stretch only', () => {
  const B = beltInfo('airport'), a = B.fwd[0], b = B.rev[1], z = B.start + 10, m = 0.22;
  assert.ok(contain('airport', 3, 0, z) >= a + m - 1e-9, 'inside cannot go out to the left');
  assert.ok(contain('airport', 3, 9, z) <= b - m + 1e-9, 'inside cannot go out to the right');
  assert.strictEqual(contain('airport', 3, 5.5, z), 5.5, 'inside can move between the belts and across the divider');
  assert.strictEqual(contain('airport', 3, 2.4, z), 2.4);
  assert.ok(contain('airport', 0, 4, z) <= a - m + 1e-9, 'outside on the left cannot get in through the glass');
  assert.ok(contain('airport', 6.3, 3, z) >= b + m - 1e-9, 'outside on the right cannot get in through the glass');
  assert.strictEqual(contain('airport', 0, 4, B.start - 3), 4, 'before the stretch there is no wall: you walk on at the start');
  assert.strictEqual(contain('airport', 3, 0, B.start + B.len + 3), 0, 'and you walk off at the end');
  assert.strictEqual(contain('nyc', 3, 0, z), 0); assert.strictEqual(contain('airport', 0, -3, z), -3, 'plain floor is free');
  assert.ok(Math.abs(contain('airport', a - 0.05, a + 1, z) - (a - 0.05)) < 1e-9, 'no sudden jump if you are right at the glass');
});

function press(E, x, key, ticks) {
  const B = beltInfo('airport');
  E.S.px = x; E.S.pz = B.start + 6; E.S.vx = 0; E.S.race.bots.length = 0; E.S.nextChunk = 1e9;
  E.keys[key] = true; E.keys.last = key;
  let min = 99, max = -99;
  for (let i = 0; i < ticks; i++) { E.S.people.length = 0; E.tick(DT); E.S.pz = Math.min(E.S.pz, B.start + B.len - 8); min = Math.min(min, E.S.px); max = Math.max(max, E.S.px); }
  E.keys[key] = false; return { min, max };
}
test('you steer into the glass and stay on the walkway, but you can swap belts', () => {
  const B = beltInfo('airport'), E = atGo();
  const left = press(E, 3, 'l', 90); assert.ok(left.min >= B.fwd[0] + 0.2 - 1e-6, 'left glass held you: ' + left.min.toFixed(2));
  const right = press(E, 3, 'r', 90); assert.ok(right.max <= B.rev[1] - 0.2 + 1e-6, 'right glass held you: ' + right.max.toFixed(2));
  assert.ok(right.max > B.rev[0] + 0.5, 'but you did cross the divider onto the other belt: ' + right.max.toFixed(2));
});
test('from outside you cannot walk through the glass, but you can step on at the start', () => {
  const B = beltInfo('airport'), E = atGo();
  const out = press(E, 1.0, 'r', 90); assert.ok(out.max < B.fwd[0], 'stayed outside: ' + out.max.toFixed(2));
  E.S.px = B.fwd[0] + 1; E.S.pz = B.start - 1; E.S.vx = 0; E.S.race.bots.length = 0; E.S.nextChunk = 1e9; E.keys.l = false;
  for (let i = 0; i < 60; i++) { E.S.people.length = 0; E.tick(DT); }
  assert.ok(E.S.belt !== 0, 'walking straight on at the start puts you on the belt');
});

test('bots are locked in too: one on the walkway told to go sideways stays inside', () => {
  const B = beltInfo('airport'), E = atGo(), b = E.S.race.bots[0];
  b.x = 3; b.z = B.start + 8; b.speed = 3; b.vx = -6; b.target = -5; b.thinkT = 99;
  for (let i = 0; i < 40; i++) { E.S.people.length = 0; b.thinkT = 99; b.target = -5; E.tick(DT); b.z = Math.min(b.z, B.start + B.len - 6); }
  assert.ok(b.x >= B.fwd[0] + 0.2 - 1e-6, 'bot held by the glass: ' + b.x.toFixed(2));
});

test('the crowd on the walkway is locked in as well', () => {
  const B = beltInfo('airport'), E = atGo();
  E.S.people.length = 0; E.S.nextChunk = 1e9; E.S.race.bots.length = 0; E.S.px = -6; E.S.pz = B.start + 4;
  const p = E.mkPerson(3, B.start + 12); p.vx = -3; p.vz = 0; p.v0 = 1; p.hx = -1; p.hz = 0;
  const q = E.mkPerson(1.0, B.start + 14); q.vx = 3; q.vz = 0; q.v0 = 1; q.hx = 1; q.hz = 0;
  for (let i = 0; i < 40; i++) { p.vx = -3; q.vx = 3; E.tick(DT); p.z = B.start + 12; q.z = B.start + 14; }
  assert.ok(p.x >= B.fwd[0] + 0.2 - 1e-6, 'rider stayed on: ' + p.x.toFixed(2));
  assert.ok(q.x <= B.fwd[0] - 0.2 + 1e-6, 'someone beside the glass did not get in: ' + q.x.toFixed(2));
});

test('nobody who crosses the corridor is generated inside the walkway stretches', () => {
  const B = beltInfo('airport'), E = atGo(); E.S.pz = B.start + 70; E.tick(DT);
  assert.ok(!E.S.people.some(p => p.free && p.z > B.start + B.every && p.z < B.start + B.every + B.len), 'no crossers inside the second walkway');
});
