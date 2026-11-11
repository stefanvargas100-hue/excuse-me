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
const playCup = (E, aheads = [0, 0, 0, 0]) => { finish(E, aheads[0]); E.nextCupRound(); finish(E, aheads[1]); E.nextCupRound(); finish(E, aheads[2]); E.nextCupRound(); finish(E, aheads[3]); };

test('a cup starts a bot race on Fifth Avenue as a cup run with seven bots and a countdown', () => {
  const E = begin();
  assert.equal(E.LV.id, 'nyc'); assert.equal(E.S.mode, 'race'); assert.equal(E.S.run.category, 'cup');
  assert.equal(E.S.race.bots.length, 7); assert.ok(E.S.race.countT > 0);
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

test('rounds run Fifth Avenue, Subway Platform, Central Park, Brooklyn Bridge with the same bots and the same outfit', () => {
  const E = begin(), ids = [], names = [], outfits = [];
  const note = () => { ids.push(E.LV.id); names.push(E.S.race.bots.map(b => b.name).join()); outfits.push(JSON.stringify(E.S.run.outfit)); };
  note(); finish(E); E.nextCupRound(); note(); finish(E); E.nextCupRound(); note(); finish(E); E.nextCupRound(); note();
  assert.deepEqual(ids, ['nyc', 'subway', 'park', 'bridge']);
  assert.equal(new Set(names).size, 1, names.join(' | ')); assert.equal(new Set(outfits).size, 1);
  assert.equal(E.S.cup.round, 3);
});

test('a completed cup pays XP once by final place and keeps a separate personal best', () => {
  const E = begin(), xp0 = E.xp(), races0 = E.tallyOf('races');
  playCup(E);
  const c = E.cupState();
  assert.equal(c.rounds.length, 4); assert.equal(c.done, true); assert.equal(c.place, 1);
  assert.equal(E.xp() - xp0, 60); assert.equal(E.S.xpGained, 60);
  assert.equal(E.tallyOf('races'), races0, 'rounds do not feed ordinary unlock progress');
  const key = 'excuseme_cup_nyc:r3', saved = E.storage[key];
  assert.match(saved, /^40:\d+\.\d\d$/);
  assert.ok(!Object.keys(E.storage).some(k => /race_best|ghost/.test(k)));
  E.nextCupRound(); E.tick(DT);   // no fifth round, and nothing more is paid
  assert.equal(E.xp() - xp0, 60); assert.equal(E.cupState().rounds.length, 4);
});

test('a worse cup does not replace the best; a better one does', () => {
  const E = begin();
  E.storage['excuseme_cup_nyc:r3'] = '40:1.00';
  playCup(E);
  assert.equal(E.storage['excuseme_cup_nyc:r3'], '40:1.00', 'same points but slower');
  const F = begin(); F.storage['excuseme_cup_nyc:r3'] = '12:999.00';
  playCup(F, [1, 1, 1, 1]);   // second every round: 32 points
  assert.match(F.storage['excuseme_cup_nyc:r3'], /^32:/);
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
  E.nextCupRound(); finish(E); E.nextCupRound(); finish(E); E.nextCupRound(); finish(E);
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

// Bundle the real boundary helper without changing the game test entry point.
const levelCode = require('esbuild').buildSync({ entryPoints: [require('node:path').join(__dirname, '../src/config/levels.js')], bundle: true, format: 'iife', globalName: 'levels', write: false }).outputFiles[0].text;
const levels = require('node:vm').runInNewContext(levelCode + '; levels');
test('every Cup round has seven consistent bots', () => {
  const E = begin(), names = E.S.race.bots.map(b => b.name);
  assert.equal(names.length, 7); assert.equal(new Set(names).size, 7);
  for (let round = 0; round < 4; round++) {
    assert.deepEqual(E.S.race.bots.map(b => b.name), names);
    assert.equal(E.S.race.bots.length, 7);
    if (round < 3) { finish(E); E.nextCupRound(); }
  }
});
test('Cup standings contain all eight racers', () => {
  const E = begin(); finish(E);
  assert.equal(E.cupState().table.length, 8);
});
test('all eight starters fit and do not overlap on every Cup stage', () => {
  const E = begin();
  for (let round = 0; round < 4; round++) {
    levels.setLevel([1, 5, 3, 4][round]);
    const racers = [{ x: E.S.px, z: E.S.pz, circles: E.S.me.circles }, ...E.S.race.bots];
    assert.equal(racers.length, 8);
    for (const r of racers) assert.ok(Math.abs(r.x) <= levels.halfAt(r.z) - 0.5);
    for (let i = 0; i < racers.length; i++) for (let j = i + 1; j < racers.length; j++) {
      const a = racers[i], b = racers[j];
      for (const ac of a.circles) for (const bc of b.circles) {
        assert.ok(Math.hypot(a.x + ac.ox - b.x - bc.ox, a.z + (ac.oz || 0) - b.z - (bc.oz || 0)) >= ac.r + bc.r, 'starter collision');
      }
    }
    if (round < 3) { finish(E); E.nextCupRound(); }
  }
});
test('ordinary Race vs bots retains three bots', () => {
  const E = load(undefined, { seed: 3 }); E.start('race');
  assert.equal(E.S.race.bots.length, 3);
});
test('previous rules best remains stored under its old key', () => {
  const E = begin(); E.storage['excuseme_cup_nyc:r2'] = '30:1.00'; playCup(E);
  assert.equal(E.storage['excuseme_cup_nyc:r2'], '30:1.00');
  assert.match(E.storage['excuseme_cup_nyc:r3'], /^40:/);
});

test('nobody gets a head start: every Cup racer starts level with the player', () => {
  const E = begin();
  for (let round = 0; round < 4; round++) {
    for (const b of E.S.race.bots) assert.ok(Math.abs(b.z - E.S.pz) <= 0.3, b.name + ' starts ' + (E.S.pz - b.z) + ' m behind');
    finish(E); if (round < 3) E.nextCupRound();
  }
});

test('round award and cumulative Cup points remain distinct over multiple rounds',()=>{
 const E=load(undefined,{seed:3,dom:true});E.startCup();finish(E);
 assert.equal(E.element('sChain').previousElementSibling.textContent,'Round points');
 assert.equal(E.element('sChain').textContent,'+10 points');
 E.nextCupRound();finish(E,1);
 assert.equal(E.element('sChain').textContent,'+8 points');
 assert.match(E.element('sBest').textContent,/18/);
});
