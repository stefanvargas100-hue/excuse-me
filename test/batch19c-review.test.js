// Batch 19c independent review: adversarial Cup preset validation and full-length Cup behaviour (Tokyo became 4 races in batch 21). Probes only; no production code.
const test = require('node:test');
const assert = require('node:assert');
const { buildSync } = require('esbuild');
const { load, readyPlayers } = require('./harness.js');

const mod = { exports: {} };
new Function('module', 'exports', buildSync({ entryPoints: ['src/sim/friendcup.js'], bundle: true, format: 'cjs', write: false }).outputFiles[0].text)(mod, mod.exports);
const C = mod.exports;
const NY = [1, 3, 4, 5], TOKYO = [2, 6, 7, 8], DT = 1 / 30, J = x => JSON.stringify(x);
const settle = () => new Promise(r => setTimeout(r, 5));
const base = stages => ({ seed: 'abcd-efgh', stages, difficulty: 1, players: [{ id: 'p0', name: 'mia' }, { id: 'p1', name: 'leo' }], rand: () => 0 });

test('sim: only the two exact presets build a Cup', () => {
  assert.ok(C.newFriendCup(base(NY)) && C.newFriendCup(base(TOKYO)));
  const bad = [[3, 1, 4, 5], [1, 3, 5, 4], [6, 2], [0], [0, 0], [], [1, 3, 4, 5, 1], [1, 3, 4, 5, 2, 6], [2, 6, 2], [2], [6], [1, 3, 4], [2, 6, 0], [2, 6],
    [1.5, 3, 4, 5], ['1', '3', '4', '5'], [1, 3, 4, '5'], [NaN, 3, 4, 5], [1, 3, 4, 5.0000001], [null, 3, 4, 5], [[1], 3, 4, 5], [true, 3, 4, 5], [2, 6.0000001], [-0, 6]];
  for (const stages of bad) assert.strictEqual(C.newFriendCup(base(stages)), null, J(stages));
  for (const stages of [null, undefined, 'abcd', 12, {}, { length: 4, 0: 1, 1: 3, 2: 4, 3: 5 }, new Set(NY)]) assert.strictEqual(C.newFriendCup(base(stages)), null);
});

test('sim: huge, sparse and hostile arrays are rejected fast and never throw', () => {
  const t = Date.now();
  for (const stages of [new Array(2 ** 32 - 1), new Array(1e7).fill(1), Array.from({ length: 1e6 }, (_, i) => i), new Array(4), new Array(2)]) assert.strictEqual(C.newFriendCup(base(stages)), null);
  assert.ok(Date.now() - t < 1000, 'rejection stays cheap');
  const proxyThrows = new Proxy([1, 3, 4, 5], { get() { throw new Error('boom'); } });
  assert.strictEqual(C.newFriendCup(base(proxyThrows)), null);
  const holes = [1, , 4, 5]; assert.strictEqual(C.newFriendCup(base(holes)), null);
  const sub = Object.setPrototypeOf([1, 3, 4, 5], { __proto__: Array.prototype }); assert.ok(C.newFriendCup(base(sub)), 'plain prototype chain is harmless');
  const polluted = [1, 3, 4]; Object.defineProperty(polluted, 3, { get() { return 5; } }); // data copy must be real numbers
  const c = C.newFriendCup(base(polluted)); if (c) assert.deepStrictEqual(c.stages, NY);
});

test('sim: a getter that changes after the check cannot smuggle a non-preset into the cleaned setup (local object only; S4, unreachable from JSON)', { todo: 'S4: cleanSetup validates then re-reads raw.stages' }, () => {
  let n = 0;
  const flip = new Proxy([1, 3, 4, 5], { get(t, k, r) { if (k === '3' && ++n > 1) return 99; return Reflect.get(t, k, r); } });
  const c = C.newFriendCup(base(flip));
  if (c) assert.deepStrictEqual(c.stages, NY, 'cleaned stages must still be a preset: ' + J(c.stages));
});

