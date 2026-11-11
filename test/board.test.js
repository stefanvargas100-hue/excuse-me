// Online leaderboard client, with a pretend server. node --test
const test = require('node:test');
const assert = require('node:assert');
const path = require('path'), esbuild = require('esbuild');

function loadBoard() {
  const out = esbuild.buildSync({ entryPoints: [path.join(__dirname, '..', 'src', 'online', 'board.js')], bundle: true, format: 'cjs', write: false, logLevel: 'silent' }).outputFiles[0].text;
  const m = { exports: {} }; new Function('module', 'exports', 'require', out)(m, m.exports, require);
  return m.exports;
}
const { createBoard } = loadBoard();

// A pretend Supabase: records every request and answers like the real one.
function fakeServer(opts = {}) {
  const calls = [], rows = [];
  let signups = 0, down = !!opts.down; const oldSchema = !!opts.oldSchema;
  const json = (status, body) => ({ ok: status < 300, status, json: async () => body, text: async () => JSON.stringify(body) });
  const fetch = async (url, init = {}) => {
    if (down) throw new Error('offline');
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ url, method: init.method || 'GET', headers: init.headers || {}, body });
    if (url.includes('/auth/v1/signup')) { signups++; return json(200, { access_token: 'tok' + signups, refresh_token: 'ref' + signups, expires_in: 3600, user: { id: 'user' + signups } }); }
    if (oldSchema && init.method === 'POST' && body && ('level' in body || 'title' in body || 'pic' in body)) return json(400, { code: 'PGRST204' });
    if (oldSchema && (init.method || 'GET') === 'GET' && /select=[^&]*(level|title|pic)/.test(url)) return json(400, { code: '42703' });
    if (url.includes('/rest/v1/scores') && init.method === 'POST' && url.includes('on_conflict=user_id,board')) {   // upsert: keep the higher score
      const old = rows.find(r => r.user_id === body.user_id && r.board === body.board);
      if (old) old.score = Math.max(old.score, body.score); else rows.push({ ...body });
      return json(201, null);
    }
    if (url.includes('/rest/v1/scores') && init.method === 'POST') {
      if (rows.some(r => r.user_id === body.user_id && r.board === body.board)) return json(409, { code: '23505' });
      rows.push(body); return json(201, null);
    }
    if (url.includes('/rest/v1/scores')) return json(200, rows.slice().sort((a, b) => b.score - a.score));
    return json(404, {});
  };
  return { fetch, calls, rows, get signups() { return signups; }, setDown(v) { down = v; } };
}
const memStore = () => { const d = {}; return { get: (k, f) => (k in d ? d[k] : f), set: (k, v) => { d[k] = v; }, d }; };
const make = (srv, st) => createBoard({ fetch: srv.fetch, url: 'https://x.supabase.co', key: 'pk', store: st || memStore() });

test('first score signs in anonymously and is stored under the player with a generated name', async () => {
  const srv = fakeServer(), b = make(srv);
  const r = await b.submit('daily:2026-11-06', 1234);
  assert.strictEqual(r, 'sent');
  assert.strictEqual(srv.signups, 1);
  assert.strictEqual(srv.rows.length, 1);
  assert.strictEqual(srv.rows[0].user_id, 'user1');
  assert.strictEqual(srv.rows[0].score, 1234);
  assert.ok(srv.rows[0].name && srv.rows[0].name.length <= 24, 'has a short name');
  const post = srv.calls.find(c => c.method === 'POST' && c.url.includes('/scores'));
  assert.strictEqual(post.headers.Authorization, 'Bearer tok1');
});

test('the same player is reused: one sign-in, same name, even across sessions', async () => {
  const srv = fakeServer(), st = memStore();
  await make(srv, st).submit('daily:2026-11-06', 10);
  await make(srv, st).submit('weekly:2026-W45', 20);
  assert.strictEqual(srv.signups, 1);
  assert.strictEqual(srv.rows[0].name, srv.rows[1].name);
});

test('offline: the score is kept and sent later, exactly once', async () => {
  const srv = fakeServer({ down: true }), st = memStore(), b = make(srv, st);
  assert.strictEqual(await b.submit('daily:2026-11-06', 500), 'queued');
  assert.strictEqual(srv.rows.length, 0);
  srv.setDown(false);
  await b.flush(); await b.flush();
  assert.strictEqual(srv.rows.length, 1);
  assert.strictEqual(srv.rows[0].score, 500);
});

test('a second submit for the same board is refused by the server and is not retried forever', async () => {
  const srv = fakeServer(), b = make(srv);
  await b.submit('daily:2026-11-06', 100);
  assert.strictEqual(await b.submit('daily:2026-11-06', 999), 'duplicate');
  await b.flush();
  assert.strictEqual(srv.rows.length, 1);
  assert.strictEqual(srv.rows[0].score, 100, 'the first try stands');
});

