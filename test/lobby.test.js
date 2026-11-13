// Lobby for 2-4 phones: join, roster, start, drop-outs, rematch. Pretend room, no network. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load, readyPlayers } = require('./harness.js');

const DT = 1 / 30;
const settle = () => new Promise(r => setTimeout(r, 5));

// A pretend room that connects every game that joins it.
function hub() {
  const members = [];
  return () => {
    const me = { handlers: [], closers: [], joined: false };
    me.api = {
      join: async () => { me.joined = true; members.push(me); },
      send: (ev, d) => { if (!me.joined) return; const copy = JSON.parse(JSON.stringify(d)); for (const o of members) if (o !== me) Promise.resolve().then(() => o.handlers.forEach(h => h(ev, copy))); },
      leave: () => { me.joined = false; const i = members.indexOf(me); if (i >= 0) members.splice(i, 1); },
      onMessage: f => me.handlers.push(f), onClose: f => me.closers.push(f)
    };
    return me.api;
  };
}

// n games in one room; the first is the host. Returns them with the room code.
async function lobby(n, options) {
  const H = hub(), games = [];
  for (let i = 0; i < n; i++) { const g = load(null, options); g.useRoomFactory(H); games.push(g); }
  const code = await games[0].hostRoom(1);
  for (let i = 1; i < n; i++) { assert.strictEqual(await games[i].joinRoom(code), true, 'player ' + (i + 1) + ' joined'); await settle(); }
  await settle();
  await readyPlayers(games);
  return { games, host: games[0], code };
}
const tickAll = (games, frames) => { for (let i = 0; i < frames; i++) for (const g of games) g.tick(DT); };
const botsOf = g => g.S.race.bots.filter(b => b.remote);
const finish = (games, who) => { who.S.pz = who.LEVELS[1].goal - 12; let t = 0; while (who.state === 'play' && t++ < 30 * 600) tickAll(games, 1); tickAll(games, 60); };

test('everyone in the room sees the same list of players, host first', async () => {
  const { games } = await lobby(4);
  for (const g of games) {
    const r = g.lobbyPlayers();
    assert.strictEqual(r.length, 4);
    assert.strictEqual(r.filter(p => p.me).length, 1, 'exactly one of them is me');
    assert.strictEqual(r[0].host, true); assert.strictEqual(r.filter(p => p.host).length, 1);
  }
  const ids = g => g.lobbyPlayers().map(p => p.id).join(',');
  assert.strictEqual(ids(games[1]), ids(games[0])); assert.strictEqual(ids(games[3]), ids(games[0]));
});

// (the room size limit moved from 4 to 8: "a room holds 8 players and refuses the ninth" is in lobby8.test.js)

test('the host cannot start alone, and starting puts everyone on the same race', async () => {
  const solo = await lobby(1);
  solo.host.hostStart(); await settle();
  assert.notStrictEqual(solo.host.state, 'play', 'nobody to race');
  for (const n of [2, 3, 4]) {
    const { games, code } = await lobby(n);
    games[0].hostStart(); await settle();
    for (const g of games) {
      assert.strictEqual(g.state, 'play'); assert.strictEqual(g.S.seed, code + ':1');
      assert.strictEqual(botsOf(g).length, n - 1, 'sees every other player: ' + n);
      assert.strictEqual(g.S.race.bots.length, n - 1, 'and no computer bots');
    }
  }
});

test('only the host can start a race', async () => {
  const { games } = await lobby(3);
  games[1].hostStart(); await settle();
  assert.notStrictEqual(games[0].state, 'play'); assert.notStrictEqual(games[2].state, 'play');
  games[0].duelReceive('start', { level: 0, seed: 'zzzz:9' });   // a stray start is no use either
  assert.notStrictEqual(games[0].state, 'play');
});

test('a start message from someone who is not the host is ignored', async () => {
  const { games } = await lobby(3);
  const other = games[2].lobbyPlayers().find(p => p.me).id;
  games[1].injectRoomMessage('start', { proto: 11,  id: other, level: 0, seed: 'evil:1' });
  assert.notStrictEqual(games[1].state, 'play');
});

test('each phone drives only its own runner', async () => {
  const { games } = await lobby(3);
  games[0].hostStart(); await settle(); tickAll(games, 30 * 4);
  const idOf = g => g.lobbyPlayers().find(p => p.me).id;
  const [a, b, c] = games, bId = idOf(b);
  for (let n = 1; n <= 10; n++) { a.duelReceive('pos', { id: bId, n, x: 1, z: n * 0.5, vx: 0, s: 5 }); tickAll([a, b, c], 3); }
  const byName = (g, id) => botsOf(g).find(x => x.peerId === id);
  assert.ok(byName(a, bId).z > 3, 'b moved on a\'s screen: ' + byName(a, bId).z);
  const cId = idOf(c);
  assert.ok(Math.abs(byName(a, cId).z) < 0.5, 'c did not move');
});

