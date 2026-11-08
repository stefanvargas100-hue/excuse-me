// B3: replayable practice lessons built on the real mechanics; they never pay or record anything. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');
const DT = 1 / 30;

const begin = (id, seed) => { const E = load(undefined, { seed: seed || 3 }); E.setLevel(0); E.startPractice(id); for (let i = 0; i < 3; i++) E.tick(DT); return E; };
const snap = E => JSON.stringify({ tally: E.tallySnapshot(), xp: E.xp(), keys: Object.keys(E.storage).filter(k => /best|ghost|tally|xp|played|racetut|look/.test(k)).sort().map(k => [k, E.storage[k]]) });
// walk with the player held at a chosen sideways offset from a person, so the pass is real but exact
const steerBy = (E, p, off, steps = 600, until = () => false) => { for (let i = 0; i < steps && !until(); i++) { if (p.z - E.S.pz > 0.5) E.S.px = p.x + off; E.tick(DT); } };
const people = E => E.S.people.filter(p => !p.prop);

test('a lesson starts instantly: practice run, no bots, no countdown, only its own people', () => {
  const E = begin('close');
  assert.strictEqual(E.S.run.category, 'practice');
  assert.strictEqual(E.S.race.bots.length, 0);
  assert.strictEqual(E.S.race.countT, 0);
  assert.strictEqual(E.S.lesson.id, 'close'); assert.strictEqual(E.S.lesson.status, 'run');
  const n = people(E).length; assert.ok(n >= 3 && n <= 6, 'scripted people: ' + n);
  for (let i = 0; i < 300; i++) E.tick(DT);
  assert.ok(people(E).length <= n, 'no crowd, events or rivals are generated');
});

test('close pass: two passes under 40 cm complete it; the lesson reports what was detected', () => {
  const E = begin('close');
  const [a, b] = people(E);
  steerBy(E, a, 0.7, 600, () => a.passed);
  assert.ok(E.S.lesson.msg.length > 0 && E.S.lesson.status === 'run', 'one close pass is not enough');
  steerBy(E, b, -0.7, 600, () => b.passed || E.S.lesson.status === 'done');
  assert.strictEqual(E.S.lesson.status, 'done');
});

test('close pass: a wide pass says how far off it was and does not count', () => {
  const E = begin('close'); const a = people(E)[0];
  steerBy(E, a, 1.6, 600, () => a.passed);
  assert.match(E.S.lesson.msg, /cm/);
  assert.strictEqual(E.S.lesson.status, 'run'); assert.strictEqual(E.S.lesson.data.close || 0, 0);
});

test('a bump resets only the lesson, with fresh people and no leftover boosts', () => {
  const E = begin('close'); const a = people(E)[0];
  E.S.energy = 10; E.S.burstT = 1;
  for (let i = 0; i < 600 && E.S.lesson.attempt === 1; i++) { if (a.z - E.S.pz > 0.5) E.S.px = a.x; E.tick(DT); }
  assert.strictEqual(E.S.lesson.attempt, 2, 'restarted after the bump');
  assert.strictEqual(E.S.energy, 100); assert.strictEqual(E.S.burstT, 0); assert.strictEqual(E.S.bumpT, 0);
  assert.ok(people(E).length >= 3 && people(E).every(p => !p.passed && p.z > E.S.pz));
  assert.notStrictEqual(E.S.state, 'over');
});

test('running out of people without success restarts with a hint', () => {
  const E = begin('close');
  for (let i = 0; i < 900 && E.S.lesson.attempt === 1; i++) { E.S.px = 0; for (const p of people(E)) p.x = 3.2; E.tick(DT); }   // pass everyone far away
  assert.ok(E.S.lesson.attempt >= 2); assert.match(E.S.lesson.msg, /closer|again/i);
});

test('perfect dash: a dash right before contact completes it; an early one restarts it', () => {
  const E = begin('dash'); let p = people(E)[0];
  for (let i = 0; i < 600 && p.z - E.S.pz > 5; i++) E.tick(DT);
  E.action('R'); E.tick(DT);
  assert.strictEqual(E.S.lesson.attempt, 2, 'early dash restarts'); assert.match(E.S.lesson.msg, /early|late|m /i);
  p = people(E)[0];
  for (let i = 0; i < 600 && p.z - E.S.pz > 1.2; i++) { E.S.px = p.x; E.tick(DT); }
  E.action('R'); for (let i = 0; i < 3; i++) E.tick(DT);
  assert.strictEqual(E.S.lesson.status, 'done');
});

test('thread the needle: walking the gap between a staggered pair completes it', () => {
  const E = begin('thread'); const ps = people(E), mids = [0, 1, 2].map(k => (ps[2 * k].x + ps[2 * k + 1].x) / 2);
  for (let i = 0; i < 900 && E.S.lesson.status === 'run' && E.S.lesson.attempt === 1; i++) {
    const k = [0, 1, 2].find(k => !ps[2 * k + 1].passed); if (k !== undefined) { E.S.px = mids[k]; E.S.vx = 0; }
    E.tick(DT);
  }
  assert.strictEqual(E.S.lesson.status, 'done');
});

test('slipstream: follow a walker closely until the boost, then overtake', () => {
  const E = begin('slip'); const w = people(E)[0];
  for (let i = 0; i < 900 && !E.S.lesson.data.slipped && E.S.lesson.attempt === 1; i++) { if (w.z - E.S.pz > 0.4) E.S.px = w.x; E.S.vx = 0; E.tick(DT); }
  assert.ok(E.S.lesson.data.slipped, 'slipstream detected');
  steerBy(E, w, 1.0, 900, () => E.S.lesson.status === 'done');
  assert.strictEqual(E.S.lesson.status, 'done');
});

test('overtaking without a slipstream restarts the lesson and says why', () => {
  const E = begin('slip'); const w = people(E)[0];
  for (let i = 0; i < 900 && E.S.lesson.attempt === 1; i++) { E.S.px = w.x + 1.6; E.tick(DT); }
  assert.ok(E.S.lesson.attempt >= 2); assert.match(E.S.lesson.msg, /behind|slipstream/i);
});

test('lessons can be retried and chained, and finishing one pays or records nothing', () => {
  const E = begin('dash'); const before = snap(E);
  const p = people(E)[0];
  for (let i = 0; i < 600 && p.z - E.S.pz > 1.2; i++) { E.S.px = p.x; E.tick(DT); }
  E.action('R'); for (let i = 0; i < 3; i++) E.tick(DT);
  assert.strictEqual(E.S.lesson.status, 'done');
  E.lessonRetry(); assert.strictEqual(E.S.lesson.status, 'run'); assert.strictEqual(E.S.lesson.id, 'dash');
  E.lessonNext(); assert.strictEqual(E.S.lesson.id, 'thread');
  assert.strictEqual(snap(E), before, 'no xp, tallies, bests or saved outfit changes');
});

test('the same lesson builds the same layout every time', () => {
  const lay = () => JSON.stringify(people(begin('thread', 9)).map(p => [+p.x.toFixed(3), +p.z.toFixed(3)]));
  assert.strictEqual(lay(), lay());
});

test('a supplied practice outfit is used and the saved one is untouched', () => {
  const E = begin('close'); const saved = JSON.stringify(E.LOOK);
  assert.strictEqual(E.S.me.build, 'medium');
  E.toMenu(); assert.strictEqual(JSON.stringify(E.LOOK), saved); assert.strictEqual(E.storage.excuseme_look, undefined);
});
