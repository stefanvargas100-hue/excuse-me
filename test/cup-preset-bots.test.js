const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness.js');
const DT = 1 / 30;
for (const level of [2, 6]) for (const seed of [1, 2, 3]) {
  test(`Tokyo level ${level} seed ${seed}: seven Medium bots finish within 600 seconds`, () => {
    const E = load(undefined, { seed });
    E.storage.excuseme_botlvl = '1';
    E.setLevel(level);
    E.start('race', undefined, { cup: { model: { bots: [] } } });
    E.S.cup = null;
    assert.equal(E.S.race.bots.length, 7);
    for (let i = 0; i < 600 / DT && !E.S.race.bots.every(b => b.done); i++) {
      // Follow the rear bot so the full generated course stays active, without ending the player's race.
      E.S.pz = Math.max(0, Math.min(...E.S.race.bots.filter(b => !b.done).map(b => b.z)) - 20);
      E.tick(DT);
    }
    const times = E.S.race.bots.map(b => b.done ? Number(b.finishT.toFixed(3)) : null);
    console.log(JSON.stringify({ level, seed, times }));
    assert.ok(E.S.race.bots.every(b => b.done), `level ${level}, seed ${seed}, times ${JSON.stringify(times)}`);
  });
}
