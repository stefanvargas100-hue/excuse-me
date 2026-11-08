// Obstacle hitboxes match what is drawn: you only hit a bench, bike rack, barrier or taxi when you touch the part you can see. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');

// The solid part of each obstacle as drawn in render/figures.js drawProp, in metres from the prop's position: [x0, x1, z0, z1].
// Roofs and canopies above head height do not count; anything at body height does.
const B = (hx, hz) => [-hx, hx, -hz, hz];
const FOOT = {
  lamp: B(0.13, 0.13), signal: B(0.15, 0.15), tree: B(0.2, 0.2), trash: B(0.28, 0.28), hydrant: B(0.18, 0.18),
  cart: B(0.45, 1.0), board: B(0.3, 0.12), desk: B(1.42, 0.52), barrier: B(0.95, 0.1), newsstand: B(1.0, 0.65),
  bench: B(0.7, 0.26), shelter: [-0.35, 0.02, -1.45, 1.45], trashbags: [-0.55, 0.58, -0.36, 0.45], vending: B(0.4, 0.37),
  asign: B(0.3, 0.15), gatedesk: B(0.55, 1.4), benchz: [-0.32, 0.3, -1.0, 1.0], chairs: B(1.0, 0.3), bin: B(0.3, 0.3),
  plant: B(0.4, 0.4), trolleys: B(0.74, 0.3), wetfloor: B(0.25, 0.12),
  // a rack is as wide as its bikes, plus handlebars
  bikes: p => { const xs = p.circles.map(c => c.ox); return [Math.min(...xs) - 0.15, Math.max(...xs) + 0.15, -0.45, 0.45]; },
  // vehicles reach back from the front bumper at x, away from the way they drive
  van: p => p.dirx > 0 ? [-4.6, 0, -0.7, 0.7] : [0, 4.6, -0.7, 0.7],
  taxi: p => p.dirx > 0 ? [-4.4, 0, -0.7, 0.7] : [0, 4.4, -0.7, 0.7],
  cart2: p => p.dirx > 0 ? [-3.05, 0.55, -0.5, 0.5] : [-0.55, 3.05, -0.5, 0.5]
};

function propsOf(lv) {
  const E = load(); E.setLevel(lv); E.start('classic'); E.S.people.length = 0;
  for (let z = 0; z < 900; z += 4) E.genChunk(z);
  for (const k of lv === 0 ? ['cart', 'cleaners'] : lv === 1 ? ['van', 'taxi'] : ['van', 'taxi']) { E.runEvent(k); E.runEvent(k); }
  return E.S.people.filter(p => p.prop && p.prop !== 'spill' && p.circles.length);
}

const ALL = [0, 1, 2].flatMap(propsOf);

test('every obstacle kind on the three maps is checked', () => {
  const kinds = new Set(ALL.map(p => p.prop));
  for (const k of kinds) assert.ok(FOOT[k], 'no drawn size listed for ' + k);
  for (const k of ['tree', 'bench', 'bikes', 'barrier', 'shelter', 'newsstand', 'taxi', 'van', 'cart2', 'desk', 'chairs', 'wetfloor', 'vending', 'asign']) assert.ok(kinds.has(k), 'saw ' + k);
});

test('no hitbox reaches past the side of what is drawn (so passing close beside never counts as a hit)', () => {
  const bad = [];
  for (const p of ALL) {
    const f = typeof FOOT[p.prop] === 'function' ? FOOT[p.prop](p) : FOOT[p.prop];
    const x0 = Math.min(...p.circles.map(c => c.ox - c.r)), x1 = Math.max(...p.circles.map(c => c.ox + c.r));
    const z0 = Math.min(...p.circles.map(c => (c.oz || 0) - c.r)), z1 = Math.max(...p.circles.map(c => (c.oz || 0) + c.r));
    if (x0 < f[0] - 0.03 || x1 > f[1] + 0.03) bad.push(`${p.prop} x ${x0.toFixed(2)}..${x1.toFixed(2)} drawn ${f[0]}..${f[1]}`);
    if (z0 < f[2] - 0.12 || z1 > f[3] + 0.12) bad.push(`${p.prop} z ${z0.toFixed(2)}..${z1.toFixed(2)} drawn ${f[2]}..${f[3]}`);
  }
  assert.deepStrictEqual([...new Set(bad)], []);
});

test('hitboxes still cover what is drawn (you cannot walk through the edge of something)', () => {
  const bad = [];
  for (const p of ALL) {
    const f = typeof FOOT[p.prop] === 'function' ? FOOT[p.prop](p) : FOOT[p.prop];
    const x0 = Math.min(...p.circles.map(c => c.ox - c.r)), x1 = Math.max(...p.circles.map(c => c.ox + c.r));
    if (x0 > f[0] + 0.15 || x1 < f[1] - 0.15) bad.push(`${p.prop} x ${x0.toFixed(2)}..${x1.toFixed(2)} drawn ${f[0]}..${f[1]}`);
    // no gap along the obstacle that a player (0.25 m radius) could slip through
    const cs = [...p.circles].sort((a, b) => a.ox - b.ox || (a.oz || 0) - (b.oz || 0));
    for (let i = 1; i < cs.length; i++) {
      const d = Math.hypot(cs[i].ox - cs[i - 1].ox, (cs[i].oz || 0) - (cs[i - 1].oz || 0));
      if (d - cs[i].r - cs[i - 1].r > 0.45) bad.push(`${p.prop} gap ${d.toFixed(2)}`);
    }
  }
  assert.deepStrictEqual([...new Set(bad)], []);
});
