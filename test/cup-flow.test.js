// NYC Cup batch 2: playing a cup through the real game loop. node --test
const test = require('node:test'), assert = require('node:assert/strict');
const { load } = require('./harness');
const DT = 1 / 30;
const begin = seed => { const E = load(undefined, { seed: seed || 3 }); E.startCup(); return E; };
// Finish the current round: `ahead` bots cross the line first, then the player does.
const finish = (E, ahead = 0) => {
  E.S.race.countT = 0; E.S.people.length = 0; for (let i = 0; i < 10; i++) E.tick(DT);
  for (let i = 0; i < ahead; i++) E.S.race.bots[i].z = E.LV.goal - 0.1;
  for (let i = 0; i < 4; i++) E.tick(DT);
  E.S.pz = E.LV.goal + 1; for (let i = 0; i < 90; i++) E.tick(DT);
};
const playCup = (E, aheads = [0, 0, 0]) => { finish(E, aheads[0]); E.nextCupRound(); finish(E, aheads[1]); E.nextCupRound(); finish(E, aheads[2]); };

test('a cup starts a bot race on Fifth Avenue as a cup run with three bots and a countdown', () => {
  const E = begin();
  assert.equal(E.LV.id, 'nyc'); assert.equal(E.S.mode, 'race'); assert.equal(E.S.run.category, 'cup');
  assert.equal(E.S.race.bots.length, 3); assert.ok(E.S.race.countT > 0);
  assert.deepEqual(JSON.parse(JSON.stringify(E.S.run.policy)), { xp: false, progress: false, records: false, scores: false, ghosts: false });
  assert.equal(E.cupState().round, 0); assert.equal(E.cupState().rounds.length, 0);
});

test('finishing a round scores it but pays, records and tallies nothing', () => {
  const E = begin(), xp0 = E.xp(), races0 = E.tallyOf('races'), wins0 = E.tallyOf('wins');
  finish(E, 1);
  assert.equal(E.state, 'won'); assert.equal(E.cupState().rounds.length, 1);
  assert.equal(E.cupState().rounds[0].place, 2);
  assert.equal(E.xp(), xp0); assert.equal(E.tallyOf('races'), races0); assert.equal(E.tallyOf('wins'), wins0);
  assert.ok(!Object.keys(E.storage).some(k => /race_best|ghost|cup/.test(k)), Object.keys(E.storage).join());
});

test('rounds run Fifth Avenue, Central Park, Brooklyn Bridge with the same bots and the same outfit', () => {
  const E = begin(), ids = [], names = [], outfits = [];
  const note = () => { ids.push(E.LV.id); names.push(E.S.race.bots.map(b => b.name).join()); outfits.push(JSON.stringify(E.S.run.outfit)); };
  note(); finish(E); E.nextCupRound(); note(); finish(E); E.nextCupRound(); note();
  assert.deepEqual(ids, ['nyc', 'park', 'bridge']);
  assert.equal(new Set(names).size, 1, names.join(' | ')); assert.equal(new Set(outfits).size, 1);
  assert.equal(E.S.cup.round, 2);
});

test('a completed cup pays XP once by final place and keeps a separate personal best', () => {
  const E = begin(), xp0 = E.xp(), races0 = E.tallyOf('races');
  playCup(E);
  const c = E.cupState();
  assert.equal(c.rounds.length, 3); assert.equal(c.done, true); assert.equal(c.place, 1);
  assert.equal(E.xp() - xp0, 60); assert.equal(E.S.xpGained, 60);
  assert.equal(E.tallyOf('races'), races0, 'rounds do not feed ordinary unlock progress');
  const key = 'excuseme_cup_nyc:r1', saved = E.storage[key];
  assert.match(saved, /^30:\d+\.\d\d$/);
  assert.ok(!Object.keys(E.storage).some(k => /race_best|ghost/.test(k)));
  E.nextCupRound(); E.tick(DT);   // no fourth round, and nothing more is paid
  assert.equal(E.xp() - xp0, 60); assert.equal(E.cupState().rounds.length, 3);
});

test('a worse cup does not replace the best; a better one does', () => {
  const E = begin();
  E.storage['excuseme_cup_nyc:r1'] = '30:1.00';
  playCup(E);
  assert.equal(E.storage['excuseme_cup_nyc:r1'], '30:1.00', 'same points but slower');
  const F = begin(); F.storage['excuseme_cup_nyc:r1'] = '12:999.00';
  playCup(F, [1, 1, 1]);   // second every round: 21 points
  assert.match(F.storage['excuseme_cup_nyc:r1'], /^21:/);
  assert.equal(F.cupState().newBest, true);
});

test('abandoning a cup at any point records and pays nothing and leaves no cup behind', () => {
  const E = begin(); finish(E); E.nextCupRound(); E.S.race.countT = 0; for (let i = 0; i < 100; i++) E.tick(DT);
  const before = JSON.stringify(E.storage), xp0 = E.xp();
  E.pauseGame(); E.quitRun(); E.toMenu();
  assert.equal(JSON.stringify(E.storage), before); assert.equal(E.xp(), xp0); assert.equal(E.cupState(), null);
});

test('there is no restart inside a cup, and Race again after a finished cup starts a fresh one', () => {
  const E = begin(); finish(E);
  E.restartRun(); assert.equal(E.cupState().rounds.length, 1, 'mid-cup restart does nothing');
  E.nextCupRound(); finish(E); E.nextCupRound(); finish(E);
  assert.equal(E.cupState().done, true);
  E.restartRun();
  assert.equal(E.cupState().rounds.length, 0); assert.equal(E.LV.id, 'nyc'); assert.equal(E.state, 'play');
});

test('the saved outfit is untouched and the cup ignores later changes to it', () => {
  const E = begin(), saved = JSON.stringify(E.LOOK), snap = JSON.stringify(E.S.run.outfit);
  assert.ok(snap.includes(E.LOOK.body));
  finish(E); E.nextCupRound();
  assert.equal(JSON.stringify(E.S.run.outfit), snap);
  E.toMenu(); assert.equal(JSON.stringify(E.LOOK), saved); assert.equal(E.storage.excuseme_look, undefined);
});

test('the cup is repeatable: the same seed gives the same crowd in a round', () => {
  const sig = () => { const E = begin(7); E.S.race.countT = 0; for (let i = 0; i < 30; i++) E.tick(DT); return E.S.people.slice(0, 12).map(p => p.x.toFixed(2) + ':' + p.z.toFixed(1)).join(); };
  assert.equal(sig(), sig());
});
