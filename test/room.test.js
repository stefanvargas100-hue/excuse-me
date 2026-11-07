// Live room client (Supabase Realtime) with a pretend socket, and the friend's smoothed position. node --test
const test = require('node:test');
const assert = require('node:assert');
const path = require('path'), esbuild = require('esbuild');

function loadSrc(file) {
  const out = esbuild.buildSync({ entryPoints: [path.join(__dirname, '..', 'src', 'online', file)], bundle: true, format: 'cjs', write: false, logLevel: 'silent' }).outputFiles[0].text;
  const m = { exports: {} }; new Function('module', 'exports', 'require', out)(m, m.exports, require);
  return m.exports;
}
const { createRoom, makeCode, cleanCode } = loadSrc('room.js');
const { createRemote } = loadSrc('remote.js');

// A pretend WebSocket: records what the game sends and lets the test play the server.
class FakeSocket {
  constructor(url) { this.url = url; this.sent = []; FakeSocket.last = this; }
  send(s) { this.sent.push(JSON.parse(s)); }
  close() { this.closed = true; if (this.onclose) this.onclose({}); }
  open() { this.onopen && this.onopen({}); }
  serve(msg) { this.onmessage && this.onmessage({ data: JSON.stringify(msg) }); }
}
const mk = (extra) => createRoom({ WebSocket: FakeSocket, url: 'https://abc.supabase.co', key: 'pub-key', setInterval: () => 1, clearInterval() {}, ...extra });

test('room codes are short, easy to read, and cleaned up when typed', () => {
  const c = makeCode(() => 0.5);
  assert.match(c, /^[A-Z2-9]{4}$/);
  assert.ok(!/[01OIL]/.test(makeCode(() => 0.123) + makeCode(() => 0.9)), 'no look-alike letters');
  assert.strictEqual(cleanCode(' ab-c d '), 'ABCD');
  assert.strictEqual(cleanCode('abcdefgh'), 'ABCD', 'only the first four count');
});

test('joining opens the socket with the key and asks to join the room channel', async () => {
  const room = mk(); const p = room.join('ABCD');
  const ws = FakeSocket.last; ws.open();
  assert.ok(ws.url.startsWith('wss://abc.supabase.co/realtime/v1/websocket?'));
  assert.ok(ws.url.includes('apikey=pub-key'));
  const j = ws.sent.find(m => m.event === 'phx_join');
  assert.ok(j, 'asked to join');
  assert.strictEqual(j.topic, 'realtime:excuseme-ABCD');
  assert.strictEqual(j.payload.config.broadcast.self, false, 'we do not hear ourselves');
  ws.serve({ topic: j.topic, event: 'phx_reply', ref: j.ref, payload: { status: 'ok', response: {} } });
  await p;
});

test('a refused join rejects, so the screen can say so', async () => {
  const room = mk(); const p = room.join('ABCD');
  const ws = FakeSocket.last; ws.open();
  const j = ws.sent.find(m => m.event === 'phx_join');
  ws.serve({ topic: j.topic, event: 'phx_reply', ref: j.ref, payload: { status: 'error', response: {} } });
  await assert.rejects(p);
});

test('send and receive: messages go out wrapped as broadcasts and come back unwrapped', async () => {
  const room = mk(); const got = []; room.onMessage((ev, data) => got.push([ev, data]));
  const p = room.join('ABCD'); const ws = FakeSocket.last; ws.open();
  const j = ws.sent.find(m => m.event === 'phx_join');
  ws.serve({ topic: j.topic, event: 'phx_reply', ref: j.ref, payload: { status: 'ok' } }); await p;
  room.send('pos', { z: 12.5 });
  const b = ws.sent.find(m => m.event === 'broadcast');
  assert.deepStrictEqual(b.payload, { type: 'broadcast', event: 'pos', payload: { z: 12.5 } });
  ws.serve({ topic: j.topic, event: 'broadcast', payload: { type: 'broadcast', event: 'pos', payload: { z: 3 } } });
  ws.serve({ topic: 'other', event: 'broadcast', payload: { type: 'broadcast', event: 'pos', payload: { z: 99 } } });
  assert.deepStrictEqual(got, [['pos', { z: 3 }]], 'only this room, nothing else');
});

test('sending before the room is joined is dropped quietly, never throws', () => {
  const room = mk(); assert.doesNotThrow(() => room.send('pos', { z: 1 }));
});