test('reports from someone who is not in the race are thrown away', async () => {
  const { games } = await lobby(3);
  games[0].hostStart(); await settle(); tickAll(games, 30 * 4);
  games[0].duelReceive('pos', { id: 'nobody', n: 1, x: 1, z: 50, vx: 0, s: 5 });
  games[0].duelReceive('fin', { id: 'nobody', ft: 3 });
  games[0].duelReceive('bye', { id: 'nobody' });
  tickAll(games, 15);
  assert.strictEqual(botsOf(games[0]).length, 2);
  assert.ok(botsOf(games[0]).every(b => !b.done && b.z < 5));
});

test('a player who leaves the lobby disappears from everyone\'s list', async () => {
  const { games } = await lobby(3);
  games[2].leaveRoom(); await settle();
  assert.strictEqual(games[0].lobbyPlayers().length, 2); assert.strictEqual(games[1].lobbyPlayers().length, 2);
  assert.strictEqual(games[2].lobbyPlayers().length, 0);
});

test('when the host leaves the lobby the others are told', async () => {
  const { games } = await lobby(3);
  games[0].leaveRoom(); await settle();
  assert.strictEqual(games[1].lobbyPlayers().length, 0); assert.strictEqual(games[2].lobbyPlayers().length, 0);
  assert.match(games[1].lobbyStatus(), /host/i);
});

test('one player quitting mid-race drops only their runner', async () => {
  const { games } = await lobby(4);
  games[0].hostStart(); await settle(); tickAll(games, 30 * 4);
  games[3].leaveRoom(); await settle(); tickAll(games.slice(0, 3), 6);
  for (const g of games.slice(0, 3)) { assert.strictEqual(botsOf(g).length, 2); assert.strictEqual(g.state, 'play'); }
});

test('a silent player is dropped after the wall-clock grace period, the rest keep racing', async () => {
  const { games } = await lobby(3, { clock: true });
  games[0].hostStart(); await settle(); tickAll(games, 30 * 4);
  const [a, b, c] = games, bId = b.lobbyPlayers().find(p => p.me).id, cId = c.lobbyPlayers().find(p => p.me).id;
  for (let i = 0; i < 40; i++) { a.duelReceive('pos', { id: bId, n: i + 1, x: 0, z: i * 0.2, vx: 0, s: 5 }); a.duelReceive('pos', { id: cId, n: i + 1, x: 0, z: i * 0.2, vx: 0, s: 5 }); a.tick(DT); }
  for (let i = 0; i < 16; i++) { a.advance(2000); a.injectRoomMessage('pos', { proto: 11,  id: cId, race: a.S.seed, n: 100 + i, x: 0, z: 10 + i * 0.1, vx: 0, s: 5 }); a.tick(DT); }
  assert.strictEqual(botsOf(a).map(x => x.peerId).join(), cId, 'b dropped, c stays; b=' + bId + ' c=' + cId);
});

test('with 3 or 4 players position reports slow down to protect the shared connection', async () => {
  const count = async n => {
    const { games } = await lobby(n); const sent = [];
    const g = games[0]; g.hostStart(); await settle();
    g.S.duel.send = (ev, d) => { if (ev === 'pos') sent.push(d); };
    tickAll([g], 30 * 4 + 60); sent.length = 0; tickAll([g], 60);
    return sent.length;
  };
  const two = await count(2), four = await count(4);
  assert.ok(two >= 14 && two <= 22, '2 players about 10 a second (2 s window): ' + two);
  assert.ok(four >= 7 && four <= 13, '4 players about 5 a second (2 s window): ' + four);
});

test('rematch in a 3-player room needs all three, then the host starts a new race', async () => {
  const { games, code } = await lobby(3);
  games[0].hostStart(); await settle(); tickAll(games, 100);
  finish(games, games[0]); await settle();
  games[1].requestRematch(); games[2].requestRematch(); await settle();
  assert.strictEqual(games[0].S.seed, code + ':1', 'two of three is not enough');
  assert.strictEqual(games[1].rematchState(), 'waiting');
  games[0].requestRematch(); await settle();
  for (const g of games) { assert.strictEqual(g.S.seed, code + ':2'); assert.strictEqual(g.state, 'play'); assert.strictEqual(botsOf(g).length, 2); }
});

