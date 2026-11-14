// Batch 24: host-picked bots in plain friend races and Elimination. Host plus guests over a pretend room, no network. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load, readyPlayers, PROTO } = require('./harness.js');

const DT = 1 / 30;
const settle = () => new Promise(r => setTimeout(r, 5));
const J = x => JSON.stringify(x);
const A = x => JSON.parse(J(x));
const deq = (a, b, m) => assert.deepStrictEqual(A(a), A(b), m);   // arrays from the game come from another realm

// A pretend Realtime room. It logs every message. H.tamper(event, data, targetIndex) may change a copy for one phone, or return null to lose it.
function hub() {
  const members = [], H = { log: [], tamper: null };
  let made = 0;
  H.factory = () => {
    const me = { handlers: [], joined: false, idx: made++ };
    me.api = {
      join: async () => { me.joined = true; members.push(me); },
      send: (ev, d) => {
        if (!me.joined) return;
        const text = JSON.stringify(d);
        H.log.push({ ev, data: JSON.parse(text), from: me.idx });
        for (const o of members) {
          if (o === me) continue;
          let copy = JSON.parse(text);
          if (H.tamper) { copy = H.tamper(ev, copy, o.idx); if (copy === null) continue; }
          Promise.resolve().then(() => o.handlers.forEach(h => h(ev, copy)));
        }
      },
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
  if (opts.tamper) H.tamper = opts.tamper;
  for (let i = 0; i < n; i++) { const g = load(undefined, { dom: true }); g.useRoomFactory(H.factory); games.push(g); }
  const code = await games[0].hostRoom(opts.level ?? 1);
  for (let i = 1; i < n; i++) { assert.strictEqual(await games[i].joinRoom(code), true); await settle(); }
  await settle();
  return { H, games, host: games[0], guests: games.slice(1), code, ids: games.map(idOf) };
}
const quiet = games => { for (const g of games) if (g.S?.race) { g.S.race.countT = 0; g.S.people.length = 0; g.S.nextChunk = 1e9; } };
async function botRace(n, cfg, opts = {}) {
  const L = await room(n, opts);
  if (opts.elim) { L.host.setRoomElim(true); await settle(); }
  if (cfg) { assert.strictEqual(L.host.setRoomBots(cfg), true); await settle(); }
  await readyPlayers(L.games);
  L.host.hostStart(); await settle(); await settle();
  quiet(L.games);
  return L;
}
const tickAll = (games, frames = 1) => { for (let i = 0; i < frames; i++) for (const g of games) g.tick(DT); };
const botsOf = g => g.S.race.bots.filter(b => b.aiBot);
const board = g => { g.refreshDuelResults?.(); return g.S.race.board.map(r => r.id); };
// Racers cross the line in this order: a number is a phone's own runner, a string is a bot the host runs.
async function finishOrder(L, order) {
  for (const who of order) {
    if (typeof who === 'number') { if (L.games[who].state === 'play') L.games[who].S.pz = L.games[who].LV.goal + 1; }
    else { const b = L.host.S.race.bots.find(o => o.peerId === who); b.z = L.host.LV.goal + 0.5; }
    tickAll(L.games, 3); await settle();
  }
  tickAll(L.games, 3); await settle(); await settle();
}
// Hold each phone's runner at zs[i] (null: leave it), and each host bot at bz[id], while the messages flow.
async function drive(L, zs, bz = {}, frames = 60) {
  for (let f = 0; f < frames; f++) {
    L.games.forEach((g, i) => { if (g.state === 'play' && zs[i] != null) { g.S.pz = zs[i]; g.S.me.z = zs[i]; g.S.speed = 0; g.S.vx = 0; } });
    for (const b of L.host.S.race.bots) if (bz[b.peerId] != null) { b.z = bz[b.peerId]; b.speed = 0; b.vz = 0; }
    tickAll(L.games, 1);
    if (f % 5 === 4) await settle();
  }
  await settle();
}
const outIds = g => g.S.race.elim.out.map(o => o.id);
// The leader reaches checkpoint k only once everyone has settled where they are held: the host sees the others a moment late.
async function cross(L, k, zs, bz = {}) {
  const cp = L.host.S.race.elim.cps[k];
  await drive(L, zs.map(z => (z == null ? null : Math.min(z, cp - 2))), bz, 30);
  await drive(L, zs, bz, 80);
}

/* ---- the setting ---- */
test('the host picks bots and difficulty; guests see it; changing it asks guests to ready again', async () => {
  const { host, guests, games } = await room(3);
  deq(A(host.roomBots()), { bots: 0, difficulty: 1, botCount: 0 }, 'no bots unless the host adds them');
  assert.strictEqual(host.setRoomBots({ bots: 3, difficulty: 2 }), true); await settle();
  for (const g of games) deq(A(g.roomBots()), { bots: 3, difficulty: 2, botCount: 3 });
  assert.strictEqual(guests[0].setRoomBots({ bots: 1, difficulty: 0 }), false, 'only the host decides');
  assert.strictEqual(host.setRoomBots({ bots: 6, difficulty: 2 }), false, 'three players leave five free seats');
  assert.strictEqual(host.setRoomBots({ bots: 2, difficulty: 3 }), false);
  assert.strictEqual(host.setRoomBots({ bots: 1.5, difficulty: 1 }), false);
  assert.strictEqual(host.setRoomBots({ bots: 'fill', difficulty: 0 }), true); await settle();
  for (const g of games) deq(A(g.roomBots()), { bots: 'fill', difficulty: 0, botCount: 5 });
  await readyPlayers(games);
  assert.strictEqual(host.canStartRoom(), true);
  host.setRoomBots({ bots: 2, difficulty: 0 }); await settle();
  assert.strictEqual(host.canStartRoom(), false, 'a guest agreed to a different field');
  await readyPlayers(games);
  assert.strictEqual(host.canStartRoom(), true);
  host.setRoomElim(true); await settle();
  for (const g of games) assert.strictEqual(g.roomBots().botCount, 2, 'Elimination keeps the bots');
});

test('a start still needs two real players: bots never count', async () => {
  const { host } = await room(1);
  assert.strictEqual(host.setRoomBots({ bots: 3, difficulty: 1 }), true);
  host.setRoomReady(true);
  assert.strictEqual(host.canStartRoom(), false);
  host.hostStart(); await settle();
  assert.notStrictEqual(host.state, 'play');
});

/* ---- plain race ---- */
test('a plain race with 3 bots runs to the end; every phone shows the same bots and places', async () => {
  const L = await botRace(3, { bots: 3, difficulty: 2 }), { games, host, ids } = L;
  const bots = ['bot:0', 'bot:1', 'bot:2'];
  for (const g of games) {
    assert.strictEqual(g.state, 'play');
    deq(botsOf(g).map(b => b.peerId).sort(), bots);
    assert.strictEqual(g.S.race.bots.length, 5, 'two friends and three bots');
    assert.strictEqual(g.S.duel.title, '2 friends + 3 bots', 'the results name bots apart from friends');
    for (const id of bots) assert.ok(g.S.duel.slotOf[id] >= 3, 'bots line up behind the players');
    assert.ok(!bots.some(id => ids.includes(id)));
  }
  const view = g => bots.map(id => { const b = g.S.race.bots.find(o => o.peerId === id); return [b.name, b.shirt, b.hair, b.body]; });
  for (const g of L.guests) deq(view(g), view(host), 'same names and looks everywhere');
  assert.ok(botsOf(host).every(b => !b.remote && b.diff.name === 'Hard'), 'the host runs Hard bots');
  assert.ok(L.guests.every(g => botsOf(g).every(b => b.remote)), 'guests draw them from the host');
  tickAll(games, 30); await settle(); tickAll(games, 30); await settle();
  for (const g of L.guests) for (const id of bots) {
    const hb = host.S.race.bots.find(o => o.peerId === id), gb = g.S.race.bots.find(o => o.peerId === id);
    assert.ok(hb.z > 1 && Math.abs(hb.z - gb.z) < 4, 'guests see bots where the host has them, a moment behind as for any racer: ' + hb.z + ' vs ' + gb.z);
  }
  await finishOrder(L, ['bot:1', 1, 'bot:0', 0, 2, 'bot:2']);
  const expected = ['bot:1', ids[1], 'bot:0', ids[0], ids[2], 'bot:2'];
  for (const g of games) {
    deq(board(g), expected, 'same places on every phone');
    assert.ok(g.S.race.board.every(r => r.done), 'everyone, bots included, finished: ' + J(g.S.race.board.map(r => [r.id, r.done, r.finishT])));
  }
  assert.ok(L.H.log.some(m => m.ev === 'bots' && m.from === 0), 'the host reports the bots');
  assert.ok(!L.H.log.some(m => m.ev === 'bots' && m.from !== 0), 'nobody else does');
  assert.ok(!L.H.log.some(m => m.ev === 'ghost' && String(m.data.id).startsWith('bot:')), 'bots send no ghosts');
  // a rematch brings the same number of bots, checked again
  for (const g of games) g.requestRematch();
  await settle(); await settle(); await settle();
  for (const g of games) { assert.strictEqual(g.state, 'play', 'rematch'); assert.strictEqual(botsOf(g).length, 3); }
  for (const g of L.guests) deq(view(g), view(host));
});

test('spectating a finished race can follow a bot', async () => {
  const L = await botRace(2, { bots: 2, difficulty: 1 }), guest = L.guests[0];
  tickAll(L.games, 30); await settle();
  L.host.S.pz = 0;
  await finishOrder(L, [1]);
  tickAll(L.games, 30); await settle();
  assert.strictEqual(guest.state, 'won');
  const t = guest.S.race.spectate.target;
  assert.ok(t, 'a racer to watch');
  assert.ok(botsOf(guest).includes(t) || t.peerId === L.ids[0]);
  assert.ok(botsOf(guest).some(b => b.peerId === 'bot:0'));
});

test('the host leaving mid-race: bots stop, unfinished, and the players race on', async () => {
  const L = await botRace(3, { bots: 2, difficulty: 1 }), { guests, ids } = L;
  tickAll(L.games, 30); await settle();
  L.host.leaveRoom(); await settle(); await settle();
  for (const g of guests) {
    assert.strictEqual(g.state, 'play', 'players race on');
    for (const id of ['bot:0', 'bot:1']) { assert.strictEqual(g.S.duel.peers[id].fin, null); assert.strictEqual(g.S.duel.peers[id].bye, true); }
  }
  await finishOrder({ ...L, games: guests, host: guests[0] }, [1, 0]);
  for (const g of guests) {
    const rows = g.S.race.board;
    deq(rows.slice(0, 2).map(r => r.id), [ids[2], ids[1]]);
    for (const id of ['bot:0', 'bot:1']) { const r = rows.find(x => x.id === id); assert.ok(r && r.dnf && !r.done, 'listed as not finished'); }
  }
});

/* ---- Elimination ---- */
test('Elimination with bots: the host knocks bots out by the same rule, and every phone agrees', async () => {
  const L = await botRace(3, { bots: 2, difficulty: 1 }, { elim: true }), { games, ids } = L;
  for (const g of games) { assert.ok(g.S.race.elim); assert.strictEqual(g.S.race.elim.cps.length, 4, 'five racers, four checkpoints'); }
  const c = Array.from(L.host.S.race.elim.cps);
  await cross(L, 0, [c[0] + 5, c[0] - 10, c[0] - 20], { 'bot:0': c[0] - 15, 'bot:1': c[0] - 60 });
  for (const g of games) { deq(outIds(g), ['bot:1'], 'the last racer is a bot, and it goes'); assert.ok(!g.S.race.bots.some(b => b.peerId === 'bot:1')); }
  await cross(L, 1, [c[1] + 5, c[1] - 10, c[1] - 30], { 'bot:0': c[1] - 15 });
  for (const g of games) deq(outIds(g), ['bot:1', ids[2]]);
  assert.strictEqual(games[2].state, 'lost');
  await cross(L, 2, [c[2] + 5, c[2] - 10, null], { 'bot:0': c[2] - 40 });
  for (const g of games) deq(outIds(g), ['bot:1', ids[2], 'bot:0']);
  await cross(L, 3, [c[3] + 5, c[3] - 10, null], {});
  for (const g of games) deq(outIds(g), ['bot:1', ids[2], 'bot:0', ids[1]]);
  assert.strictEqual(L.host.state, 'won');
  const names = g => g.S.race.board.map(r => r.name === 'You' ? null : r.name);
  const hostRows = L.host.S.race.board.map(r => r.out || 0), guestRows = games[1].S.race.board.map(r => r.out || 0);
  deq(hostRows, [0, 4, 3, 2, 1]);
  deq(guestRows, [0, 4, 3, 2, 1]);
  deq(names(L.host).slice(2), names(games[1]).slice(2), 'same names for the eliminated');
});

test('an eliminated host keeps running the bots and deciding', async () => {
  const L = await botRace(2, { bots: 2, difficulty: 1 }, { elim: true }), { games, ids } = L;
  const c = Array.from(L.host.S.race.elim.cps);
  await drive(L, [c[0] - 80, c[0] + 5], { 'bot:0': c[0] - 10, 'bot:1': c[0] - 20 }, 80);
  for (const g of games) deq(outIds(g), [ids[0]]);
  const b = L.host.S.race.bots.find(o => o.peerId === 'bot:0'), z0 = b.z;
  await drive(L, [null, c[0] + 6], {}, 30);
  assert.ok(b.z > z0 + 0.5, 'the bots still run on the eliminated host: ' + z0 + ' to ' + b.z);
  await drive(L, [null, c[1] + 5], { 'bot:0': c[1] - 50, 'bot:1': c[1] - 10 }, 80);
  for (const g of games) deq(outIds(g), [ids[0], 'bot:0']);
});

/* ---- what guests accept ---- */
const fieldBad = ids => [
  ['no field at all', () => null],
  ['a bot id out of order', m => ({ ...m, bots: [m.bots[0], { ...m.bots[1], id: 'bot:5' }] })],
  ['too many bots', m => ({ ...m, bots: [...m.bots, { id: 'bot:2', name: 'Nora' }] })],
  ['too few bots', m => ({ ...m, bots: m.bots.slice(0, 1) })],
  ['a bot with a player id', m => ({ ...m, bots: [m.bots[0], { ...m.bots[1], id: ids[1] }] })],
  ['a bot named like a player', m => ({ ...m, bots: [m.bots[0], { ...m.bots[1], name: 'Not a bot name' }] })],
  ['two bots with one name', m => ({ ...m, bots: [m.bots[0], { ...m.bots[1], name: m.bots[0].name }] })],
  ['another difficulty', m => ({ ...m, difficulty: (m.difficulty + 1) % 3 })],
  ['a bad difficulty', m => ({ ...m, difficulty: 1.5 })],
  ['a bad number', m => ({ ...m, difficulty: null })],
  ['bots not a list', m => ({ ...m, bots: 'x' })],
  ['another race', m => ({ ...m, race: 'ZZZZ:9' })]
];
test('a guest refuses a start whose bot field is missing or wrong, and never runs it', async () => {
  for (let k = 0; ; k++) {
    let bad = null;
    const L = await room(3, { tamper: (ev, data, to) => (ev === 'field' && to === 1 && bad ? bad[1](data) : data) });
    const list = fieldBad(L.ids);
    if (k >= list.length) break;
    bad = list[k];
    L.host.setRoomBots({ bots: 2, difficulty: 2 }); await settle();
    await readyPlayers(L.games);
    L.host.hostStart(); await settle(); await settle();
    const victim = L.games[1];
    assert.notStrictEqual(victim.state, 'play', bad[0] + ': refused');
    assert.match(victim.lobbyStatus(), /Start could not be confirmed/, bad[0]);
    assert.strictEqual(L.games[2].state, 'play', bad[0] + ': the untouched guest races');
    assert.strictEqual(botsOf(L.games[2]).length, 2);
    for (const g of L.games) g.leaveRoom();
  }
});

test('a field in a room without bots changes nothing', async () => {
  const L = await room(2);
  L.guests[0].injectRoomMessage('field', { proto: PROTO, id: L.ids[0], race: L.code + ':1', difficulty: 1, bots: [{ id: 'bot:0', name: 'Mia' }] });
  await readyPlayers(L.games);
  L.host.hostStart(); await settle(); await settle();
  for (const g of L.games) { assert.strictEqual(g.state, 'play'); assert.strictEqual(botsOf(g).length, 0); }
});

test('malformed bot rows are refused; real players are never moved by them', async () => {
  const L = await botRace(3, { bots: 2, difficulty: 1 }, { tamper: (ev, data, to) => (ev === 'bots' && to === 1 ? null : data) });
  const guest = L.guests[0], ids = L.ids;
  tickAll([guest], 6);
  const seed = guest.S.seed, peer = id => guest.S.duel.peers[id];
  const good = ['bot:0', 1, 5, 0, 2, null], msg = o => ({ proto: PROTO, id: ids[0], race: seed, n: 5, rows: [good], ...o });
  const bad = [
    { rows: 'x' }, { rows: [good, ['bot:5', 1, 5, 0, 2, null]] }, { rows: [good, ['nobody', 1, 5, 0, 2, null]] }, { rows: [good, ['bot:1', NaN, 5, 0, 2, null]] },
    { rows: [good, ['bot:1', 1e6, 5, 0, 2, null]] }, { rows: [good, ['bot:1', 1, 5, 0, 2, -3]] }, { rows: Array.from({ length: 8 }, () => good) },
    { n: 'x' }, { race: 'other:1' }, { id: ids[2] }
  ];
  for (const b of bad) {
    guest.injectRoomMessage('bots', msg(b)); await settle();
    assert.strictEqual(peer('bot:0').remote.lastSeen(), 0, 'nothing applied: ' + J(b).slice(0, 80));
    assert.strictEqual(peer('bot:0').fin, null);
  }
  guest.injectRoomMessage('bots', msg({})); await settle();
  assert.ok(peer('bot:0').remote.lastSeen() > 0, 'the good one is');
  guest.injectRoomMessage('bots', msg({ n: 6, rows: [[ids[2], 1, 60, 0, 2, 3]] })); await settle();
  assert.strictEqual(peer(ids[2]).remote.lastSeen(), 0, 'real players report for themselves');
  assert.strictEqual(peer(ids[2]).fin, null);
});

/* ---- rooms with no bots are unchanged ---- */
// Recorded from the build before batch 24 (PROTO 13): every kind of message a 0-bot room sends, and the places.
const BASELINE = {"plain":{"sigs":["bye:ft,id,outcomes,proto,race,session","bye:ft,id,proto,race,session","fin:ft,id,proto,race,session","lobby:commit:id,plan,proto,protocol,session","lobby:committed:config,id,planId,proto,protocol,session","lobby:go:id,plan,proto,protocol,session","lobby:ping:id,nonce,proto,protocol,session,to","lobby:pong:hostTime,id,nonce,proto,protocol,session,to","lobby:prepare:id,plan,proto,protocol,session","lobby:prepared:config,id,planId,proto,protocol,session","lobby:ready:clock,config,id,n,proto,protocol,ready,rtt,session","lobby:state:config,elim,id,level,phase,plan,players,proto,protocol,rev,session","outcomes:id,outcomes,proto,race,rev,session","pos:id,n,proto,race,route,s,session,vx,x,z","roster:elim,id,level,lobby,players,proto,rev,session"],"places":[[2,0,1],[2,0,1],[2,0,1]]},"elim":{"sigs":["bye:id,outcomes,proto,race,session","bye:id,proto,race,session","elim:id,out,proto,race,rev,session","lobby:commit:id,plan,proto,protocol,session","lobby:committed:config,id,planId,proto,protocol,session","lobby:go:id,plan,proto,protocol,session","lobby:ping:id,nonce,proto,protocol,session,to","lobby:pong:hostTime,id,nonce,proto,protocol,session,to","lobby:prepare:id,plan,proto,protocol,session","lobby:prepared:config,id,planId,proto,protocol,session","lobby:ready:clock,config,id,n,proto,protocol,ready,rtt,session","lobby:state:config,elim,id,level,phase,plan,players,proto,protocol,rev,session","pos:id,n,proto,race,route,s,session,vx,x,z","roster:elim,id,level,lobby,players,proto,rev,session"],"out":[[2,1],[2,1],[2,1]]}};
async function zeroBotRun(touch) {
  const sig = H => [...new Set(H.log.filter(m => m.ev !== 'hello' && m.ev !== 'ghost').map(m => m.ev + ':' + Object.keys(m.data).sort().join(',')))].sort();
  const plain = await room(3);
  if (touch) { const i0 = plain.H.log.length; plain.host.setRoomBots({ bots: 2, difficulty: 2 }); await settle(); plain.H.log.splice(i0); plain.host.setRoomBots({ bots: 0, difficulty: 1 }); await settle(); }
  await readyPlayers(plain.games);
  plain.host.hostStart(); await settle(); await settle(); quiet(plain.games);
  tickAll(plain.games, 6); await settle();
  await finishOrder(plain, [2, 0, 1]);
  const places = plain.games.map(g => board(g).map(id => plain.ids.indexOf(id)));
  const e = await room(3);
  e.host.setRoomElim(true); await settle();
  if (touch) { const i0 = e.H.log.length; e.host.setRoomBots({ bots: 1, difficulty: 0 }); await settle(); e.H.log.splice(i0); e.host.setRoomBots({ bots: 0, difficulty: 1 }); await settle(); }
  await readyPlayers(e.games);
  e.host.hostStart(); await settle(); await settle(); quiet(e.games);
  const c = Array.from(e.host.S.race.elim.cps);
  await drive(e, [c[0] + 5, c[0] - 10, c[0] - 40], {}, 80);
  await drive(e, [c[1] + 5, c[1] - 10, null], {}, 80);
  const out = e.games.map(g => outIds(g).map(id => e.ids.indexOf(id)));
  for (const g of [...plain.games, ...e.games]) g.leaveRoom();
  return { plain: { sigs: sig(plain.H), places }, elim: { sigs: sig(e.H), out } };
}
test('a room with no bots sends the same messages and gets the same places and eliminations as before', async () => {
  deq(await zeroBotRun(false), BASELINE);
});
test('a room whose host adds bots and takes them away again is the same as one that never had any', async () => {
  deq(await zeroBotRun(true), BASELINE);
});
