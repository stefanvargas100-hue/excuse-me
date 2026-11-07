// Top-3 ghosts on the server: stored only for the three best players of a classic stage. Pretend server. node --test
const test = require('node:test');
const assert = require('node:assert');
const path = require('path'), esbuild = require('esbuild');

function loadBoard() {
  const out = esbuild.buildSync({ entryPoints: [path.join(__dirname, '..', 'src', 'online', 'board.js')], bundle: true, format: 'cjs', write: false, logLevel: 'silent' }).outputFiles[0].text;
  const m = { exports: {} }; new Function('module', 'exports', 'require', out)(m, m.exports, require);
  return m.exports;
}
const { createBoard } = loadBoard();

// like the real server: a ghost is accepted only while that player's score is in the top 3 of the board
function fakeServer(opts = {}) {
  const calls = [], scores = [], ghosts = []; let signups = 0, noTable = !!opts.noTable;
  const json = (status, body) => ({ ok: status < 300, status, json: async () => body, text: async () => JSON.stringify(body) });
  const rank = (board, uid) => scores.filter(r => r.board === board).sort((a, b) => b.score - a.score).findIndex(r => r.user_id === uid);
  const fetch = async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : null, method = init.method || 'GET';
    calls.push({ url, method, body });
    if (url.includes('/auth/v1/signup')) { signups++; return json(200, { access_token: 't' + signups, refresh_token: 'r' + signups, expires_in: 3600, user: { id: 'user' + signups } }); }
    if (url.includes('/rest/v1/ghosts')) {
      if (noTable) return json(404, { code: '42P01' });
      if (method === 'POST') {
        const r = rank(body.board, body.user_id);
        if (r < 0 || r > 2) return json(403, { code: '42501' });
        const old = ghosts.findIndex(g => g.user_id === body.user_id && g.board === body.board); if (old >= 0) ghosts.splice(old, 1);
        ghosts.push({ ...body }); return json(201, null);
      }
      const b = decodeURIComponent((url.match(/board=eq\.([^&]*)/) || [])[1] || '');
      return json(200, ghosts.filter(g => g.board === b).sort((a, c) => c.score - a.score).slice(0, 3));
    }
    if (url.includes('/rest/v1/scores') && method === 'POST') { const old = scores.find(r => r.user_id === body.user_id && r.board === body.board); if (old) old.score = Math.max(old.score, body.score); else scores.push({ ...body }); return json(201, null); }
    if (url.includes('/rest/v1/scores')) return json(200, scores.filter(r => url.includes('board=eq.' + encodeURIComponent(r.board))).sort((a, b) => b.score - a.score));
    return json(404, {});
  };
  return { fetch, calls, scores, ghosts };
}
const memStore = () => { const d = {}; return { get: (k, f) => (k in d ? d[k] : f), set: (k, v) => { d[k] = v; }, d }; };
const ghost = { step: 2, pts: [0, 0, 0, 6, 0, 12, 0, 18] };

async function playerWith(srv, score, board = 'classic:airport') {
  const b = createBoard({ fetch: srv.fetch, url: 'https://x.supabase.co', key: 'pk', store: memStore() });
  await b.submitBest(board, score); return b;
}

test('a player in the top 3 can store a ghost, and anyone can read the top 3 ghosts', async () => {
  const srv = fakeServer(), a = await playerWith(srv, 5000);
  assert.strictEqual(await a.submitGhost('classic:airport', 5000, ghost), 'sent');
  assert.strictEqual(srv.ghosts.length, 1);
  assert.deepStrictEqual(JSON.parse(srv.ghosts[0].path), ghost);
  const reader = createBoard({ fetch: srv.fetch, url: 'https://x.supabase.co', key: 'pk', store: memStore() });
  const rows = await reader.topGhosts('classic:airport');
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].score, 5000);
  assert.deepStrictEqual(rows[0].pts, ghost.pts);
  assert.strictEqual(rows[0].you, false);
});

test('a player outside the top 3 never sends a ghost', async () => {
  const srv = fakeServer();
  await playerWith(srv, 9000); await playerWith(srv, 8000); await playerWith(srv, 7000);
  const fourth = await playerWith(srv, 1000);
  const before = srv.calls.filter(c => c.url.includes('/ghosts')).length;
  assert.strictEqual(await fourth.submitGhost('classic:airport', 1000, ghost), 'not top 3');
  assert.strictEqual(srv.calls.filter(c => c.url.includes('/ghosts') && c.method === 'POST').length, 0, 'nothing was even posted');
  assert.strictEqual(srv.ghosts.length, 0);
  assert.ok(before === 0);
});

test('only daily-style boards are refused: ghosts are for classic stages', async () => {
  const srv = fakeServer(), a = await playerWith(srv, 100, 'daily:2026-11-06');
  assert.strictEqual(await a.submitGhost('daily:2026-11-06', 100, ghost), 'not a classic board');
  assert.strictEqual(srv.ghosts.length, 0);
});

test('if the server part is not set up, nothing breaks', async () => {
  const srv = fakeServer({ noTable: true }), a = await playerWith(srv, 5000);
  assert.strictEqual(await a.submitGhost('classic:airport', 5000, ghost), 'failed');
  assert.deepStrictEqual(await a.topGhosts('classic:airport'), []);
});

test('a ghost that is too big is never sent', async () => {
  const srv = fakeServer(), a = await playerWith(srv, 5000);
  const big = { step: 2, pts: new Array(9000).fill(1) };
  assert.strictEqual(await a.submitGhost('classic:airport', 5000, big), 'too big');
  assert.strictEqual(srv.ghosts.length, 0);
});