test('sim: a Cup is over after stages.length races, and extra races are refused', () => {
  for (const stages of [NY, TOKYO]) {
    let c = C.newFriendCup(base(stages));
    const rows = c => c.racers.map((r, i) => ({ id: r.id, place: i + 1, time: 50 + i }));
    for (let i = 0; i < stages.length; i++) { assert.strictEqual(C.friendCupOver(c), false); assert.strictEqual(C.currentStage(c), stages[i]); c = C.addRace(c, rows(c)); assert.ok(c); }
    assert.strictEqual(C.friendCupOver(c), true); assert.strictEqual(C.addRace(c, rows(c)), null);
  }
  // a tampered cleaned setup with a longer rounds list is also refused by cleanSetup
  assert.strictEqual(C.cleanSetup({ seed: 'abcd', stages: [2, 6, 1, 3], difficulty: 1, racers: [] }), null);
});

/* ---- room level ---- */
function hub() {
  const members = [], H = { log: [], drop: null }; let made = 0;
  H.factory = () => {
    const me = { handlers: [], joined: false, idx: made++ };
    me.api = {
      join: async () => { me.joined = true; members.push(me); },
      send: (ev, d) => { if (!me.joined) return; const text = JSON.stringify(d), copy = JSON.parse(text); H.log.push({ ev, data: copy, from: me.idx });
        for (const o of members) if (o !== me) Promise.resolve().then(() => o.handlers.forEach(h => h(ev, JSON.parse(text)))); },
      leave: () => { me.joined = false; const i = members.indexOf(me); if (i >= 0) members.splice(i, 1); },
      onMessage: f => me.handlers.push(f), onClose: () => {}
    };
    return me.api;
  };
  return H;
}
const idOf = g => g.lobbyPlayers().find(p => p.me).id;
async function room(n, opts = {}) {
  const H = hub(), games = [];
  for (let i = 0; i < n; i++) { const g = load(undefined, opts.load); g.useRoomFactory(H.factory); games.push(g); }
  const code = await games[0].hostRoom(0);
  for (let i = 1; i < n; i++) { assert.strictEqual(await games[i].joinRoom(code), true); await settle(); }
  await settle();
  return { H, games, host: games[0], guests: games.slice(1), code, ids: games.map(idOf) };
}
const quiet = games => { for (const g of games) if (g.S?.race) { g.S.race.countT = 0; g.S.people.length = 0; g.S.nextChunk = 1e9; } };
const tickAll = (games, frames = 1) => { for (let i = 0; i < frames; i++) for (const g of games) g.tick(DT); };
async function finishOrder(games, order) { for (const i of order) { if (games[i].state === 'play') games[i].S.pz = games[i].LV.goal + 1; tickAll(games, 3); await settle(); } await settle(); }
async function cupRoom(n, stages, opts = {}) {
  const L = await room(n, opts);
  assert.strictEqual(L.host.setRoomCup({ stages, difficulty: 1, bots: opts.bots }), true); await settle();
  await readyPlayers(L.games); L.host.hostStart(); await settle(); await settle(); quiet(L.games);
  return L;
}
const next = async L => { L.host.requestRematch(); await settle(); await settle(); quiet(L.games); };
const rosterOf = H => H.log.filter(m => m.ev === 'roster').at(-1).data;

test('room: a guest rejects every non-preset roster cupCfg (inert), including huge arrays, and the room does not stall', async () => {
  const L = await room(2); L.host.setRoomCup({ stages: NY, difficulty: 1, bots: 0 }); await settle();
  const g = L.guests[0], snap = JSON.parse(J(rosterOf(L.H))); let rev = snap.rev + 100;
  const bad = [[3, 1, 4, 5], [6, 2], [0], [1, 3, 4], [1, 3, 4, 5, 5], [1, 3, 4, 5, 2, 6], [1.5, 3, 4, 5], ['1', '3', '4', '5'], [], [0, 1, 2, 3], Array.from({ length: 2e5 }, () => 1), 'x', 5, { 0: 1, length: 4 }, null];
  const t = Date.now();
  for (const stages of bad) {
    g.injectRoomMessage('roster', { ...snap, rev: rev++, cupCfg: { ...snap.cupCfg, stages } });
    assert.strictEqual(g.roomCup().valid, false, J(stages).slice(0, 40));
    assert.match(g.lobbyStatus(), /host is choosing/);
  }
  assert.ok(Date.now() - t < 3000, 'validation stays fast');
  g.injectRoomMessage('roster', { ...snap, rev: rev++ });   // the honest one restores it
  assert.strictEqual(g.roomCup().valid, true);
});

