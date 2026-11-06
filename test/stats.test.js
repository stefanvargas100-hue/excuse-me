// Race stats: build and gear types, race mode only. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');

const DT = 1 / 30;
const sumOf = e => e.speed + e.accel + e.rec;

function racer(look) {
  const E = load();
  Object.assign(E.LOOK, look);
  E.setLevel(0); E.start('race');
  for (let i = 0; i < 91; i++) E.tick(DT);   // through the countdown
  return E;
}
function runEmpty(E, ticks) { for (let i = 0; i < ticks; i++) { E.S.people.length = 0; if (E.S.race) E.S.race.bots.length = 0; E.S.nextChunk = 1e9; E.tick(DT); } }

test('builds: medium is balanced, large is fast with a little recovery, small accelerates but has less top speed', () => {
  const { BUILDS: B } = load();
  assert.strictEqual(sumOf(B.medium), 0);
  assert.strictEqual(B.medium.speed, 0);
  assert.ok(B.large.speed > 0 && B.large.rec > 0 && B.large.accel < 0);
  assert.ok(B.small.accel > 0 && B.small.speed < 0);
  assert.ok(B.large.h > B.medium.h && B.medium.h > B.small.h);
});

test('every item is a trade-off: none adds up to more than another, and head and back cannot be empty', () => {
  const { ITEM_STATS: I, BUILDS: B } = load();
  for (const b of Object.values(B)) assert.strictEqual(sumOf(b), 0);
  for (const slot of Object.keys(I)) for (const [name, e] of Object.entries(I[slot])) assert.strictEqual(sumOf(e), 0, slot + ' ' + name);
  for (const slot of ['hat', 'pack', 'shirtType', 'pantsType', 'shoeType']) assert.ok(!('none' in I[slot]), slot + ' has no empty choice');
});

test('colours never change stats, item types do', () => {
  const { statsOf } = load();
  const a = { build: 'medium', shirtType: 'tee', pantsType: 'jeans', shoeType: 'sneakers', hat: 'cap', pack: 'pack' };
  assert.deepStrictEqual(statsOf({ ...a, shirt: '#ff0000', pants: '#00ff00', shoe: '#0000ff', gear: '#123456' }), statsOf({ ...a, shirt: '#ffffff', pants: '#000000', shoe: '#222222', gear: '#654321' }));
  assert.notDeepStrictEqual(statsOf({ ...a, shoeType: 'runners' }), statsOf(a));
});

test('hiding the headpiece hides it on the character and keeps its stats', () => {
  const E = load();
  Object.assign(E.LOOK, { hat: 'headphones', showHead: '1' });
  const shown = E.statsOf(E.LOOK);
  E.reset(); assert.strictEqual(E.S.me.hat, 'headphones');
  E.LOOK.showHead = '0';
  E.reset(); assert.strictEqual(E.S.me.hat, 'none');
  assert.deepStrictEqual(E.statsOf(E.LOOK), shown);
});

test('shades count as a headpiece and draw as shades', () => {
  const E = load();
  Object.assign(E.LOOK, { hat: 'shades', showHead: '1' });
  E.reset();
  assert.strictEqual(E.S.me.face, 'shades');
  assert.strictEqual(E.S.me.hat, 'none');
});

test('race: a large build reaches a higher top speed than a small one', () => {
  const big = racer({ build: 'large' }), small = racer({ build: 'small' });
  runEmpty(big, 150); runEmpty(small, 150);
  assert.ok(big.S.speed > small.S.speed, big.S.speed.toFixed(3) + ' vs ' + small.S.speed.toFixed(3));
});

test('race: a small build gets up to speed faster from the start', () => {
  const big = racer({ build: 'large' }), small = racer({ build: 'small' });
  runEmpty(big, 6); runEmpty(small, 6);
  assert.ok(small.S.speed > big.S.speed, small.S.speed.toFixed(3) + ' vs ' + big.S.speed.toFixed(3));
});

test('race: recovery refills stamina faster and shortens a bump', () => {
  const slow = racer({ pantsType: 'shorts', shoeType: 'runners' }), fast = racer({ pantsType: 'cargo', shoeType: 'boots' });
  for (const E of [slow, fast]) { E.S.energy = 20; runEmpty(E, 30); }
  assert.ok(fast.S.energy > slow.S.energy, fast.S.energy.toFixed(1) + ' vs ' + slow.S.energy.toFixed(1));
  assert.ok(fast.S.race.me.bumpT < slow.S.race.me.bumpT);
});

