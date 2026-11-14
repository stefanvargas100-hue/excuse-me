// Batch 25: solo Tokyo and Airport Cups beside the New York Cup. node --test
const test = require('node:test'), assert = require('node:assert/strict');
const { load } = require('./harness');
const C = require('node:vm').runInNewContext(require('esbuild').buildSync({ entryPoints: [require('node:path').join(__dirname, '../src/sim/cup.js')], bundle: true, format: 'iife', globalName: 'cup', write: false }).outputFiles[0].text + '; cup');
const DT = 1 / 30;
const finish = (E, ahead = 0) => {
  E.S.race.countT = 0; E.S.people.length = 0; for (let i = 0; i < 10; i++) E.tick(DT);
  for (let i = 0; i < ahead; i++) E.S.race.bots[i].z = E.LV.goal - 0.1;
  for (let i = 0; i < 4; i++) E.tick(DT);
  E.S.pz = E.LV.goal + 1; for (let i = 0; i < 90; i++) E.tick(DT);
};
const ORDER = { tokyo: ['shibuya', 'takeshita', 'tsukiji', 'skytree'], airport: ['airport', 'security', 'baggage', 'gatechange'] };
const NAME2 = { tokyo: 'Takeshita Street', airport: 'Security Lanes' };
const KEY = { tokyo: 'excuseme_cup_tokyo:r4', airport: 'excuseme_cup_airport:r4' };

for (const [name, city] of [['tokyo', 'Tokyo'], ['airport', 'Airport']]) {
  test(name + ' Cup plays 4 rounds in order against 7 bots, pays XP, saves to its own key', () => {
    const E = load(undefined, { seed: 3 }); E.storage['excuseme_cup_nyc:r4'] = '99:1.00';
    const xp0 = E.xp(); E.startCup(city);
    const ids = [], names = [];
    for (let r = 0; r < 4; r++) {
      ids.push(E.LV.id); names.push(E.S.race.bots.map(b => b.name).join());
      assert.equal(E.S.race.bots.length, 7); assert.equal(E.S.run.category, 'cup');
      assert.equal(E.S.run.seed, E.S.cup.model.seed + ':round' + r);
      finish(E); if (r < 3) E.nextCupRound();
    }
    assert.deepEqual(ids, ORDER[name]); assert.equal(new Set(names).size, 1);
    const c = E.cupState(); assert.equal(c.done, true); assert.equal(c.rounds.length, 4); assert.equal(c.place, 1);
    assert.equal(E.xp() - xp0, 60);
    assert.match(E.storage[KEY[name]], /^40:\d+\.\d\d$/);
    assert.equal(E.storage['excuseme_cup_nyc:r4'], '99:1.00', 'NYC best untouched');
    E.nextCupRound(); assert.equal(E.cupState().rounds.length, 4);
  });
  test(name + ' Cup labels use the Cup name, and Race again starts the same Cup', () => {
    const E = load(undefined, { seed: 3, dom: true }); E.startCup(city); finish(E);
    assert.equal(E.element('endEyebrow').textContent.startsWith(city + ' Cup · round 1 of 4'), true, E.element('endEyebrow').textContent);
    assert.equal(E.element('next').textContent, 'Next round: ' + NAME2[name]);
    for (let r = 1; r < 4; r++) { E.nextCupRound(); finish(E); }
    assert.match(E.element('endTitle').textContent, new RegExp('Cup winner|in the ' + city + ' Cup'));
    E.restartRun(); assert.equal(E.LV.id, ORDER[name][0]); assert.equal(E.cupState().rounds.length, 0);
  });
  test(name + ' Cup is a new best only against its own saved best', () => {
    const E = load(undefined, { seed: 3 }); E.storage[KEY[name]] = '99:1.00'; E.storage['excuseme_cup_nyc:r4'] = '99:1.00';
    for (const other of ['tokyo', 'airport']) if (other !== name) E.storage[KEY[other]] = '1:999.00';
    E.startCup(city); for (let r = 0; r < 4; r++) { finish(E); if (r < 3) E.nextCupRound(); }
    assert.equal(E.cupState().newBest, false); assert.equal(E.storage[KEY[name]], '99:1.00'); assert.equal(E.storage['excuseme_cup_nyc:r4'], '99:1.00');
    for (const other of ['tokyo', 'airport']) if (other !== name) assert.equal(E.storage[KEY[other]], '1:999.00');
    E.storage[KEY[name]] = '1:999.00'; E.restartRun(); for (let r = 0; r < 4; r++) { finish(E); if (r < 3) E.nextCupRound(); }
    assert.equal(E.cupState().newBest, true); assert.match(E.storage[KEY[name]], /^40:/);
  });
}

test('the New York Cup keeps its stage order, run identity and record key', () => {
  assert.deepEqual([...C.CUP_STAGES], [1, 5, 3, 4]); assert.equal(C.CUP_RULES, 4);
  const E = load(undefined, { seed: 3 }); E.startCup();
  assert.deepEqual(['nyc', 'subway', 'park', 'bridge'].map((id, r) => { if (r) { finish(E); E.nextCupRound(); } return E.LV.id === id; }), [true, true, true, true]);
  assert.equal(E.S.run.category, 'cup'); assert.equal(E.S.run.rules, 4);
  assert.equal(E.S.run.seed, E.S.cup.model.seed + ':round3');
  finish(E); assert.match(E.storage['excuseme_cup_nyc:r4'], /^40:/);
  assert.equal(Object.keys(E.storage).filter(k => /cup_(tokyo|airport)/.test(k)).length, 0);
  E.startCup('New York'); assert.equal(E.LV.id, 'nyc');
});

test('cupDone uses the Cup\'s own stage count', () => {
  const c = C.newCup({ seed: 'x', bots: ['a'], stages: [0, 9, 10, 11, 5] });
  let m = c; for (let i = 0; i < 4; i++) { assert.equal(C.cupDone(m), false); m = C.addRound(m, { place: 1, time: 1 }); }
  m = C.addRound(m, { place: 1, time: 1 }); assert.equal(C.cupDone(m), true);
  assert.equal(C.cupDone(C.newCup({ seed: 'x', bots: [] })), false);
});