test('room: a Cup state message for another preset, a longer one, or with too many rounds is dropped', async () => {
  const L = await cupRoom(2, TOKYO, { bots: 0 }), g = L.guests[0];
  await finishOrder(L.games, [0, 1]);
  const m = L.H.log.filter(x => x.ev === 'cup').at(-1).data; let rev = m.rev + 50;
  const state = J(g.friendCup());
  const bad = [
    { setup: { ...m.setup, stages: NY } },                                                        // a real preset, but not the one agreed
    { setup: { ...m.setup, stages: [2, 6, 1, 3] } }, { setup: { ...m.setup, stages: [6, 2] } }, { setup: { ...m.setup, stages: [2] } }, { setup: { ...m.setup, stages: [2, 6] } },
    { rounds: Array.from({ length: TOKYO.length + 1 }, () => m.rounds[0]) },                       // one round more than the Cup has
    { rounds: Array.from({ length: 1e5 }, () => m.rounds[0]) }
  ];
  for (const b of bad) { g.injectRoomMessage('cup', { ...m, rev: rev++, ...b }); await settle(); assert.strictEqual(J(g.friendCup()), state, 'dropped ' + J(b).slice(0, 60)); }
});

test('room: before the race starts, a host Cup message may carry a different preset than the agreed roster cupCfg (S4: not bound)', { todo: 'S4: cupFromMessage never compares setup.stages with cupCfg.stages' }, async () => {
  const L = await room(2), g = L.guests[0];
  L.host.setRoomCup({ stages: TOKYO, difficulty: 1, bots: 0 }); await settle(); await readyPlayers(L.games);
  L.H.drop = ev => ev === 'cup' || ev === 'start' || ev.startsWith('lobby:');
  L.host.hostStart(); await settle();
  const m = L.H.log.filter(x => x.ev === 'cup').at(-1).data;
  g.injectRoomMessage('cup', { ...m, rev: m.rev + 9, setup: { ...m.setup, stages: NY } }); await settle();
  assert.strictEqual(g.friendCup(), null, 'a Cup different from the agreed config should be dropped');
});

test('room: a Tokyo Cup ends after its last race with eyebrow, final standings, new-Cup button and the award intact', async () => {
  const L = await cupRoom(3, TOKYO, { load: { dom: true } }), { games } = L;
  tickAll(games, 6); await settle();
  await finishOrder(games, [1, 0, 2]); tickAll(games, 40); await settle();
  for (const g of games) { assert.match(g.element('endEyebrow').textContent, new RegExp('race 1 of ' + TOKYO.length + ' · ')); assert.strictEqual(g.friendCupOver(), false); }
  for (let k = 2; k <= TOKYO.length; k++) { await next(L); tickAll(games, 6); await settle(); await finishOrder(games, [0, 1, 2]); tickAll(games, 40); await settle(); }
  for (const g of games) {
    assert.strictEqual(g.friendCup().rounds.length, TOKYO.length); assert.strictEqual(g.friendCupOver(), true);
    assert.match(g.element('endEyebrow').textContent, /final standings/i);
    assert.match(g.element('again').textContent, /new Cup/);
    const mine = idOf(g), total = g.friendCup().rounds.reduce((s, r) => s + [10, 8, 6, 5, 4, 3, 2, 1][r.find(x => x.id === mine).place - 1], 0);
    assert.strictEqual(g.element('sBest').textContent, String(total));
    assert.strictEqual(g.element('sChain').textContent.startsWith('+'), true);
  }
  assert.strictEqual(J(games[1].friendCupStandings().map(r => [r.id, r.points])), J(games[0].friendCupStandings().map(r => [r.id, r.points])));
});

