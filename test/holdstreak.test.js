// Hold both thumbs to say "Excuse me"; three close calls in a row give a short speed boost. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');
const DT = 1 / 30;

function going(kind) { const E = load(); E.setLevel(0); E.start(kind || 'classic'); for (let i = 0; i < 100; i++) E.tick(DT); E.S.people.length = 0; E.S.nextChunk = 1e9; return E; }
const passBy = (E, dx) => { const p = E.mkPerson(E.S.px + dx, E.S.pz - 0.1); E.onPass(p); return p; };

test('holding both thumbs down for a moment says "Excuse me" once', () => {
  const E = going();
  assert.strictEqual(E.S.shoutCD, 0);
  E.touches.set(1, 'L'); E.touches.set(2, 'R');
  for (let i = 0; i < 4; i++) E.tick(DT);     // 0.13 s: too short, that is just a double tap
  assert.strictEqual(E.S.shoutCD, 0, 'not yet');
  for (let i = 0; i < 6; i++) E.tick(DT);     // 0.33 s in total
  assert.ok(E.S.shoutCD > 5, 'shouted: ' + E.S.shoutCD);
  assert.strictEqual(E.tallyOf('shouts') >= 1, true);
  const cd = E.S.shoutCD;
  E.tick(DT);
  assert.ok(E.S.shoutCD <= cd, 'does not shout again while the thumbs stay down');
});

test('one thumb held down never shouts, and the shout works again after letting go', () => {
  const E = going();
  E.touches.set(1, 'L');
  for (let i = 0; i < 30; i++) E.tick(DT);
  assert.strictEqual(E.S.shoutCD, 0, 'steering with one thumb is not a shout');
  E.touches.set(2, 'R');
  for (let i = 0; i < 12; i++) E.tick(DT);
  assert.ok(E.S.shoutCD > 0);
  E.touches.clear(); E.S.shoutCD = 0; E.tick(DT);   // a frame passes while both thumbs are up
  E.touches.set(3, 'L'); E.touches.set(4, 'R');
  for (let i = 0; i < 12; i++) E.tick(DT);
  assert.ok(E.S.shoutCD > 0, 'a second hold shouts again');
});

test('three close calls within a few seconds give a short speed boost, in classic too', () => {
  const E = going('classic');
  assert.ok(!(E.S.streakT > 0));
  passBy(E, 0.8); passBy(E, 0.8);
  assert.ok(!(E.S.streakT > 0), 'two are not enough');
  passBy(E, 0.8);
  assert.ok(E.S.streakT > 1, 'third close call starts the boost: ' + E.S.streakT);
  const z0 = E.S.pz; for (let i = 0; i < 30; i++) E.tick(DT);
  assert.ok(E.S.speed > 0);
});

test('a wide pass in between neither counts nor breaks the streak', () => {
  const E = going('classic');
  passBy(E, 0.8); passBy(E, 2.0); passBy(E, 0.8);
  assert.ok(!(E.S.streakT > 0), 'only two close calls so far');
  passBy(E, 0.8);
  assert.ok(E.S.streakT > 0, 'the third close call triggers it');
});

test('close calls that are far apart in time do not add up', () => {
  const E = going('classic');
  passBy(E, 0.8); passBy(E, 0.8);
  for (let i = 0; i < 30 * 8; i++) E.tick(DT);
  E.S.people.length = 0;
  passBy(E, 0.8);
  assert.ok(!(E.S.streakT > 0), 'the old close calls expired');
});
