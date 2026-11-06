// Account levels, XP, titles and playercard pictures. node --test
const test = require('node:test');
const assert = require('node:assert');
const path = require('path'), esbuild = require('esbuild');
const { load: loadGame } = require('./harness.js');

function loadLevel() {
  const out = esbuild.buildSync({ entryPoints: [path.join(__dirname, '..', 'src', 'save', 'level.js')], bundle: true, format: 'cjs', write: false, logLevel: 'silent' }).outputFiles[0].text;
  const m = { exports: {} }; new Function('module', 'exports', 'require', out)(m, m.exports, require);
  return m.exports;
}
const L = loadLevel();
const memStore = () => { const d = {}; return { get: (k, f) => (k in d ? d[k] : f), set: (k, v) => { d[k] = v; } }; };

test('the level curve: quick at first, slower later, and it round-trips', () => {
  assert.strictEqual(L.levelFromXp(0), 1);
  assert.strictEqual(L.levelFromXp(99), 1);
  assert.strictEqual(L.levelFromXp(100), 2);
  assert.strictEqual(L.xpToReach(10), 4500);
  for (let n = 1; n <= 60; n++) assert.strictEqual(L.levelFromXp(L.xpToReach(n)), n);
  assert.ok(L.xpToReach(11) - L.xpToReach(10) > L.xpToReach(3) - L.xpToReach(2), 'later levels cost more');
});

test('XP persists, levels up once per level, and reports each level reached', () => {
  const st = memStore(), ups = [];
  const a = L.createLevels({ store: st, onLevelUp: (lvl, rewards) => ups.push([lvl, rewards]) });
  a.addXp(50); assert.strictEqual(a.level(), 1); assert.strictEqual(ups.length, 0);
  a.addXp(60); assert.strictEqual(a.level(), 2); assert.strictEqual(ups.length, 1);
  a.addXp(1000); // jumps several levels: each is reported, in order
  assert.deepStrictEqual(ups.map(u => u[0]), [2, 3, 4, 5]);
  const b = L.createLevels({ store: st });
  assert.strictEqual(b.xp(), 1110); assert.strictEqual(b.level(), 5);
  const p = b.progress();
  assert.strictEqual(p.level, 5); assert.strictEqual(p.into, 110); assert.strictEqual(p.need, 500);
});

test('bad or negative XP is ignored', () => {
  const a = L.createLevels({ store: memStore() });
  a.addXp(-50); a.addXp(NaN); a.addXp(undefined);
  assert.strictEqual(a.xp(), 0);
});

test('titles and pictures unlock by level, and only unlocked ones can be chosen', () => {
  const a = L.createLevels({ store: memStore() });
  assert.ok(a.titles().some(t => t.unlocked), 'a starting title exists');
  assert.ok(a.pics().some(t => t.unlocked), 'a starting picture exists');
  const locked = a.titles().find(t => !t.unlocked);
  assert.ok(locked, 'something is still locked at level 1');
  assert.strictEqual(a.setTitle(locked.id), false);
  assert.notStrictEqual(a.title().id, locked.id);
  a.addXp(L.xpToReach(locked.level));
  assert.strictEqual(a.setTitle(locked.id), true);
  assert.strictEqual(a.title().id, locked.id);
  const lp = a.pics().find(t => !t.unlocked);
  if (lp) { assert.strictEqual(a.setPic(lp.id), false); }
});

test('the choice is remembered; level-up reports what was unlocked', () => {
  const st = memStore(), seen = [];
  const a = L.createLevels({ store: st, onLevelUp: (lvl, r) => seen.push(...r.map(x => x.kind)) });
  a.addXp(L.xpToReach(50));
  assert.ok(seen.includes('title') && seen.includes('picture'), 'titles and pictures were announced: ' + seen.join());
  const top = a.titles().filter(t => t.unlocked).pop();
  a.setTitle(top.id);
  assert.strictEqual(L.createLevels({ store: st }).title().id, top.id);
});

