const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness.js');

// A line is a forward chain of three active bots, with each adjacent pair
// separated by less than 7 m forward and 0.6 m sideways.
function inLine(bots) {
  const active = bots.filter(b => !b.done).sort((a, b) => a.z - b.z);
  return active.some((a, i) => active.slice(i + 1).some((b, j) =>
    b.z > a.z && b.z - a.z < 7 && Math.abs(b.x - a.x) < 0.6 &&
    active.slice(i + j + 2).some(c => c.z > b.z && c.z - b.z < 7 && Math.abs(c.x - b.x) < 0.6)));
}

test('Hard bots form lines in fewer than 40% of first-third frames on Fifth Avenue', () => {
  let lines = 0, frames = 0;
  for (const seed of [1, 2, 3, 4, 5]) {
    const E = load(undefined, { seed });
    E.storage.excuseme_botlvl = '2';
    E.setLevel(1);
    // Use the seven-bot field, then clear Cup metadata: eight racers total.
    E.start('race', undefined, { cup: { model: { bots: [] } } });
    E.S.cup = null;
    const samples = [];
    for (let i = 0; i < 600 * 60 && !E.S.race.bots.every(b => b.done); i++) {
      E.S.pz = Math.max(0, Math.min(...E.S.race.bots.filter(b => !b.done).map(b => b.z)) - 20); // Follow the rear bot without finishing.
      E.tick(1 / 60);
      if (E.S.race.countT <= 0) samples.push(inLine(E.S.race.bots));
    }
    assert.ok(E.S.race.bots.every(b => b.done), 'all bots finish within ten minutes');
    const third = Math.floor(samples.length / 3);
    lines += samples.slice(0, third).filter(Boolean).length;
    frames += third;
  }
  assert.ok(lines / frames < 0.4, `first-third line share ${(100 * lines / frames).toFixed(2)}%`);
});