test('if someone leaves while others wait on a rematch, the rest can still rematch', async () => {
  const { games, code } = await lobby(3);
  games[0].hostStart(); await settle(); tickAll(games, 100);
  finish(games, games[0]); await settle();
  games[1].requestRematch(); games[0].requestRematch(); await settle();
  assert.strictEqual(games[0].S.seed, code + ':1');
  games[2].leaveRoom(); await settle();
  assert.strictEqual(games[0].S.seed, code + ':2'); assert.strictEqual(games[1].S.seed, code + ':2');
  assert.strictEqual(botsOf(games[0]).length, 1);
});

test('three players finishing: places are 1, 2, 3 for everyone by finish time', async () => {
  const { games } = await lobby(3);
  games[0].hostStart(); await settle(); tickAll(games, 100);
  const ids = games.map(g => g.lobbyPlayers().find(p => p.me).id);
  games[0].duelReceive('fin', { id: ids[1], ft: 0.5 }); games[0].duelReceive('fin', { id: ids[2], ft: 1 });
  tickAll([games[0]], 10);
  finish([games[0]], games[0]);
  assert.strictEqual(games[0].S.race.board.length, 3);
  assert.strictEqual(games[0].S.race.place, 3, 'slower than both');
});

test('the host can change the stage after making the room; guests see it and everyone races on it', async () => {
  const { games } = await lobby(3);
  assert.strictEqual(games[0].roomLevel(), 1);
  games[0].setRoomLevel(2); await settle();
  for (const g of games) assert.strictEqual(g.roomLevel(), 2, 'everyone sees the new stage');
  games[1].setRoomLevel(0); await settle();
  assert.strictEqual(games[0].roomLevel(), 2, 'only the host picks');
  await readyPlayers(games);
  games[0].hostStart(); await settle();
  for (const g of games) assert.strictEqual(g.S.race ? g.LV.id : null, g.LEVELS[2].id, 'all on the third stage');
});

test('any racer pauses the room; all pausers resume before the clock and countdown run', async () => {
  const { games } = await lobby(3);
  games[0].hostStart(); await settle();
  games[1].pauseGame(); await settle(); games[2].pauseGame(); await settle();
  for (const g of games) assert.equal(g.state, 'paused');
  const snapshots = games.map(g => [g.S.pz, g.S.time, g.S.clock, g.S.race.countT]);
  tickAll(games, 90);
  games.forEach((g, i) => assert.deepEqual([g.S.pz,g.S.time,g.S.clock,g.S.race.countT], snapshots[i]));
  games[1].fire('keydown', {key:'p'}); await settle();
  for (const g of games) assert.equal(g.state, 'paused', 'second pauser still holds the race');
  games[2].fire('keydown', {key:'p'}); await settle();
  for (const g of games) assert.equal(g.state, 'play');
});

test('a pauser leaving releases the room and stale or unknown pause messages are ignored', async () => {
  const {games} = await lobby(2); games[0].hostStart(); await settle();
  games[1].pauseGame(); await settle(); assert.equal(games[0].state,'paused');
  games[1].leaveRoom(); games[1].toMenu(); await settle();
  assert.equal(games[0].state,'play');
  games[0].injectRoomMessage('pause', { proto: 11, id:'unknown1',seed:games[0].S.seed,n:1,paused:true});
  assert.equal(games[0].state,'play');
});

test('pause messages are ordered per racer and belong to the current race', async () => {
  const {games} = await lobby(2); games[0].hostStart(); await settle();
  const id=games[1].lobbyPlayers().find(p=>p.me).id, seed=games[0].S.seed;
  games[0].injectRoomMessage('pause', { proto: 11, id,seed,n:2,paused:true}); assert.equal(games[0].state,'paused');
  games[0].injectRoomMessage('pause', { proto: 11, id,seed,n:3,paused:false}); assert.equal(games[0].state,'play');
  games[0].injectRoomMessage('pause', { proto: 11, id,seed,n:2,paused:true});
  games[0].injectRoomMessage('pause', { proto: 11, id,seed:seed+'old',n:4,paused:true});
  assert.equal(games[0].state,'play');
});

test('a lost pauser removed by the host roster also releases the pause on other guests',async()=>{
  const {games}=await lobby(3); games[0].hostStart(); await settle();
  games[2].pauseGame(); await settle(); assert.equal(games[1].state,'paused');
  const host=games[0].lobbyPlayers().find(p=>p.me).id;
  const gone=games[2].lobbyPlayers().find(p=>p.me).id;
  const players=games[0].lobbyPlayers().filter(p=>p.id!==gone);
  games[1].injectRoomMessage('roster', { proto: 11, proto:games[1].PROTO,id:host,level:1,players});
  assert.equal(games[1].state,'play');
});
