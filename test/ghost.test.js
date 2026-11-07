// Ghost of your best run: it only shows up when you are close to your record, in classic and in races. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');
const DT = 1 / 30;

// a stored ghost that walks 3 m/s straight down the middle until it reaches `end` metres
function plant(E, key, end) { const pts = []; for (let z = 0; z <= end; z += 1.2) pts.push(0, +z.toFixed(1)); E.storage[key] = JSON.stringify(pts); }
const clear = E => { for (const p of E.S.people) if (Math.abs(p.z - E.S.pz) < 3.5) p.dead = true; };

test('a classic ghost stays out of sight until you are within 60 m of where your best run ended', () => {
  const E = load(); plant(E, 'excuseme_ghost_airport', 300);
  E.setLevel(0); E.start('classic');
  assert.ok(E.S.ghost, 'the ghost is loaded');
  assert.strictEqual(E.S.ghost.hidden, true, 'hidden at the start');
  E.S.pz = 238; for (let i = 0; i < 3; i++) { clear(E); E.tick(DT); }
  assert.strictEqual(E.S.ghost.hidden, true, '62 m short of the record: still hidden');
  E.S.pz = 242; for (let i = 0; i < 3; i++) { clear(E); E.tick(DT); }
  assert.strictEqual(E.S.ghost.hidden, false, '58 m short: it appears');
  E.render();
});

test('the "close to your best" message shows once, when the ghost appears', () => {
  const E = load(); plant(E, 'excuseme_ghost_airport', 300);
  E.setLevel(0); E.start('classic');
  const count = () => E.S.pops.filter(p => /CLOSE TO YOUR BEST/.test(p.text)).length;
  E.S.pz = 250; for (let i = 0; i < 5; i++) { clear(E); E.tick(DT); }
  assert.strictEqual(count(), 1);
  for (let i = 0; i < 40; i++) { clear(E); E.tick(DT); }
  assert.ok(E.S.pops.filter(p => /CLOSE TO YOUR BEST/.test(p.text)).length <= 1, 'not repeated');
});

test('a hidden ghost is not drawn', () => {
  const E = load(); plant(E, 'excuseme_ghost_airport', 300);
  E.setLevel(0); E.start('classic');
  for (let i = 0; i < 5; i++) { clear(E); E.tick(DT); }
  assert.strictEqual(E.S.ghost.hidden, true);
  assert.strictEqual(E.visibleGhost(), null, 'nothing to draw');
  E.S.pz = 260; for (let i = 0; i < 5; i++) { clear(E); E.tick(DT); }
  assert.ok(E.visibleGhost(), 'drawn once close');
});

test('a race win with a new best time saves a ghost, and the next race brings it back when you near the finish', () => {
  const E = load(); E.setLevel(0); E.start('race');
  for (let i = 0; i < 91; i++) E.tick(DT);
  for (let i = 0; i < 90; i++) { clear(E); E.tick(DT); }   // 3 s of running so there is a path to save
  E.S.race.bots.forEach(b => { b.z = 0; b.speed = 0; });
  E.S.pz = E.LV.goal + 1; E.tick(DT);
  assert.ok(E.S.race.finished && E.S.race.place === 1 && E.S.race.newBest, 'won with a new best');
  const saved = E.storage['excuseme_ghost_race_airport'];
  assert.ok(saved && JSON.parse(saved).length >= 4, 'ghost saved');
  E.start('race');
  assert.ok(E.S.ghost, 'ghost loaded for the next race');
  assert.strictEqual(E.S.ghost.hidden, true, 'hidden at the start of the race');
});

test('a race against bots has a ghost, a daily run has none', () => {
  const E = load(); plant(E, 'excuseme_ghost_race_airport', 300);
  E.setLevel(0); E.start('race');
  assert.ok(E.S.ghost, 'bot race has one');
  E.start('daily');
  assert.strictEqual(E.S.ghost, null);
});
