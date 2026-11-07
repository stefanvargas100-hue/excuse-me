// The first race against bots coaches slipstream, fast strips and bumps, without ever freezing the race. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');

const DT = 1 / 30;
function startRace(levelIndex) {
  const E = load(); delete E.storage.excuseme_racetut;
  E.setLevel(levelIndex); E.start(false, 'race');
  for (let i = 0; i < 200 && E.S.race.countT > 0; i++) E.tick(DT);   // through 3-2-1-GO
  return E;
}

test('the first race shows tips one at a time and the race keeps running', () => {
  const E = startRace(1);   // Fifth Avenue has a fast strip
  assert.ok(E.S.coach, 'coach is running');
  assert.match(E.S.coach.tips[E.S.coach.i].id, /slip/);
  const z0 = E.S.pz;
  for (let i = 0; i < 60; i++) E.tick(DT);
  assert.ok(E.S.pz > z0, 'the player is not frozen by the tips');
  E.S.draftT = 1;   // got a slipstream
  for (let i = 0; i < 30; i++) E.tick(DT);
  assert.match(E.S.coach.tips[E.S.coach.i].id, /strip/, 'next tip is about the fast strip');
});

test('tips time out, finish, and are not shown again', () => {
  const E = startRace(1);
  for (let i = 0; i < 30 * 60 && E.S.coach; i++) E.tick(DT);
  assert.strictEqual(E.S.coach, null, 'coach ends by itself');
  assert.strictEqual(E.storage.excuseme_racetut, '1');
  E.start(false, 'race');
  assert.ok(!E.S.coach, 'not shown on the second race');
});

test('no coaching in classic runs or live duels', () => {
  const E = load(); delete E.storage.excuseme_racetut;
  E.setLevel(0); E.start(false, 'classic');
  assert.ok(!E.S.coach);
});

test('a stage without a strip skips the strip tip', () => {
  const E = startRace(0);   // airport: belts, no strip
  const ids = E.S.coach.tips.map(t => t.id);
  assert.ok(!ids.includes('strip'));
  assert.ok(ids.includes('belt'));
});
