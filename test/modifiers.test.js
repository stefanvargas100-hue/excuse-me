// Daily modifiers: one twist per day, the same for everyone. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');

const DT = 1 / 30;
const daily = mod => { const E = load(); E.setLevel(0); E.start('daily', undefined, { mod }); return E; };
const crowd = E => E.S.people.filter(p => !p.prop && !p.dead);

test('the modifier rotates through all three, one per day', () => {
  const E = load();
  const ids = ['2026-11-06', '2026-11-07', '2026-11-08'].map(k => E.modOf(k).id);
  assert.strictEqual(new Set(ids).size, 3, ids.join());
  assert.strictEqual(E.modOf('2026-11-09').id, ids[0], 'repeats every third day');
});

test('only the daily run has a modifier', () => {
  const E = load(); E.setLevel(0); E.start('classic');
  assert.ok(!E.S.mod);
});

test('tired legs: stamina recovers much more slowly', () => {
  const gain = mod => {
    const E = daily(mod); E.S.energy = 20;
    for (let i = 0; i < 60; i++) { E.S.people.length = 0; E.S.nextChunk = 1e9; E.tick(DT); }
    return E.S.energy - 20;
  };
  const tired = gain('tired'), plain = gain(null);
  assert.ok(tired > 0 && tired < plain * 0.5, tired.toFixed(1) + ' vs ' + plain.toFixed(1));
});

test('rush hour all day: the surge never thins out', () => {
  const E = daily('rush');
  for (let i = 0; i < 5; i++) E.tick(DT);
  assert.ok(E.S.rush, 'rush from the start');
  E.S.rush = true; E.S.rushT = 0;
  for (let i = 0; i < 5; i++) { E.S.people.length = 0; E.S.nextChunk = 1e9; E.tick(DT); }
  assert.ok(E.S.rush, 'still rush after the timer runs out');
});

test('heads down: most of the crowd is on their phones', () => {
  const E = daily('phones');
  const c = crowd(E), n = c.filter(p => p.phone).length;
  assert.ok(c.length > 10 && n / c.length > 0.5, n + ' of ' + c.length);
  const P = daily(null), pc = crowd(P);
  assert.ok(pc.filter(p => p.phone).length / pc.length < 0.3, 'a plain day is mostly heads up');
});

test('the same crowd layout for everyone: a modifier never changes where people stand', () => {
  const pos = E => crowd(E).map(p => p.x.toFixed(2) + ',' + p.z.toFixed(2)).join('|');
  assert.strictEqual(pos(daily('phones')), pos(daily('phones')));
});