test('leaving closes the socket and a lost connection is reported once', async () => {
  const room = mk(); let lost = 0; room.onClose(() => lost++);
  const p = room.join('ABCD'); const ws = FakeSocket.last; ws.open();
  const j = ws.sent.find(m => m.event === 'phx_join');
  ws.serve({ topic: j.topic, event: 'phx_reply', ref: j.ref, payload: { status: 'ok' } }); await p;
  ws.close(); ws.close();
  assert.strictEqual(lost, 1);
  assert.doesNotThrow(() => room.send('pos', {}));
});

test('heartbeat messages keep the connection alive', async () => {
  const timers = []; const room = mk({ setInterval: (fn, ms) => { timers.push([fn, ms]); return timers.length; }, clearInterval() {} });
  const p = room.join('ABCD'); const ws = FakeSocket.last; ws.open();
  const j = ws.sent.find(m => m.event === 'phx_join');
  ws.serve({ topic: j.topic, event: 'phx_reply', ref: j.ref, payload: { status: 'ok' } }); await p;
  assert.ok(timers.length === 1 && timers[0][1] <= 30000);
  timers[0][0]();
  assert.ok(ws.sent.some(m => m.topic === 'phoenix' && m.event === 'heartbeat'));
});

test('callbacks from a left socket cannot deliver messages or close its replacement', async () => {
  const room = mk(), got = []; let closes = 0;
  room.onMessage((...args) => got.push(args)); room.onClose(() => closes++);
  const join = async () => {
    const p = room.join('ABCD'), s = FakeSocket.last; s.open();
    const j = s.sent.find(m => m.event === 'phx_join');
    s.serve({ topic: j.topic, event: 'phx_reply', ref: j.ref, payload: { status: 'ok' } });
    await p; return s;
  };
  const old = await join(); room.leave(); await join(); const before = closes;
  old.serve({ topic: 'realtime:excuseme-ABCD', event: 'broadcast', payload: { event: 'fin', payload: { ft: 1 } } });
  old.onclose();
  assert.strictEqual(got.length, 0);
  assert.strictEqual(closes, before);
  assert.strictEqual(room.joined, true);
});

test('a half-open socket is closed when heartbeat replies stop', async () => {
  const timers = []; let closes = 0;
  const room = mk({ setInterval: f => { timers.push(f); return 1; } });
  room.onClose(() => closes++);
  const p = room.join('ABCD'), s = FakeSocket.last; s.open();
  const j = s.sent.find(m => m.event === 'phx_join');
  s.serve({ topic: j.topic, event: 'phx_reply', ref: j.ref, payload: { status: 'ok' } }); await p;
  timers[0](); timers[0]();
  assert.strictEqual(closes, 1);
  assert.strictEqual(s.closed, true);
});

/* ---------- the friend's position ---------- */
test('remote: moves smoothly toward the latest report and keeps walking between reports', () => {
  const r = createRemote();
  r.push({ n: 1, x: 1, z: 10, vx: 0, s: 4 }, 0);
  let p = r.sample(0); assert.strictEqual(p.z, 10, 'first report is shown as is, no flying in');
  p = r.sample(0.25); assert.ok(p.z > 10.5 && p.z < 11.2, 'walks on at their speed: ' + p.z);
  r.push({ n: 2, x: -1, z: 11.2, vx: -2, s: 4 }, 0.25);
  for (let t = 0.26; t < 1; t += 0.05) p = r.sample(t);
  assert.ok(Number.isFinite(p.x) && p.x < 1, 'drifts toward the new lane');
});

test('remote: does not run away when reports stop (cap), and ignores old or repeated reports', () => {
  const r = createRemote();
  r.push({ n: 5, x: 0, z: 100, vx: 0, s: 5 }, 0);
  const p = r.sample(30);
  assert.ok(p.z <= 100 + 5 * 0.8 + 1e-9, 'extrapolation is capped: ' + p.z);
  r.push({ n: 4, x: 0, z: 50, vx: 0, s: 5 }, 31);
  assert.ok(r.sample(31).z > 90, 'an older report is ignored');
  assert.strictEqual(r.lastSeen(), 0, 'silence is measured from the last accepted report');
});

test('remote: a big jump (lag spike) catches up quickly instead of gliding for seconds', () => {
  const r = createRemote();
  r.push({ n: 1, x: 0, z: 0, vx: 0, s: 4 }, 0); r.sample(0);
  r.push({ n: 2, x: 0, z: 30, vx: 0, s: 4 }, 0.1);
  let p; for (let t = 0.1; t <= 0.7; t += 0.1) p = r.sample(t);
  assert.ok(p.z > 25, 'within 0.6 s it is close: ' + p.z);
});