test('classic ignores stats: a large and a small build walk exactly the same', () => {
  const run = build => {
    const E = load(); Object.assign(E.LOOK, { build, shoeType: build === 'large' ? 'runners' : 'slides' });
    E.setLevel(0); E.start('classic');
    E.keys.r = true; E.keys.last = 'r';
    runEmpty(E, 120);
    E.S.energy = 40; runEmpty(E, 30);
    return [E.S.speed, E.S.pz, E.S.px, E.S.energy];
  };
  assert.deepStrictEqual(run('large'), run('small'));
});

test('bots get a build and gear with the same stat rules', () => {
  const E = racer({});
  for (const b of E.S.race.bots) {
    assert.ok(['small', 'medium', 'large'].includes(b.build));
    assert.ok(b.st && b.st.speed > 0.9 && b.st.speed < 1.1);
  }
});

test('male and female have different stats and an equal trade-off', () => {
  const { BODIES: B, statsOf } = load();
  assert.notDeepStrictEqual(B.m, B.f);
  assert.strictEqual(sumOf(B.m), 0); assert.strictEqual(sumOf(B.f), 0);
  const look = { build: 'medium', shirtType: 'tee', pantsType: 'jeans', shoeType: 'sneakers', hat: 'cap', pack: 'pack' };
  const m = statsOf({ ...look, body: 'm' }), f = statsOf({ ...look, body: 'f' });
  assert.ok(m.speed > f.speed && f.rec > m.rec);
  assert.strictEqual(sumOf(m), sumOf(f));
});

test('race: body changes real speed and recovery, classic ignores it', () => {
  const m = racer({ body: 'm' }), f = racer({ body: 'f' });
  assert.ok(m.S.race.me.speed > f.S.race.me.speed);
  assert.ok(f.S.race.me.regen > m.S.race.me.regen);
  const run = body => { const E = load(); E.LOOK.body = body; E.setLevel(0); E.start('classic'); runEmpty(E, 90); return [E.S.speed, E.S.pz]; };
  assert.deepStrictEqual(run('m'), run('f'));
});

const plain = { body: 'm', build: 'medium', shirtType: 'tee', pantsType: 'jeans', shoeType: 'sneakers', hat: 'cap', pack: 'pack' };
const y2k = { ...plain, shirtType: 'baby', pantsType: 'flares', shoeType: 'platforms', hat: 'bucket', pack: 'fanny' };

test('fit check: starter clothes earn nothing, matching pieces earn more up to a full set', () => {
  const { fitOf } = load();
  assert.strictEqual(fitOf(plain).boost, 0);
  assert.strictEqual(fitOf({ ...plain, shirtType: 'baby', pantsType: 'flares' }).stylePts, 0, 'two pieces is not a look');
  assert.strictEqual(fitOf({ ...plain, shirtType: 'baby', pantsType: 'flares', shoeType: 'platforms' }).stylePts, 1);
  assert.strictEqual(fitOf({ ...y2k, pack: 'pack' }).stylePts, 2);
  assert.strictEqual(fitOf(y2k).stylePts, 3);
  assert.strictEqual(fitOf(y2k).boost, 3);
});

test('fit check: a mixed bag with a clear purpose earns a boost too, and the total never passes +3', () => {
  const { fitOf } = load();
  const mixed = { ...plain, shirtType: 'suit', pantsType: 'joggers', shoeType: 'runners' };   // three styles, all speed
  const f = fitOf(mixed);
  assert.ok(f.focusPts >= 1 && f.focus === 'Speed', JSON.stringify(f));
  assert.ok(f.stylePts === 0 && f.boost >= 1);
  const stacked = { ...plain, shirtType: 'jacket', pantsType: 'joggers', shoeType: 'runners', hat: 'visor', pack: 'sling' };
  assert.ok(fitOf(stacked).boost <= 3);
});

test('fit check adds to all three stats, in races only, and a hidden headpiece still counts', () => {
  const E = load();
  const off = E.statsOf({ ...y2k, pack: 'pack' }), on = E.statsOf(y2k);
  assert.ok(on.rec > off.rec - 1);
  assert.strictEqual(E.fitOf({ ...y2k, showHead: '0' }).boost, 3);
  const base = E.statsOf(plain), full = E.statsOf(y2k);
  assert.ok(full.speed + full.accel + full.rec > base.speed + base.accel + base.rec, 'a full set is worth more than plain clothes');
  const run = look => { const G = load(); Object.assign(G.LOOK, look); G.setLevel(0); G.start('classic'); for (let i = 0; i < 90; i++) { G.S.people.length = 0; G.S.nextChunk = 1e9; G.tick(DT); } return [G.S.speed, G.S.pz]; };
  assert.deepStrictEqual(run(plain), run(y2k));
});
