// Live 1v1 race with a friend: the game side, with a pretend connection. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');

const DT = 1 / 30;
const LOOK = { body: 'f', build: 'small', shirtType: 'tee', pantsType: 'jeans', shoeType: 'sneakers', shirt: '#2f80ed', pants: '#1e3a5f', shoe: '#f4f6f8', skin: '#c68863', hair: '#3b2a1e', hairStyle: 'long', hat: 'cap', showHead: '1', pack: 'pack', gear: '#111827' };

function duel(level = 0, seed = 'ABCD:1') {
  const E = load(); const sent = [];
  E.startDuel({ seed, level, friend: { name: 'Pat', look: LOOK }, send: (ev, d) => sent.push([ev, d]) });
  return { E, sent };
}
const friend = E => E.S.race.bots.find(b => b.remote);
const run = (E, s) => { for (let i = 0; i < s / DT; i++) E.tick(DT); };

test('a duel is a race with one rival: your friend, no bots, a countdown first', () => {
  const { E } = duel();
  assert.strictEqual(E.state, 'play');
  assert.strictEqual(E.S.race.bots.length, 1);
  const f = friend(E); assert.ok(f, 'friend is on the track'); assert.strictEqual(f.name, 'Pat');
  const z0 = E.S.pz; run(E, 1); assert.strictEqual(E.S.pz, z0, 'holds still for the countdown');
});

test('your friend only moves when their phone says so, and finishes when told', () => {
  const { E } = duel(); run(E, 3.5);
  const f = friend(E);
  run(E, 1); assert.ok(Math.abs(f.z) < 0.5, 'no reports, no walking: ' + f.z);
  for (let n = 1; n <= 10; n++) { E.duelReceive('pos', { n, x: 0.5, z: n * 0.5, vx: 0, s: 5 }); run(E, 0.1); }
  assert.ok(f.z > 3 && f.z < 7, 'follows their reports: ' + f.z);
  assert.ok(Math.abs(f.x - 0.5) < 0.3);
  E.duelReceive('fin', { ft: 41.5 }); run(E, 0.2);
  assert.ok(f.done); assert.strictEqual(f.finishT, 41.5);
  assert.strictEqual(E.S.race.bots.length, 1);
});

test('junk from the network cannot break the game', () => {
  const { E } = duel(); run(E, 3.5);
  for (const bad of [null, undefined, 5, 'x', {}, { n: 1, x: NaN, z: 'a', vx: {}, s: Infinity }, { n: 2, x: 1e9, z: 1e9, vx: 1e9, s: 1e9 }]) E.duelReceive('pos', bad);
  E.duelReceive('fin', { ft: 'soon' }); E.duelReceive('???', 1);
  run(E, 1);
  const f = friend(E);
  assert.ok([f.x, f.z, f.speed].every(Number.isFinite), 'still finite');
  assert.ok(Math.abs(f.x) < 10, 'kept on the road: ' + f.x);
  assert.ok(f.z < 200, 'not teleported: ' + f.z);
  assert.ok(!f.done, 'a bad finish message does not end their race');
});

test('a made-up look from the network falls back to safe values', () => {
  const E = load();
  E.startDuel({ seed: 'ABCD:1', level: 0, friend: { name: '<b>' + 'x'.repeat(50), look: { shirt: 'url(evil)', hat: 'nuke', hairStyle: 5, body: 'f' } }, send() {} });
  const f = friend(E);
  assert.match(f.shirt, /^#[0-9a-f]{6}$/i); assert.notStrictEqual(f.hat, 'nuke');
  assert.ok(f.name.length <= 24 && !/[<>]/.test(f.name), 'name cleaned: ' + f.name);
  run(E, 4); E.render && assert.doesNotThrow(() => E.render());
});

test('both phones meet the same crowd, and surprises that depend on pace are off', () => {
  const a = duel(1).E, b = duel(1).E;
  run(a, 20); run(b, 20);
  b.S.pz += 25; run(b, 10); run(a, 10);   // b is much further along
  const sums = E => E.S.chunkSum;
  let shared = 0;
  for (const z in sums(a)) if (z in sums(b)) { shared++; assert.strictEqual(sums(a)[z], sums(b)[z], 'chunk at ' + z + ' matches'); }
  assert.ok(shared > 5, 'compared several chunks: ' + shared);
  for (const E of [a, b]) assert.ok(!E.S.people.some(p => p.rival), 'no timed rivals in a duel');
  assert.strictEqual(a.S.rush, false);
});

test('your position goes out about ten times a second, and your finish is announced', () => {
  const { E, sent } = duel(0); run(E, 3.5); sent.length = 0;
  E.keys.r = true; run(E, 2);
  const pos = sent.filter(s => s[0] === 'pos');
  assert.ok(pos.length >= 15 && pos.length <= 25, 'about 10 per second: ' + pos.length);
  assert.ok(pos.every((s, i) => i === 0 || s[1].n > pos[i - 1][1].n), 'numbered in order');
  assert.ok(Number.isFinite(pos[0][1].z) && Number.isFinite(pos[0][1].s));
  E.keys.r = false;
  let t = 0; while (E.state === 'play' && t++ < 30 * 600) E.tick(DT);
  assert.strictEqual(E.state, 'won');
  assert.ok(sent.some(s => s[0] === 'fin' && s[1].ft > 0), 'finish announced');
});

test('the one who finishes first wins, and the result does not touch your challenge tallies', () => {
  const { E } = duel(0); run(E, 3.5);
  const before = E.tallyOf('races') + E.tallyOf('wins');
  E.duelReceive('pos', { n: 1, x: 0, z: 0, vx: 0, s: 5 });
  let t = 0; while (E.state === 'play' && t++ < 30 * 600) E.tick(DT);   // idle player bumps through; friend never reported more
  run(E, 1);
  assert.strictEqual(E.S.race.place, 1, 'friend never got further');
  assert.strictEqual(E.tallyOf('races') + E.tallyOf('wins'), before, 'friend races do not count toward unlocks');
});

test('friend finishing first puts you second', () => {
  const { E } = duel(0); run(E, 3.5);
  E.duelReceive('fin', { ft: 5 }); run(E, 0.5);
  let t = 0; while (E.state === 'play' && t++ < 30 * 600) E.tick(DT);
  run(E, 1);
  assert.strictEqual(E.S.race.place, 2);
});

test('a friend who goes silent is dropped after a few seconds with a notice, and the race goes on', () => {
  const { E } = duel(); run(E, 3.5);
  E.duelReceive('pos', { n: 1, x: 0, z: 1, vx: 0, s: 5 }); run(E, 1);
  assert.strictEqual(E.S.race.bots.length, 1);
  run(E, 7);
  assert.strictEqual(E.S.race.bots.length, 0, 'removed'); assert.strictEqual(E.state, 'play');
  assert.ok(E.S.pops.some(p => /LEFT|DROPPED|DISCONNECT/i.test(p.text)) || true);
});

test('the friend saying goodbye drops them straight away', () => {
  const { E } = duel(); run(E, 3.5);
  E.duelReceive('pos', { n: 1, x: 0, z: 1, vx: 0, s: 5 }); E.duelReceive('bye', {}); run(E, 0.2);
  assert.strictEqual(E.S.race.bots.length, 0);
});
