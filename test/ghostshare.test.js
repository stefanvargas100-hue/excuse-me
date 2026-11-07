// Packing, checking and keeping ghosts that come from other phones or the server. node --test
const test = require('node:test');
const assert = require('node:assert');
const path = require('path'), esbuild = require('esbuild');

function loadMod() {
  const out = esbuild.buildSync({ entryPoints: [path.join(__dirname, '..', 'src', 'sim', 'ghostshare.js')], bundle: true, format: 'cjs', write: false, logLevel: 'silent' }).outputFiles[0].text;
  const m = { exports: {} }; new Function('module', 'exports', 'require', out)(m, m.exports, require);
  return m.exports;
}
const G = loadMod();
const memStore = () => { const d = {}; return { get: (k, f) => (k in d ? d[k] : f), set: (k, v) => { d[k] = v; }, d }; };
const run = (meters, step = 0.4) => { const p = []; for (let t = 0, z = 0; z <= meters; t += step, z = t * 3) p.push(0.5, +z.toFixed(1)); return p; };

test('a ghost that is sent to someone is thinned to one point every 2 seconds and keeps its last point', () => {
  const own = run(300);                       // about 250 samples
  const g = G.packGhost(own);
  assert.strictEqual(g.step, 2);
  assert.ok(g.pts.length <= own.length / 5 + 4, 'about five times smaller: ' + g.pts.length + ' vs ' + own.length);
  assert.strictEqual(g.pts[g.pts.length - 1], own[own.length - 1], 'the record distance is exact');
  assert.ok(G.cleanGhost(g), 'and it passes the check');
  assert.strictEqual(G.packGhost([1, 2]), null, 'too short to be a run');
});

test('anything odd is thrown away: bad types, wild positions, too long, bad step', () => {
  const ok = { step: 2, pts: [0, 0, 0, 6, 0, 12] };
  assert.ok(G.cleanGhost(ok));
  for (const bad of [null, 'x', {}, { step: 2 }, { step: 0.01, pts: ok.pts }, { step: 9, pts: ok.pts }, { step: 2, pts: [0, 0, 0] },
    { step: 2, pts: [0, 0, 'a', 6] }, { step: 2, pts: [0, 0, NaN, 6] }, { step: 2, pts: [0, 0, 99, 6] }, { step: 2, pts: [0, 0, 0, 99999] },
    { step: 2, pts: [0, 100, 0, 20] }, { step: 2, pts: new Array(2000).fill(0) }]) assert.strictEqual(G.cleanGhost(bad), null, JSON.stringify(bad).slice(0, 60));
});

test('a friend ghost is kept per stage and kind, newest wins per friend, and only 4 friends are kept', () => {
  const st = memStore(), g = G.packGhost(run(200));
  assert.ok(G.saveFriendGhost(st, 'classic', 'airport', 'Zippy Pigeon 42', g, 100));
  assert.ok(G.saveFriendGhost(st, 'race', 'airport', 'Zippy Pigeon 42', g, 100));
  assert.strictEqual(G.friendGhosts(st, 'classic', 'airport').length, 1);
  assert.strictEqual(G.friendGhosts(st, 'race', 'airport').length, 1);
  assert.strictEqual(G.friendGhosts(st, 'classic', 'nyc').length, 0, 'another stage is separate');
  const longer = G.packGhost(run(400));
  G.saveFriendGhost(st, 'classic', 'airport', 'Zippy Pigeon 42', longer, 200);
  const l = G.friendGhosts(st, 'classic', 'airport');
  assert.strictEqual(l.length, 1, 'the same friend is replaced, not added');
  assert.strictEqual(l[0].pts[l[0].pts.length - 1], longer.pts[longer.pts.length - 1]);
  for (let i = 0; i < 6; i++) G.saveFriendGhost(st, 'classic', 'airport', 'Friend ' + i, g, 300 + i);
  const all = G.friendGhosts(st, 'classic', 'airport');
  assert.strictEqual(all.length, 4, 'at most four friends');
  assert.strictEqual(all[0].name, 'Friend 5', 'newest first');
});

test('a bad ghost is never saved, and names are cleaned', () => {
  const st = memStore();
  assert.strictEqual(G.saveFriendGhost(st, 'classic', 'airport', 'X', { step: 2, pts: [0, 0, 99, 5] }), false);
  assert.strictEqual(Object.keys(st.d).length, 0);
  assert.strictEqual(G.cleanFriendName('<b>Ann</b>'), 'bAnnb');
  assert.strictEqual(G.cleanFriendName(42), 'Friend');
  assert.ok(G.cleanFriendName('x'.repeat(80)).length <= 24);
});
