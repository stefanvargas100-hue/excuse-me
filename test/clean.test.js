// B1: clean-race rewards. Every 100 m without a bump is a clean segment; the bonus is paid once, on finishing. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');
const DT = 1 / 30;

function atGo(run) { const E = load(); E.setLevel(0); E.start('race', undefined, run ? { run } : undefined); for (let i = 0; i < 91; i++) E.tick(DT); E.S.people.length = 0; return E; }
// walk the player straight ahead with nobody around, cheating the speed so the distance is exact
const walk = (E, metres, speed = 6) => { const goal = E.S.clean.walked + metres; for (let i = 0; i < 4000 && E.S.clean.walked < goal; i++) { E.S.people.length = 0; E.S.speed = speed; E.S.boostV = 0; E.tick(DT); E.S.people.length = 0; } };
const bumpMe = E => { const p = E.mkPerson(E.S.px, E.S.pz + 0.3); E.S.people.push(p); E.S.bumpCool = 0; E.raceCollide(DT); E.S.people.length = 0; };

test('countdown, a standstill and a pause earn nothing', () => {
  const E = load(); E.setLevel(0); E.start('race');
  for (let i = 0; i < 60; i++) E.tick(DT);               // still counting down
  assert.strictEqual(E.S.clean.dist, 0);
  for (let i = 0; i < 91; i++) E.tick(DT);
  E.S.people.length = 0;
  const d0 = E.S.clean.dist; E.stepClean(0); E.stepClean(-5); assert.strictEqual(E.S.clean.dist, d0, 'no distance, no change');
  E.pauseGame(); const d = E.S.clean.dist; for (let i = 0; i < 60; i++) E.tick(DT);
  assert.strictEqual(E.S.clean.dist, d);
});

test('100 clean metres is one segment worth +2 XP, then +4, +6', () => {
  const E = atGo();
  walk(E, 95); assert.strictEqual(E.S.clean.segs, 0);
  walk(E, 10); assert.strictEqual(E.S.clean.segs, 1); assert.strictEqual(E.S.clean.bonus, 2);
  walk(E, 100); assert.strictEqual(E.S.clean.segs, 2); assert.strictEqual(E.S.clean.bonus, 6);
  walk(E, 100); assert.strictEqual(E.S.clean.bonus, 12);
});

test('crossing several thresholds in one tick pays each once', () => {
  const E = atGo();
  E.stepClean(250);                                       // one huge step
  assert.strictEqual(E.S.clean.segs, 2); assert.strictEqual(E.S.clean.bonus, 6);
  assert.ok(E.S.clean.dist >= 49 && E.S.clean.dist < 51, 'remainder carried: ' + E.S.clean.dist);
});

test('a bump resets the distance and the tier but keeps earned segments', () => {
  const E = atGo();
  walk(E, 210); assert.strictEqual(E.S.clean.segs, 2); assert.strictEqual(E.S.clean.bonus, 6);
  walk(E, 50); bumpMe(E);
  assert.ok(E.S.bumps >= 1);
  assert.strictEqual(E.S.clean.dist, 0); assert.strictEqual(E.S.clean.segs, 2); assert.strictEqual(E.S.clean.bonus, 6);
  walk(E, 105); assert.strictEqual(E.S.clean.segs, 3); assert.strictEqual(E.S.clean.bonus, 8, 'tier restarted at +2');
});

test('the bonus is capped at 50 XP', () => {
  const E = atGo();
  E.stepClean(100 * 40);
  assert.strictEqual(E.S.clean.bonus, 50);
});

test('finishing pays the bonus once, on top of the usual race XP', () => {
  const E = atGo();
  walk(E, 220);
  const before = E.xp();
  E.S.pz = E.LV.goal + 1; for (let i = 0; i < 90; i++) E.tick(DT);
  const bonus = E.S.clean.bonus; assert.strictEqual(bonus, 6);
  assert.strictEqual(E.S.xpGained, 6 + (E.S.race.place === 1 ? 5 : 0) + bonus);
  assert.ok(E.xp() - before >= E.S.xpGained, 'an unlock can add more');
  const once = E.xp(); for (let i = 0; i < 90; i++) E.tick(DT); assert.strictEqual(E.xp(), once);
});

test('leaving a race without finishing pays nothing', () => {
  const E = atGo(); walk(E, 220); const before = E.xp();
  E.quitRun(); E.toMenu();
  assert.strictEqual(E.xp(), before);
});

test('practice runs pay no clean bonus', () => {
  const E = atGo({ category: 'practice' }); walk(E, 220);
  E.S.pz = E.LV.goal + 1; for (let i = 0; i < 90; i++) E.tick(DT);
  assert.strictEqual(E.S.xpGained || 0, 0);
});

test('a friend race records segments and the medal but pays no XP', () => {
  const E = load(); E.setLevel(0);
  E.start('race', undefined, { duel: { seed: 's1', friend: 'f', title: 'F', send() {}, order: [], peers: {}, slotOf: { me: 0 }, count: 1, meId: 'me', pausers: new Set(), managed: true, sendEvery: 1, sendT: 1, n: 0 } });
  for (let i = 0; i < 5; i++) E.tick(DT);
  E.stepClean(130); assert.strictEqual(E.S.clean.segs, 1);
  assert.strictEqual(E.cleanBonusFor(E.S), 0, 'no XP in friend rooms');
});
