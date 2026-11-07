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

// ---- friends' ghosts and the top 3 ----
const flat = (end, step = 2) => { const pts = []; for (let z = 0; z <= end; z += 3 * step) pts.push(0, z); return { step, pts }; };
const friendList = (...fs) => JSON.stringify(fs.map((f, i) => ({ name: f.name, step: f.g.step, pts: f.g.pts, t: 100 + i })));

test('friends\' ghosts join your own, each hidden until you are close to its record', () => {
  const E = load(); E.setLevel(0);
  E.storage['excuseme_fg_classic_airport'] = friendList({ name: 'Zippy Pigeon 42', g: flat(200) }, { name: 'Jolly Courier 17', g: flat(400) });
  plant(E, 'excuseme_ghost_airport', 300);
  E.start('classic');
  assert.strictEqual(E.S.otherGhosts.length, 2);
  assert.strictEqual(JSON.stringify(E.S.otherGhosts.map(g => g.name).sort()), JSON.stringify(['Jolly Courier 17', 'Zippy Pigeon 42']));
  assert.ok(E.S.otherGhosts.every(g => g.hidden), 'hidden at the start');
  E.S.pz = 150; for (let i = 0; i < 3; i++) { clear(E); E.tick(DT); }
  const vis = E.visibleGhosts().map(g => g.name);
  assert.ok(vis.includes('Zippy Pigeon 42') && !vis.includes('Jolly Courier 17') && !vis.includes('Your best'), 'only the friend whose record is near: ' + vis);
  E.render();
});

test('friends\' race ghosts show in races against bots only, and a daily run has none', () => {
  const E = load(); E.setLevel(0);
  E.storage['excuseme_fg_race_airport'] = friendList({ name: 'Racer Ann', g: flat(500) });
  E.storage['excuseme_fg_classic_airport'] = friendList({ name: 'Classic Bob', g: flat(500) });
  E.start('race');
  assert.strictEqual(JSON.stringify(E.S.otherGhosts.map(g => g.name)), JSON.stringify(['Racer Ann']));
  E.start('daily');
  assert.strictEqual(E.S.otherGhosts.length, 0);
  E.start('classic');
  assert.strictEqual(JSON.stringify(E.S.otherGhosts.map(g => g.name)), JSON.stringify(['Classic Bob']));
});

test('the top 3 of a classic stage arrive as ghosts after the run starts, never your own row, and not into a different run', async () => {
  const E = load(); E.setLevel(0);
  const rows = [{ name: 'Leader One', rank: 1, you: false, ...flat(900) }, { name: 'Me', rank: 2, you: true, ...flat(800) }, { name: 'Leader Three', rank: 3, you: false, ...flat(700) }];
  let asked = null;
  E.setTopGhostFetcher(async id => { asked = id; return rows; });
  E.start('classic');
  assert.strictEqual(E.S.otherGhosts.length, 0, 'not there yet: it is fetched in the background');
  await new Promise(r => setTimeout(r, 5));
  assert.strictEqual(asked, 'airport');
  assert.strictEqual(JSON.stringify(E.S.otherGhosts.map(g => g.name)), JSON.stringify(['Leader One', 'Leader Three']), 'your own row is skipped');
  assert.ok(E.S.otherGhosts.every(g => g.hidden));
  // a slow answer for a run that has already ended is dropped: only the latest run gets the leaders
  const releases = []; E.setTopGhostFetcher(() => new Promise(r => { releases.push(() => r(rows)); }));
  E.start('classic'); await new Promise(r => setTimeout(r, 2));
  const first = E.S; E.start('classic'); await new Promise(r => setTimeout(r, 2));
  releases.forEach(r => r()); await new Promise(r => setTimeout(r, 5));
  assert.strictEqual(first.otherGhosts.length, 0, 'the run that already ended got nothing');
  assert.strictEqual(E.S.otherGhosts.length, 2, 'the current run got the leaders once');
});

test('the top 3 are only fetched for classic runs, and a failed fetch is harmless', async () => {
  const E = load(); E.setLevel(0);
  let n = 0; E.setTopGhostFetcher(async () => { n++; throw new Error('offline'); });
  E.start('race'); E.start('daily'); await new Promise(r => setTimeout(r, 5));
  assert.strictEqual(n, 0, 'not for races or daily runs');
  E.start('classic'); await new Promise(r => setTimeout(r, 5));
  assert.strictEqual(n, 1);
  assert.strictEqual(E.S.otherGhosts.length, 0);
  for (let i = 0; i < 10; i++) E.tick(DT);
});
