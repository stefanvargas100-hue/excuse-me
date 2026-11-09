// The playtest copy shares a website with the live game, so it must never touch live saves, boards, rooms or the offline cache.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), esbuild = require('esbuild');

function loadSrc(file, pathname, saved = {}) {
  const out = esbuild.buildSync({ entryPoints: [path.join(__dirname, '..', 'src', file)], bundle: true, format: 'cjs', write: false, logLevel: 'silent' }).outputFiles[0].text;
  const data = new Map(Object.entries(saved));
  const localStorage = {
    get length() { return data.size; }, key: i => [...data.keys()][i] ?? null,
    getItem: k => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v))
  };
  const m = { exports: {} };
  new Function('module', 'exports', 'require', 'location', 'localStorage', out)(m, m.exports, require, { pathname }, localStorage);
  return { mod: m.exports, data };
}

test('only pages inside the playtest folder count as the playtest', () => {
  assert.equal(loadSrc('config/channel.js', '/excuse-me/playtest/').mod.PLAYTEST, true);
  assert.equal(loadSrc('config/channel.js', '/excuse-me/').mod.PLAYTEST, false);
  assert.equal(loadSrc('config/channel.js', '/excuse-me/playtest-notes').mod.PLAYTEST, false);
});

test('the live game keeps its saves under the same names as before', () => {
  const { mod, data } = loadSrc('save/store.js', '/excuse-me/', { excuseme_best: '5' });
  assert.equal(mod.store.get('excuseme_best', '0'), '5');
  mod.store.set('excuseme_best', '9');
  assert.equal(data.get('excuseme_best'), '9');
  assert.deepEqual([...data.keys()], ['excuseme_best']);
});

test('the playtest starts from a copy of the live save and never writes to it', () => {
  const { mod, data } = loadSrc('save/store.js', '/excuse-me/playtest/', { excuseme_best: '5' });
  assert.equal(mod.store.get('excuseme_best', '0'), '5', 'copied on first open');
  mod.store.set('excuseme_best', '9');
  assert.equal(mod.store.get('excuseme_best', '0'), '9');
  assert.equal(data.get('excuseme_best'), '5', 'live save untouched');
});

test('the playtest copies the live save only once, so its own progress survives', () => {
  const first = loadSrc('save/store.js', '/excuse-me/playtest/', { excuseme_best: '5' });
  first.mod.store.set('excuseme_best', '9');
  const reopened = loadSrc('save/store.js', '/excuse-me/playtest/', Object.fromEntries(first.data));
  assert.equal(reopened.mod.store.get('excuseme_best', '0'), '9');
});

test('the vibration setting stays separate too', () => {
  const { mod, data } = loadSrc('save/store.js', '/excuse-me/playtest/', { excuseme_vib: '1' });
  mod.store.set('excuseme_vib', '0');
  assert.equal(data.get('excuseme_vib'), '1');
});

test('playtest rooms cannot meet live rooms', () => {
  class Socket { constructor() { this.sent = []; Socket.last = this; } send(s) { this.sent.push(JSON.parse(s)); } close() {} }
  const topicFor = pathname => {
    const { createRoom } = loadSrc('online/room.js', pathname).mod;
    createRoom({ WebSocket: Socket, url: 'https://x.supabase.co', key: 'k', setInterval: () => 1, clearInterval() {}, joinTimeoutMs: 1 }).join('ABCD').catch(() => {});
    Socket.last.onopen({});
    return Socket.last.sent[0].topic;
  };
  assert.equal(topicFor('/excuse-me/'), 'realtime:excuseme-ABCD', 'live room names must not change');
  assert.equal(topicFor('/excuse-me/playtest/'), 'realtime:excuseme-playtest-ABCD');
});

test('the playtest never contacts the live boards', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src/online/online.js'), 'utf8');
  assert.match(source, /PLAYTEST \? offlineFetch :/);
});

test('the live offline cache leaves playtest files alone, so a refresh gets the newest build', () => {
  const handlers = {};
  vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8').replace('__PRECACHE_FILES__', '[]'), { URL, self: { addEventListener: (n, f) => { handlers[n] = f; } } });
  const respondedTo = url => { let hit = false; handlers.fetch({ request: { method: 'GET', url }, respondWith: () => { hit = true; } }); return hit; };
  assert.equal(respondedTo('https://x.github.io/excuse-me/playtest/assets/main.js'), false);
  assert.throws(() => respondedTo('https://x.github.io/excuse-me/assets/main.js'), /caches/, 'live files still go through the cache');
});

test('the playtest page does not install an offline worker', () => {
  assert.match(fs.readFileSync('index.html', 'utf8'), /"serviceWorker" in navigator && !location\.pathname\.includes\("\/playtest\/"\)/);
});

test('the playtest has all gear unlocked, without touching real tallies or paying unlock XP', () => {
  const pt = loadSrc('save/challenges.js', '/excuse-me/playtest/').mod;
  assert.equal(pt.doneCount(), pt.CHALLENGES.length);
  const c = pt.CHALLENGES[0], [key, val] = c.id.split(':');
  assert.equal(pt.isLocked(key, val), false);
  assert.equal(pt.tallyOf(c.tally), 0, 'progress still counts from the real number');
  const live = loadSrc('save/challenges.js', '/excuse-me/').mod;
  assert.equal(live.doneCount(), 0);
  assert.equal(live.isLocked(key, val), true);
});

test('the playtest has every title and picture, at the real level', () => {
  const memory = () => { const m = new Map(); return { get: (k, d) => (m.has(k) ? m.get(k) : d), set: (k, v) => m.set(k, v) }; };
  const pt = loadSrc('save/level.js', '/excuse-me/playtest/').mod, levels = pt.createLevels({ store: memory() });
  assert.equal(levels.level(), 1);
  assert.equal(pt.TITLES.every(t => pt.rewardOpen(t, levels.level())), true);
  assert.equal(pt.PICS.every(p => pt.rewardOpen(p, levels.level())), true);
  assert.equal(levels.setTitle('legend'), true);
  const live = loadSrc('save/level.js', '/excuse-me/').mod, liveLevels = live.createLevels({ store: memory() });
  assert.equal(live.rewardOpen({ level: 50 }, liveLevels.level()), false);
  assert.equal(liveLevels.setTitle('legend'), false);
});