test('run XP: every run pays, harder or better runs pay more, and bot races pay less than any standard mode', () => {
  const classic = L.runXp({ mode: 'classic', score: 0 });
  assert.ok(classic >= 10, 'even a zero-score run pays: ' + classic);
  assert.ok(L.runXp({ mode: 'classic', score: 5000 }) > classic, 'a better run pays more');
  assert.ok(L.runXp({ mode: 'classic', score: 1e9 }) <= 100, 'capped, so it cannot be farmed');
  const botBest = Math.max(L.runXp({ mode: 'race', bots: true, won: true, score: 1e9 }), L.runXp({ mode: 'race', bots: true, won: false, score: 0 }));
  const stdWorst = Math.min(...['classic', 'daily', 'weekly'].map(m => L.runXp({ mode: m, score: 0 })), L.runXp({ mode: 'race', bots: false, won: false, score: 0 }));
  assert.ok(botBest < stdWorst, 'best bot race ' + botBest + ' < worst standard run ' + stdWorst);
  assert.ok(L.runXp({ mode: 'race', bots: true, won: true }) > L.runXp({ mode: 'race', bots: true, won: false }), 'winning still helps');
  assert.ok(L.runXp({ mode: 'race', bots: false, won: true }) >= L.runXp({ mode: 'classic', score: 0 }), 'a live race against a person is a standard mode');
});

// ---- through the real game ----
const DT = 1 / 30;
function bump(E) { for (let i = 0; i < 150; i++) { E.tick(DT); } const p = E.S.people.find(q => !q.prop); }

test('finishing a classic run gives XP, once', () => {
  const E = loadGame(); E.setLevel(0); E.start('classic');
  const before = E.xp();
  let t = 0; while (E.state === 'play' && t++ < 30 * 400) E.tick(DT);   // nobody steers: bumps into someone
  assert.notStrictEqual(E.state, 'play');
  for (let i = 0; i < 90; i++) E.tick(DT);                                // results screen builds
  const gained = E.xp() - before;
  assert.ok(gained >= 10, 'gained ' + gained);
  for (let i = 0; i < 90; i++) E.tick(DT);
  assert.strictEqual(E.xp() - before, gained, 'paid once, not every frame');
});

test('quitting a run still pays', () => {
  const E = loadGame(); E.setLevel(0); E.start('classic');
  for (let i = 0; i < 60; i++) { E.S.people.length = 0; E.tick(DT); }
  const before = E.xp(); E.quitRun();
  assert.ok(E.xp() - before >= 10);
});

test('a bot race pays less than a classic run', () => {
  const C = loadGame(); C.setLevel(0); C.start('classic');
  let t = 0; while (C.state === 'play' && t++ < 30 * 400) C.tick(DT);
  const cGain = C.S.xpGained;   // the run's own XP; challenge rewards are separate
  const R = loadGame(); R.setLevel(0); R.start(false, 'race');
  t = 0; while (R.state === 'play' && t++ < 30 * 600) R.tick(DT);
  const rGain = R.S.xpGained;
  assert.ok(rGain > 0, 'a finished race pays something: ' + rGain);
  assert.ok(rGain < cGain, 'bot race ' + rGain + ' < classic ' + cGain);
});

test('completing challenges gives XP: daily 100, weekly 350', () => {
  const E = loadGame();
  const day = E.rotatingList().find(x => x.period === 'daily'), wk = E.rotatingList().find(x => x.period === 'weekly');
  const x0 = E.xp(); E.track(day.tally, day.target);
  assert.strictEqual(E.xp() - x0, 100);
  const x1 = E.xp(); E.track(wk.tally, wk.target);
  assert.ok(E.xp() - x1 >= 350, 'weekly pays 350 (a shared tally may finish the daily too)');
});

test('unlocking a long challenge reward gives XP', () => {
  const E = loadGame(); const x0 = E.xp();
  E.track('razor', 100);   // Shades
  assert.ok(E.xp() - x0 >= 200);
});

test('until you choose, your title and picture are the newest you have unlocked', () => {
  const a = L.createLevels({ store: memStore() });
  assert.strictEqual(a.title().id, 'newcomer');
  a.addXp(L.xpToReach(12));
  assert.strictEqual(a.title().id, 'weaver');
  assert.strictEqual(a.pic().id, 'sunglasses');
  a.setTitle('commuter');
  assert.strictEqual(a.title().id, 'commuter', 'a choice sticks even after more levels');
});
