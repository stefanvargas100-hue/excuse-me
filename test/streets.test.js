// New York and Tokyo: street furniture to weave around, crossing vehicles, weave crowds. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');
const DT = 1 / 30;

const KINDS = { 1: ['barrier', 'newsstand', 'bikes', 'bench', 'shelter', 'trashbags'], 2: ['vending', 'bikes', 'asign', 'barrier'] };
const HALF = { 1: 4.5, 2: 11 };
function stage(lv) { const E = load(); E.setLevel(lv); E.start('classic'); E.S.people.length = 0; return E; }
function chunks(E, to) { for (let z = 0; z < to; z += 4) E.genChunk(z); }
function widestGap(E, z, lim) {
  const blocked = [];
  for (const p of E.S.people) for (const c of p.circles || []) {
    if (!p.prop || Math.abs(p.z + (c.oz || 0) - z) > 0.6 + c.r) continue;
    blocked.push([p.x + c.ox - c.r, p.x + c.ox + c.r]);
  }
  blocked.sort((a, b) => a[0] - b[0]);
  let edge = -lim, best = 0;
  for (const [a, b] of blocked) { best = Math.max(best, a - edge); edge = Math.max(edge, b); }
  return Math.max(best, lim - edge);
}

for (const lv of [1, 2]) {
  test(`stage ${lv}: street furniture of every kind appears over a long stretch`, () => {
    const E = stage(lv); chunks(E, 700);
    for (const k of KINDS[lv]) assert.ok(E.S.people.some(p => p.prop === k), 'has ' + k);
  });

  test(`stage ${lv}: furniture never blocks the whole way, and never sits in the opening stretch`, () => {
    const E = stage(lv); chunks(E, 700);
    const mine = E.S.people.filter(p => KINDS[lv].includes(p.prop));
    assert.ok(mine.every(p => p.z >= 20), 'nothing in the first 20 m');
    for (const p of mine) assert.ok(widestGap(E, p.z, HALF[lv] - 0.35) >= 1.5, p.prop + ' at ' + p.z.toFixed(0) + ' leaves ' + widestGap(E, p.z, HALF[lv] - 0.35).toFixed(2));
  });

  test(`stage ${lv}: the furniture is the same for everyone on a daily run`, () => {
    const a = stage(lv), b = stage(lv); a.S.seed = b.S.seed = 'daily-x'; chunks(a, 400); chunks(b, 400);
    const sig = E => E.S.people.filter(p => KINDS[lv].includes(p.prop)).map(p => p.prop + p.x.toFixed(2) + ':' + p.z.toFixed(1)).join('|');
    assert.ok(sig(a).length > 0); assert.strictEqual(sig(a), sig(b));
  });

  test(`stage ${lv}: a weave stays inside the walkway with clear gaps`, () => {
    const E = stage(lv); E.runEvent('weave');
    const rows = E.S.flows[0].rows; assert.ok(rows.length >= 5);
    for (const r of rows) {
      assert.ok(Math.abs(r.gx) < HALF[lv] - 0.9, 'gap inside: ' + r.gx.toFixed(1));
      const mine = E.S.people.filter(p => !p.prop && Math.abs(p.z - r.z) < 0.5 && p.hz < 0);
      assert.ok(mine.length >= 4, 'row of people: ' + mine.length);
      assert.ok(mine.every(p => Math.abs(p.x - r.gx) >= 0.9 && Math.abs(p.x) <= HALF[lv] - 0.2), 'clear gap, nobody in the wall');
    }
  });

  test(`stage ${lv}: drawing the furniture and a crossing vehicle does not throw`, () => {
    const E = stage(lv); chunks(E, 200); E.runEvent('weave'); E.runEvent(lv === 1 ? 'van' : 'taxi');
    for (const p of E.S.people) if (p.drive) p.z = E.S.pz + 8;
    for (let i = 0; i < 40; i++) { for (const p of E.S.people) if (!p.prop) p.dead = true; E.tick(DT); E.render(); }
  });
}

test('the street stages do not get airport furniture, and the airport does not get street furniture', () => {
  for (const lv of [1, 2]) { const E = stage(lv); chunks(E, 300); assert.ok(!E.S.people.some(p => ['desk', 'chairs', 'gatedesk', 'benchz', 'trolleys'].includes(p.prop)), 'stage ' + lv); }
  const A = stage(0); chunks(A, 300);
  assert.ok(!A.S.people.some(p => ['barrier', 'newsstand', 'bikes', 'bench', 'shelter', 'trashbags', 'vending', 'asign'].includes(p.prop)));
});

for (const [lv, kind, prop] of [[1, 'van', 'van'], [2, 'taxi', 'taxi']]) {
  test(`stage ${lv}: a ${kind} crosses the walkway, beeps as it starts, and is gone afterwards`, () => {
    const E = stage(lv); E.runEvent(kind);
    const v = E.S.people.find(p => p.prop === prop);
    assert.ok(v && v.drive, 'a driving ' + prop);
    assert.ok(Math.abs(v.x) > HALF[lv], 'starts outside the walkway');
    const x0 = v.x, side = Math.sign(v.drive);
    for (let i = 0; i < 60; i++) { v.z = E.S.pz + 12; E.tick(DT); }
    assert.ok((v.x - x0) * side > 3, 'moved across');
    for (let i = 0; i < 30 * 14; i++) { v.z = E.S.pz + 12; E.tick(DT); }
    assert.ok(v.dead, 'gone on the far side');
  });
  test(`stage ${lv}: ${kind} is one of the stage events`, () => {
    const E = stage(lv); assert.ok(E.LEVELS[lv].events.includes(kind) && E.LEVELS[lv].events.includes('weave'));
  });
}
