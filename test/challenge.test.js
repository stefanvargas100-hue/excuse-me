// B6: weekly challenge race. Everyone gets the same course and outfit for a UTC week; best time only; own board. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');
const DT = 1 / 30;

const MON = Date.UTC(2026, 10, 9, 0, 0, 0), SUN_END = Date.UTC(2026, 10, 15, 23, 59, 59, 999);   // a Monday 00:00 UTC, and the Sunday night after it
const D = ms => new Date(ms);
const begin = (date, seed) => { const E = load(undefined, { seed: seed || 3 }); E.startChallenge(date || D(MON + 3600000)); return E; };
const finish = E => { E.S.race.countT = 0; E.S.people.length = 0; for (let i = 0; i < 40; i++) E.tick(DT); E.S.pz = E.LV.goal + 1; for (let i = 0; i < 90; i++) E.tick(DT); };

test('the week is a UTC week: Monday 00:00 UTC to Sunday 23:59 UTC, whatever the phone clock says', () => {
  const E = load();
  const w = E.utcWeekKey;
  assert.strictEqual(w(D(MON)), w(D(SUN_END)));
  assert.notStrictEqual(w(D(MON - 1)), w(D(MON)));
  assert.notStrictEqual(w(D(SUN_END + 1)), w(D(SUN_END)));
  assert.match(w(D(MON)), /^\d{4}-W\d{2}$/);
});

test('time remaining counts down to the next Monday 00:00 UTC', () => {
  const E = load();
  assert.strictEqual(E.challengeRemainingMs(D(MON)), 7 * 86400000);
  assert.strictEqual(E.challengeRemainingMs(D(SUN_END + 1 - 3600000)), 3600000);
});

test('the same week always gives the same course, outfit and seed; other weeks differ; New York is never used', () => {
  const E = load();
  const a = E.challengeFor('2026-W46'), b = E.challengeFor('2026-W46');
  assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
  const weeks = Array.from({ length: 40 }, (_, i) => E.challengeFor('2026-W' + String(i + 1).padStart(2, '0')));
  assert.ok(new Set(weeks.map(c => c.seed)).size === 40);
  assert.ok(new Set(weeks.map(c => JSON.stringify(c.outfit))).size > 20, 'outfits vary');
  assert.ok(weeks.every(c => E.LEVELS[c.level].id !== 'nyc'), 'only courses whose crowd is fully seeded');
  assert.ok(new Set(weeks.map(c => c.level)).size === 2, 'both airport and Shibuya come up');
});

test('the run is a solo timed race: no bots, no pickups, countdown, locked seed and supplied outfit', () => {
  const E = begin();
  assert.strictEqual(E.S.run.category, 'challenge');
  assert.strictEqual(E.S.race.bots.length, 0); assert.strictEqual(E.S.race.pickups.length, 0);
  assert.strictEqual(E.S.race.countT, 3, 'normal countdown');
  const c = E.S.challenge; assert.ok(c.week && c.rules === 1);
  assert.strictEqual(E.S.seed, c.seed);
});

test('different phones get the same course, the same stats and the same crowd', () => {
  const sig = seed => { const E = begin(undefined, seed); return JSON.stringify([E.S.race.me, E.S.me.build, E.S.me.shirtType, E.S.people.map(p => [+p.x.toFixed(3), +p.z.toFixed(3)])]); };
  assert.strictEqual(sig(1), sig(99));
});

test('your equipped gear and saved outfit change nothing about the challenge, and are untouched afterwards', () => {
  const A = load(undefined, { seed: 3 }), B = load(undefined, { seed: 3 });
  B.LOOK.hat = 'crown'; B.LOOK.build = 'strong'; B.LOOK.shirtType = 'suit';
  const savedB = JSON.stringify(B.LOOK);
  A.startChallenge(D(MON + 1000)); B.startChallenge(D(MON + 1000));
  assert.strictEqual(JSON.stringify(A.S.race.me), JSON.stringify(B.S.race.me));
  assert.strictEqual(A.S.me.hat, B.S.me.hat);
  B.toMenu(); assert.strictEqual(JSON.stringify(B.LOOK), savedB); assert.strictEqual(B.storage.excuseme_look, undefined);
});

test('random crowd events, rivals and rush hour are off, so nobody gets a different crowd by running differently', () => {
  const E = begin(); E.S.race.countT = 0;
  for (let i = 0; i < 900; i++) E.tick(DT);
  assert.strictEqual(E.S.evN, 0); assert.strictEqual(E.S.rush, false);
  assert.ok(!E.S.people.some(p => p.rival && p.rs !== 'cruise' && p.cuts > 0));
});

test('finishing stores a best time under the challenge key only; slower runs do not replace it; nothing else is paid', () => {
  const E = begin(); const xp0 = E.xp(), races0 = E.tallyOf('races');
  finish(E);
  const week = E.S.challenge.week, key = 'excuseme_wchal_' + week + ':challenge:r1';
  const t1 = parseFloat(E.storage[key]); assert.ok(t1 > 0, 'stored ' + E.storage[key]);
  assert.strictEqual(E.xp(), xp0); assert.strictEqual(E.tallyOf('races'), races0);
  assert.strictEqual(E.storage['excuseme_race_best_airport:rt1'], undefined); assert.ok(!Object.keys(E.storage).some(k => /ghost/.test(k)));
  E.storage[key] = '1.00';
  E.startChallenge(D(MON + 1000)); finish(E);
  assert.strictEqual(E.storage[key], '1.00', 'a slower run does not replace a faster best');
});

test('retrying is free and does not touch the one-try daily and weekly runs', () => {
  const E = begin(); finish(E); E.restartRun(); finish(E);
  assert.strictEqual(E.hasPlayed('daily'), false); assert.strictEqual(E.hasPlayed('weekly'), false);
  assert.ok(!Object.keys(E.storage).some(k => /excuseme_played/.test(k)));
});

test('quitting mid-run records and submits nothing', () => {
  const E = begin(); E.S.race.countT = 0; for (let i = 0; i < 200; i++) E.tick(DT);
  const before = JSON.stringify(E.storage); E.quitRun(); E.toMenu();
  assert.strictEqual(JSON.stringify(E.storage), before);
});

test('a run is filed under the week it started, even if the finish is after the weekly reset', () => {
  const E = begin(D(SUN_END - 20000));   // 20 seconds before the reset
  const week = E.S.challenge.week;
  finish(E);
  assert.ok(E.storage['excuseme_wchal_' + week + ':challenge:r1'], 'filed under the starting week');
  assert.strictEqual(week, E.utcWeekKey(D(MON)), 'the starting week is the one that ended');
});

test('server score encoding: lower time is a higher score; implausible times are refused; submission is off until the database update is applied', () => {
  const E = load();
  assert.ok(E.encodeChallengeTime(48230) > E.encodeChallengeTime(51000));
  assert.strictEqual(E.decodeChallengeTime(E.encodeChallengeTime(48230)), 48230);
  assert.strictEqual(E.validChallengeTime(48230), true);
  for (const ms of [0, 5000, 19999, 600001, NaN, -3]) assert.strictEqual(E.validChallengeTime(ms), false, String(ms));
  assert.strictEqual(E.challengeSubmitEnabled, false);
  assert.strictEqual(E.boardNameFor('2026-W46', 1), 'wchal:2026-W46:r1');
});
