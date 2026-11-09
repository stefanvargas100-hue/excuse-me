// NYC Cup batch 1: the pure scoring model. node --test
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const { load } = require('./harness');
const C = load(path.join(__dirname, 'entries/cup-entry.js'));
const J = x => JSON.parse(JSON.stringify(x));
const round = (place, time = 60) => ({ place, time });

test('the cup is Fifth Avenue, Central Park, Brooklyn Bridge in that order, on stable stage indexes', () => {
  assert.deepEqual([...C.CUP_STAGES], [1, 3, 4]);
});

test('round points cover all eight places', () => {
  assert.deepEqual(J([1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(C.pointsFor)), [10, 8, 6, 5, 4, 3, 2, 1, 0, 0]);
});

test('a cup totals points and time, one round at a time, and is complete after three', () => {
  let c = C.newCup({ seed: 's', bots: ['Mia', 'Leo', 'Ava'] });
  assert.equal(c.rounds.length, 0); assert.equal(C.cupDone(c), false);
  c = C.addRound(c, round(1, 70)); c = C.addRound(c, round(2, 80));
  assert.equal(C.cupDone(c), false);
  c = C.addRound(c, round(4, 90));
  assert.equal(C.cupDone(c), true);
  assert.deepEqual(J([C.cupPoints(c), C.cupTime(c), C.cupWins(c)]), [23, 240, 1]);
  assert.throws(() => C.addRound(c, round(1)), /complete/, 'a fourth round is refused');
});

test('addRound does not change the cup it was given', () => {
  const c = C.newCup({ seed: 's', bots: [] }), d = C.addRound(c, round(1));
  assert.equal(c.rounds.length, 0); assert.equal(d.rounds.length, 1);
});

test('cup place: points, then round wins, then the final round, then earlier finisher by total time', () => {
  const a = { name: 'You', points: 22, wins: 1, last: 2, time: 200 };
  assert.deepEqual(J(C.rankRows([{ name: 'B', points: 15, wins: 0, last: 1, time: 1 }, a]).map(r => r.name)), ['You', 'B']);
  const w1 = { name: 'W1', points: 20, wins: 2, last: 4, time: 300 }, w0 = { name: 'W0', points: 20, wins: 1, last: 1, time: 100 };
  assert.deepEqual(J(C.rankRows([w0, w1]).map(r => r.name)), ['W1', 'W0'], 'wins break a points tie');
  const l1 = { name: 'L1', points: 20, wins: 1, last: 1, time: 300 }, l3 = { name: 'L3', points: 20, wins: 1, last: 3, time: 100 };
  assert.deepEqual(J(C.rankRows([l3, l1]).map(r => r.name)), ['L1', 'L3'], 'a better final-round finish (lower place) breaks it next');
  const t1 = { name: 'T1', points: 20, wins: 1, last: 2, time: 100 }, t2 = { name: 'T2', points: 20, wins: 1, last: 2, time: 90 };
  assert.deepEqual(J(C.rankRows([t1, t2]).map(r => r.name)), ['T2', 'T1']);
});

test('the cup table adds up every racer across rounds and ranks them', () => {
  let c = C.newCup({ seed: 's', bots: ['Mia', 'Leo', 'Ava'] });
  const board = (me, ...bots) => [{ name: 'You', me: true, place: me }, ...bots.map((p, i) => ({ name: ['Mia', 'Leo', 'Ava'][i], place: p }))];
  c = C.addRound(c, { place: 1, time: 61, board: board(1, 2, 3, 4) });
  c = C.addRound(c, { place: 2, time: 62, board: board(2, 1, 3, 4) });
  const t = C.cupTable(c);
  assert.deepEqual(J(t.map(r => [r.name, r.points])), [['Mia', 18], ['You', 18], ['Leo', 12], ['Ava', 10]]);
  assert.equal(t[0].name, 'Mia', 'level on points and wins: the better final round (Mia 1st, you 2nd) decides');
});

test('cup rewards: XP by final place, a completed cup only', () => {
  assert.deepEqual(J([1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(C.cupXp)), [60, 45, 35, 25, 20, 15, 10, 5, 0, 0]);
});

test('best cup: more points wins, then lower total time; a cup with fewer rounds never counts', () => {
  const mk = (p, t) => ({ points: p, time: t });
  assert.equal(C.betterCup(mk(25, 300), null), true);
  assert.equal(C.betterCup(mk(25, 300), mk(24, 100)), true);
  assert.equal(C.betterCup(mk(24, 100), mk(25, 300)), false);
  assert.equal(C.betterCup(mk(25, 290), mk(25, 300)), true);
  assert.equal(C.betterCup(mk(25, 300), mk(25, 300)), false, 'equal is not a new best');
  assert.equal(C.encodeCup(mk(25, 291.37)), '25:291.37');
  assert.deepEqual(J(C.decodeCup('25:291.37')), mk(25, 291.37));
  assert.equal(C.decodeCup('garbage'), null);
});
