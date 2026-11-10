// Race power-ups: rare pickups on the track. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');
const DT = 1 / 30;

function atGo(level = 0) { const E = load(); E.setLevel(level); E.start(false, 'race'); for (let i = 0; i < 91; i++) E.tick(DT); return E; }
// Puts one pickup of a given type right in front of the player and clears the crowd, so only the pickup matters.
function offer(E, type) {
  E.S.people.length = 0; E.S.race.bots.length = 0; E.S.nextChunk = 1e9;
  const pk = { x: E.S.px, z: E.S.pz + 1.2, type, taken: false };
  E.S.race.pickups.length = 0; E.S.race.pickups.push(pk);
  return pk;
}
function run(E, ticks) { for (let i = 0; i < ticks; i++) { E.S.people.length = 0; E.tick(DT); } }

test('a race has a few pickups spread along the stage, none near the start, same every time', () => {
  for (const lv of [0, 1, 2]) {
    const E = atGo(lv), P = E.S.race.pickups;
    assert.ok(P.length >= 4 && P.length <= 10, 'level ' + lv + ' count ' + P.length);
    assert.ok(P.every(p => p.z >= 50 && p.z <= E.LV.goal - 40), 'inside the track');
    for (let i = 1; i < P.length; i++) assert.ok(P[i].z - P[i - 1].z >= 40, 'spaced out');
    assert.ok(P.every(p => ['boost', 'refill', 'clear'].includes(p.type)));
    const again = atGo(lv).S.race.pickups;
    const key = a => JSON.stringify(a.map(p => [p.z, p.x, p.type]));
    assert.strictEqual(key(again), key(P));
  }
});

test('Classic pickups do not fabricate race state', () => {
  const E = load(); E.setLevel(0); E.start(false, 'classic');
  assert.ok(!E.S.race, 'Classic keeps its own mode state');
  assert.ok(E.S.pickups.length > 0, 'Classic has its own pickup lifecycle');
});

test('walking onto a boost pickup makes you faster for about 3.5 seconds, then it wears off', () => {
  const E = atGo(); const pk = offer(E, 'boost');
  assert.strictEqual(E.powerMul(E.S), 1);
  run(E, 20);
  assert.ok(pk.taken, 'collected');
  assert.ok(E.powerMul(E.S) >= 1.55, 'faster: ' + E.powerMul(E.S));
  run(E, 120);
  assert.strictEqual(E.powerMul(E.S), 1, 'wears off');
});

test('a refill pickup tops up stamina', () => {
  const E = atGo(); E.S.energy = 5; offer(E, 'refill'); run(E, 20);
  assert.ok(E.S.energy > 90, 'stamina ' + E.S.energy);
});

test('a clear-path pickup lets you walk through people for a moment', () => {
  const E = atGo(); offer(E, 'clear'); run(E, 20);
  assert.ok(E.S.ghostT > 1, 'ghost time ' + E.S.ghostT);
  const bumps = E.S.bumps;
  const p = E.mkPerson(E.S.px, E.S.pz + 0.3); p.vz = 0; p.vx = 0;
  E.tick(DT);
  assert.strictEqual(E.S.bumps, bumps, 'no bump while clear');
});

test('a pickup is only collected once, and bots can grab it too', () => {
  const E = atGo(); const b = E.S.race.bots[0]; E.S.race.bots.splice(1);   // just one bot, so nobody else can take it
  E.S.people.length = 0; E.S.nextChunk = 1e9;
  const pk = { x: b.x, z: b.z + 0.8, type: 'refill', taken: false };
  E.S.race.pickups.length = 0; E.S.race.pickups.push(pk);
  b.energy = 10; E.S.px = b.x > 0 ? -6 : 6;   // the player stays well clear, so only the bot can take it
  for (let i = 0; i < 15; i++) { E.S.people.length = 0; E.tick(DT); }
  assert.ok(pk.taken, 'the bot took it');
  assert.ok(b.energy > 60, 'and got the stamina: ' + b.energy);
});
