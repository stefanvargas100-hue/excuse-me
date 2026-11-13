// Tutorial movement parity: the scripted steps use the same build effects as Classic, and nothing is paid or recorded. node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness.js');

const DT = 1 / 30;
const key = (E, type, k) => E.fire(type, { key: k });
const press = (E, k) => { key(E, 'keydown', k); key(E, 'keyup', k); };
const ahead = E => E.S.people.filter(p => !p.prop && !p.dead && p.z - E.S.pz > 0.1).sort((a, b) => a.z - b.z)[0];
const begin = (build, opts = {}) => {
  const E = load(); delete E.storage.excuseme_tut; if (build) E.LOOK.build = build;
  E.setLevel(0); E.start(false, 'classic'); if (opts.tired) E.S.energy = opts.tired; return E;
};

// A player that does whatever the current step asks; returns the steps it saw and whether the tutorial ended.
function playThrough(E, tired) {
  const seen = new Set(); let held = null;
  const hold = k => { if (held === k) return; if (held) key(E, 'keyup', held); held = k; if (k) key(E, 'keydown', k); };
  for (let i = 0; i < 6000 && E.S.tut; i++) {
    const st = E.S.tut.step; seen.add(st);
    if (tired && E.S.tut.t < DT * 1.5) E.S.energy = Math.min(E.S.energy, tired);
    const p = ahead(E);
    if (st === 0) hold('d'); else if (st === 1) hold('a'); else hold(null);
    if (st === 2 && E.S.dashT <= 0) press(E, 'd'), press(E, 'd');
    if (st === 3 && E.S.burstT <= 0) E.action('M');
    if (st === 4 && E.S.shoutCD <= 0) press(E, ' ');
    if (st === 5 && p && p.z - E.S.pz < 1.4 && Math.abs(p.x - E.S.px) < 0.4) { press(E, 'd'); press(E, 'd'); }
    if (st === 6 && p && p.z - E.S.pz < 2.0 && Math.abs(p.x - E.S.px) < 0.5) press(E, ' ');
    E.tick(DT);
  }
  hold(null);
  return { seen, ended: !E.S.tut };
}

for (const build of ['small', 'medium', 'large']) {
  test(build + ' build: frozen build effects are active at the first tutorial step', () => {
    const E = begin(build);
    assert.ok(E.S.tut);
    assert.ok(E.S.moveStats, 'moveStats set while the tutorial runs');
    assert.deepEqual(E.S.moveStats, E.effects(E.statsOf({ ...E.LOOK })));
    const pace = E.S.moveStats.speed; E.S.people = []; E.tick(1); E.S.tut.step = 0;
    assert.ok(Math.abs(E.S.speed - 5.2 * pace) < 5.2, 'speed follows the build');
  });
  test(build + ' build: every tutorial step completes', () => {
    const E = begin(build); const r = playThrough(E);
    assert.ok(r.ended, 'tutorial finished'); assert.equal(r.seen.size, 8);
  });
  test(build + ' build with low stamina: every tutorial step completes', () => {
    const E = begin(build, { tired: 5 }); const r = playThrough(E, 5);
    assert.ok(r.ended, 'tutorial finished'); assert.equal(r.seen.size, 8);
  });
}

test('build speed and stamina regen match Classic at equal state during the tutorial', () => {
  for (const build of ['small', 'large']) {
    const a = begin(build); a.S.people = []; a.S.energy = 30; a.S.chain = 12; a.tick(.01);
    const b = begin(build); b.S.tut = null; b.S.people = []; b.S.energy = 30; b.S.chain = 12; b.tick(.01);
    assert.equal(a.S.speed, b.S.speed, build + ' speed'); assert.equal(a.S.energy, b.S.energy, build + ' regen');
  }
});

test('changing the look mid-tutorial does not change the running build effects', () => {
  const E = begin('small'); const before = JSON.stringify(E.S.moveStats);
  E.LOOK.build = 'large'; for (let i = 0; i < 30; i++) E.tick(DT);
  assert.equal(JSON.stringify(E.S.moveStats), before);
});

test('random crowd and pickups stay suppressed during the tutorial', () => {
  const E = begin('medium'); const n = E.S.people.filter(p => !p.prop).length;
  for (let i = 0; i < 120; i++) E.tick(DT);
  assert.equal(E.S.pickups.length, 0); assert.equal(E.S.puT, 0);
  assert.ok(E.S.people.filter(p => !p.prop).length <= n, 'no crowd chunks');
});

test('handover keeps moveStats, restores pickups and needs no restart', () => {
  const E = begin('large'); const ms = E.S.moveStats, run = E.S.run, seed = E.S.seed;
  E.S.tut.step = 7; E.S.tut.t = 3; E.tick(DT);
  assert.equal(E.S.tut, null); assert.equal(E.state, 'play');
  assert.equal(E.S.moveStats, ms); assert.equal(E.S.run, run); assert.equal(E.S.seed, seed);
  assert.ok(E.S.pickups.length > 0, 'pickups are back immediately');
  assert.equal(E.storage.excuseme_tut, '1');
  assert.ok(E.S.nextChunk > E.S.pz, 'crowd generation resumes ahead of the player');
});

test('skipping the tutorial hands over the same way', () => {
  const E = load(undefined, { dom: true }); delete E.storage.excuseme_tut; E.setLevel(0); E.start(false, 'classic'); const ms = E.S.moveStats; E.element('tutSkip').dispatchEvent({ type: 'click', stopPropagation() {} });
  assert.equal(E.S.moveStats, ms); assert.ok(E.S.pickups.length > 0);
});

test('a practice retry clears boosts and queued input', () => {
  const E = load(undefined, { seed: 3 }); E.setLevel(0); E.startPractice('dash'); for (let i = 0; i < 3; i++) E.tick(DT);
  Object.assign(E.S, { burstT: 1, dashT: 1, perfectT: 1, nearT: 1, ghostT: 1, slipT: 1, energy: 10, chain: 5 });
  E.action('R'); E.lessonRetry();
  for (const k of ['burstT', 'dashT', 'perfectT', 'nearT', 'ghostT', 'slipT', 'chain']) assert.equal(E.S[k], 0, k);
  assert.equal(E.S.energy, 100);
  const x = E.S.px; for (let i = 0; i < 40; i++) E.tick(DT);
  assert.equal(E.S.dashT <= 0 && Math.abs(E.S.px - x) < 0.01, true, 'no queued dash fires after the retry');
});

test('the tutorial pays and records nothing until it ends', () => {
  const E = begin('medium'); const snap = () => JSON.stringify({ xp: E.xp(), keys: Object.keys(E.storage).filter(k => /best|ghost|xp|played|coin|look/.test(k)).sort().map(k => [k, E.storage[k]]) });
  const before = snap();
  for (let i = 0; i < 90; i++) E.tick(DT);
  assert.equal(E.S.ghost, null); assert.equal(snap(), before);
  assert.equal(E.storage.excuseme_played_daily, undefined); assert.equal(E.storage.excuseme_played_weekly, undefined);
});