test('room: host leaves between races of a Tokyo Cup; the new host starts race 2 and the Cup ends after the last', async () => {
  const L = await cupRoom(3, TOKYO, { load: { dom: true } }), { games, host, guests } = L;
  tickAll(games, 6); await settle();
  await finishOrder(games, [0, 1, 2]); tickAll(games, 40); await settle();
  host.leaveRoom(); await settle();
  const [h, g] = guests;
  assert.strictEqual(h.friendCup().ended, false);
  assert.match(h.element('again').textContent, /Start race 2/);
  for (let k = 2; k <= TOKYO.length; k++) { h.requestRematch(); await settle(); await settle(); quiet(guests); await finishOrder(guests, [0, 1]); tickAll(guests, 40); await settle(); }
  for (const x of guests) { assert.strictEqual(x.friendCup().rounds.length, TOKYO.length); assert.strictEqual(x.friendCupOver(), true); assert.match(x.element('endEyebrow').textContent, /final/i); }
  assert.strictEqual(J(g.friendCupStandings().map(r => r.id)), J(h.friendCupStandings().map(r => r.id)));
});

test('room: host leaves mid last race of a Tokyo Cup; the race counts and the Cup is over', async () => {
  const L = await cupRoom(3, TOKYO, { load: { dom: true } }), { games, host, guests } = L;
  tickAll(games, 6); await settle();
  for (let k = 1; k < TOKYO.length; k++) { await finishOrder(games, [0, 1, 2]); await next(L); tickAll(games, 6); await settle(); }
  host.leaveRoom(); await settle();
  await finishOrder(guests, [0, 1]); tickAll(guests, 40); await settle();
  for (const x of guests) { assert.strictEqual(x.friendCup().rounds.length, TOKYO.length); assert.strictEqual(x.friendCupOver(), true); assert.notStrictEqual(x.element('endTitle').textContent, 'Host left'); }
});

test('room: a late-joining/reconnecting guest accepts the full Tokyo Cup state and rejects it with the wrong PROTO', async () => {
  const L = await cupRoom(2, TOKYO, { bots: 0 }), g = L.guests[0];
  await finishOrder(L.games, [0, 1]); for (let k = 2; k <= TOKYO.length; k++) { await next(L); await finishOrder(L.games, [0, 1]); }
  const m = L.H.log.filter(x => x.ev === 'cup').at(-1).data;
  assert.strictEqual(m.rounds.length, TOKYO.length);
  g.injectRoomMessage('cup', { ...m, rev: m.rev + 20 }); await settle();
  assert.strictEqual(g.friendCup().rounds.length, TOKYO.length); assert.strictEqual(g.friendCupOver(), true);
  const before = J(g.friendCup());
  g.injectRoomMessage('cup', { ...m, rev: m.rev + 30, proto: 10, rounds: [] }); await settle();
  assert.strictEqual(J(g.friendCup()), before);
});

test('room: bot count clamps on join and leave with a Tokyo preset, and a preset change clears guest Ready each way', async () => {
  const L = await room(2); L.host.setRoomCup({ stages: TOKYO, difficulty: 1, bots: 6 }); await settle();
  assert.strictEqual(L.host.roomCup().botCount, 6);
  const g3 = load(); g3.useRoomFactory(L.H.factory); assert.strictEqual(await g3.joinRoom(L.code), true); await settle(); L.games.push(g3);
  assert.ok(L.host.roomCup().botCount <= 5, 'clamped to free seats after a join: ' + J(L.host.roomCup()));
  assert.strictEqual(J(L.guests[0].roomCup().botCount), J(L.host.roomCup().botCount));
  await readyPlayers(L.games);
  for (const stages of [NY, TOKYO]) {
    L.host.setRoomCup({ ...L.host.roomCup(), stages }); await settle();
    for (const g of L.guests.concat(g3)) assert.strictEqual(g.lobbyPlayers().find(p => p.me).ready, false, 'Ready cleared after switching to ' + stages);
    await readyPlayers(L.games);
  }
  g3.leaveRoom(); await settle(); L.games.pop();
  assert.ok(L.host.roomCup().botCount <= 6);
  await readyPlayers(L.games);
  L.host.hostStart(); await settle(); await settle();
  for (const g of L.games) { assert.strictEqual(g.state, 'play'); assert.strictEqual(g.friendCup().stages.length, TOKYO.length); }
});
