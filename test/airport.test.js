// Airport stage: scenery you have to weave around, a readable "weave" crowd with marked gaps, and a baggage cart crossing. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');
const DT = 1 / 30;

const SCENERY = ['desk', 'chairs', 'bin', 'plant', 'trolleys'];
function airport(kind) { const E = load(); E.setLevel(0); E.start(kind || 'classic'); E.S.people.length = 0; return E; }
function chunks(E, to) { for (let z = 0; z < to; z += 4) E.genChunk(z); }
const props = E => E.S.people.filter(p => SCENERY.includes(p.prop));

// the widest stretch of open floor on the row at z, counting every prop circle and both walls
function widestGap(E, z) {
  const lim = 6.65, blocked = [];
  for (const p of E.S.people) for (const c of p.circles || []) {
    if (!p.prop || Math.abs(p.z + (c.oz || 0) - z) > 0.6 + c.r) continue;
    blocked.push([p.x + c.ox - c.r, p.x + c.ox + c.r]);
  }
  blocked.sort((a, b) => a[0] - b[0]);
  let edge = -lim, best = 0;
  for (const [a, b] of blocked) { best = Math.max(best, a - edge); edge = Math.max(edge, b); }
  return Math.max(best, lim - edge);
}

test('the airport has scenery in the walkway: desks, benches, bins, plants and trolleys', () => {
  const E = airport(); chunks(E, 500);
  const ps = props(E);
  assert.ok(ps.length >= 10, 'scenery on a 500 m stretch: ' + ps.length);
  for (const k of ['desk', 'chairs', 'bin', 'plant', 'trolleys']) assert.ok(ps.some(p => p.prop === k), 'has ' + k);
  assert.ok(ps.every(p => p.circles.length > 0), 'every piece can be bumped into');
});

test('scenery never fills the opening stretch and always leaves a gap you can fit through', () => {
  const E = airport(); chunks(E, 500);
  const ps = props(E);
  assert.ok(ps.every(p => p.z >= 20), 'nothing in the first 20 m');
  for (const p of ps) assert.ok(widestGap(E, p.z) >= 1.5, p.prop + ' at ' + p.z.toFixed(0) + ' m leaves ' + widestGap(E, p.z).toFixed(2) + ' m');
});

test('in a race the scenery stays off the moving walkway', () => {
  const E = airport('race'); chunks(E, 500);
  for (const p of props(E)) for (const c of p.circles) {
    const x = p.x + c.ox, z = p.z + (c.oz || 0), onBeltZ = z > 30 && (z - 30) % 100 < 46;
    assert.ok(!(onBeltZ && x + c.r > 1.9 && x - c.r < 5.9), p.prop + ' on the belt at ' + z.toFixed(0));
  }
});

test('New York and Tokyo get no airport scenery', () => {
  for (const lv of [1, 2]) { const E = load(); E.setLevel(lv); E.start('classic'); E.S.people.length = 0; chunks(E, 300); assert.strictEqual(props(E).length, 0, 'stage ' + lv); }
});

test('the airport scenery is the same for everyone on a daily run', () => {
  const a = airport(), b = airport();
  a.S.seed = b.S.seed = 'daily-test'; chunks(a, 300); chunks(b, 300);
  const sig = E => props(E).map(p => p.prop + ':' + p.x.toFixed(2) + ':' + p.z.toFixed(1)).join('|');
  assert.ok(sig(a).length > 0);
  assert.strictEqual(sig(a), sig(b));
});

test('a weave is rows of oncoming people whose gap snakes left and right, with the gaps marked', () => {
  const E = airport();
  E.runEvent('weave');
  const fl = E.S.flows; assert.ok(fl && fl.length === 1, 'one flow registered');
  const rows = fl[0].rows;
  assert.ok(rows.length >= 5, 'rows: ' + rows.length);
  for (let i = 1; i < rows.length; i++) assert.ok(Math.abs(rows[i].gx - rows[i - 1].gx) <= 2.2, 'the gap moves a little each row, so you can read the pattern');
  for (const r of rows) {
    assert.ok(r.gx > -5.5 && r.gx < 5.5, 'gap inside the walkway');
    const mine = E.S.people.filter(p => !p.prop && Math.abs(p.z - r.z) < 0.5 && p.hz < 0);
    assert.ok(mine.length >= 4, 'a row of people: ' + mine.length);
    assert.ok(mine.every(p => Math.abs(p.x - r.gx) >= 0.9), 'the gap is clear of people');
  }
});

test('a baggage cart crosses the walkway side to side and is gone afterwards', () => {
  const E = airport();
  E.runEvent('cart');
  const cart = E.S.people.find(p => p.prop === 'cart2');
  assert.ok(cart && cart.drive, 'a driving cart');
  const side = Math.sign(cart.drive);
  assert.ok(Math.abs(cart.x) > 7, 'starts outside the wall');
  cart.z = E.S.pz + 12;   // bring it to the player so the test is quick
  const x0 = cart.x;
  for (let i = 0; i < 60; i++) { cart.z = E.S.pz + 12; E.tick(DT); }   // the player walks on, so keep the cart beside them
  assert.ok((cart.x - x0) * side > 3, 'it moved across: ' + (cart.x - x0).toFixed(1));
  for (let i = 0; i < 30 * 12; i++) { cart.z = E.S.pz + 12; E.tick(DT); }
  assert.ok(cart.dead, 'gone once it left the far side');
});

test('the airport event list includes the new events', () => {
  const E = airport();
  assert.ok(E.LEVELS[0].events.includes('weave') && E.LEVELS[0].events.includes('cart'));
});

test('drawing the airport scenery, a weave and a driving cart does not throw', () => {
  const E = airport(); chunks(E, 200);
  E.runEvent('weave'); E.runEvent('cart');
  for (const p of E.S.people) if (p.prop === 'cart2') p.z = E.S.pz + 8;
  for (let i = 0; i < 40; i++) { for (const p of E.S.people) if (!p.prop) p.dead = true; E.tick(DT); E.render(); }
});
