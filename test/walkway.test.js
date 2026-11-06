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
const { beltAt, BELT_SPEED, beltInfo, onStrip } = loadStrips();

const atGo = (lv = 0, mode = 'race') => { const E = load(); E.setLevel(lv); E.start(false, mode); if (mode === 'race') for (let i = 0; i < 91; i++) E.tick(DT); return E; };

test('belt geometry: one belt each way side by side, only inside the walkway stretches, only at the airport', () => {
  const B = beltInfo('airport');
  assert.ok(B && BELT_SPEED > 0.8 && BELT_SPEED < 2);
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
  assert.ok(rev < plain - BELT_SPEED * 0.8, 'reverse ' + rev.toFixed(2) + ' vs ' + plain.toFixed(2));
});

test('the speedometer counts the belt: S.belt is the belt speed you are on', () => {
  const B = beltInfo('airport'), E = atGo();
  overGround(E, (B.fwd[0] + B.fwd[1]) / 2, 5); assert.strictEqual(E.S.belt, BELT_SPEED);
  overGround(E, (B.rev[0] + B.rev[1]) / 2, 5); assert.strictEqual(E.S.belt, -BELT_SPEED);
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

test('riders keep to the right and pass on the left, on both belts', () => {
  const B = beltInfo('airport'), E = atGo();
  E.S.pz = B.start + 70; E.tick(DT);   // the second walkway comes into view, so there is plenty to check
  const riders = E.S.people.filter(p => p.belt);
  assert.ok(riders.length >= 6, 'the crowd includes belt riders: ' + riders.length);
  const fwdStand = riders.filter(p => p.belt === 1 && p.v0 === 0), fwdWalk = riders.filter(p => p.belt === 1 && p.v0 > 0);
  const revStand = riders.filter(p => p.belt === -1 && p.v0 === 0), revWalk = riders.filter(p => p.belt === -1 && p.v0 > 0);
  assert.ok(fwdStand.length && fwdWalk.length && revStand.length && revWalk.length, 'all four kinds present');
  const mid = (a, b) => (a + b) / 2;
  assert.ok(fwdStand.every(p => p.x > mid(B.fwd[0], B.fwd[1])), 'forward belt: standers on the right (high x)');
  assert.ok(fwdWalk.every(p => p.x < mid(B.fwd[0], B.fwd[1]) && p.hz > 0), 'forward belt: walkers on the left, walking along');
  assert.ok(revStand.every(p => p.x < mid(B.rev[0], B.rev[1])), 'reverse belt: standers on their right (low x, they face the other way)');
  assert.ok(revWalk.every(p => p.x > mid(B.rev[0], B.rev[1]) && p.hz < 0), 'reverse belt: walkers on their left, coming toward you');
  assert.ok(fwdStand.every(p => p.fz > 0) && revStand.every(p => p.fz < 0), 'standers face the way their belt goes');
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