test('top scores come back highest first, limited, and flag which row is you', async () => {
  const srv = fakeServer(), st = memStore(), b = make(srv, st);
  srv.rows.push({ user_id: 'other', board: 'daily:2026-11-06', score: 900, name: 'Brisk Pigeon' });
  await b.submit('daily:2026-11-06', 1500);
  const top = await b.top('daily:2026-11-06', 5);
  assert.deepStrictEqual(top.map(r => r.score), [1500, 900]);
  assert.strictEqual(top[0].you, true);
  assert.strictEqual(top[1].you, false);
  const get = srv.calls.filter(c => c.method === 'GET' && c.url.includes('/scores')).pop();
  assert.ok(get.url.includes('limit=5') && get.url.includes('order=score.desc'), get.url);
});

test('top scores fail quietly to an empty list when offline', async () => {
  const srv = fakeServer({ down: true }), b = make(srv);
  assert.deepStrictEqual(await b.top('daily:2026-11-06', 5), []);
});

test('best-score boards: a better score replaces the old one, a worse one never lowers it', async () => {
  const srv = fakeServer(), b = make(srv);
  assert.strictEqual(await b.submitBest('classic:airport', 800), 'sent');
  assert.strictEqual(await b.submitBest('classic:airport', 1200), 'sent');
  assert.strictEqual(srv.rows.length, 1, 'still one row for this player and stage');
  assert.strictEqual(srv.rows[0].score, 1200);
  await b.submitBest('classic:airport', 300);
  assert.strictEqual(srv.rows[0].score, 1200);
});

test('best-score boards: offline queue keeps only the highest waiting score per stage', async () => {
  const srv = fakeServer({ down: true }), b = make(srv);
  assert.strictEqual(await b.submitBest('classic:nyc', 400), 'queued');
  await b.submitBest('classic:nyc', 900); await b.submitBest('classic:nyc', 600);
  srv.setDown(false); await b.flush();
  assert.strictEqual(srv.rows.length, 1);
  assert.strictEqual(srv.rows[0].score, 900);
});

test('one-try boards still refuse a second score after best-score boards exist', async () => {
  const srv = fakeServer(), b = make(srv);
  await b.submit('daily:2026-11-06', 100);
  assert.strictEqual(await b.submit('daily:2026-11-06', 5000), 'duplicate');
});

// ---- level, title and picture on boards ----
const PROFILE = () => ({ level: 7, title: 'Commuter', pic: '🎒' });
const makeP = (srv, st) => createBoard({ fetch: srv.fetch, url: 'https://x.supabase.co', key: 'pk', store: st || memStore(), profile: PROFILE });

test('scores carry the player level, title and picture', async () => {
  const srv = fakeServer(), b = makeP(srv);
  await b.submit('daily:2026-11-06', 100);
  assert.strictEqual(srv.rows[0].level, 7);
  assert.strictEqual(srv.rows[0].title, 'Commuter');
  assert.strictEqual(srv.rows[0].pic, '🎒');
});

test('top rows return level, title and picture', async () => {
  const srv = fakeServer(), b = makeP(srv);
  await b.submit('daily:2026-11-06', 100);
  const top = await b.top('daily:2026-11-06', 3);
  assert.strictEqual(top[0].level, 7); assert.strictEqual(top[0].title, 'Commuter'); assert.strictEqual(top[0].pic, '🎒');
});

test('before the database has the new columns, scores still go through without them', async () => {
  const srv = fakeServer({ oldSchema: true }), b = makeP(srv);
  assert.strictEqual(await b.submit('daily:2026-11-06', 100), 'sent');
  assert.strictEqual(srv.rows.length, 1);
  assert.strictEqual(srv.rows[0].level, undefined);
  const top = await b.top('daily:2026-11-06', 3);
  assert.strictEqual(top.length, 1, 'the board still reads');
});

test('bad stored and received names fall back safely', async () => { const srv=fakeServer(), st=memStore(); st.set('excuseme_online_name', JSON.stringify('sh1t')); const b=make(srv,st); assert.notEqual(b.playerName(),'sh1t'); srv.rows.push({name:'f0ck',score:30,user_id:'other'}); assert.equal((await b.top('classic:airport',20))[0].name,'Player'); });

test('race top twenty also includes your own ranked place', async () => {
 const st=memStore(); st.set('excuseme_online_session', JSON.stringify({user_id:'me'}));
 const fetch=async url => ({ok:true, headers:{get:()=> '0-0/25'}, json:async()=>url.includes('user_id=eq.me')?[{user_id:'me',name:'My Racer',score:1900000}]:url.includes('score=gt.')?[]:Array.from({length:20},(_,i)=>({user_id:'p'+i,name:'Other Racer',score:1990000-i}))});
 const b=createBoard({fetch,url:'https://fake',key:'pk',store:st}); const rows=await b.top('race:airport',20);assert.equal(rows.length,21);assert.equal(rows[20].rank,26);assert.equal(rows[20].you,true);
});
test('legacy and mp2 queues retain original full identities across reload and retry', async()=>{
 const srv=fakeServer({down:true}),st=memStore();const first=make(srv,st);
 const ids=['daily:2026-11-10','daily:2026-11-10:mp2','weekly:2026-W46','weekly:2026-W46:mp2'];
 for(let i=0;i<ids.length;i++)await first.submit(ids[i],100+i);
 srv.setDown(false);await make(srv,st).flush();await make(srv,st).flush();
 assert.deepStrictEqual(srv.rows.map(r=>r.board).sort(),ids.sort());assert.equal(srv.rows.length,4);
});
