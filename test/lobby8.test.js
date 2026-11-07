// Lobby for up to 8 phones: room size, start line, colours, results, rematch, and passing through each other. Pretend room, no network. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');

const DT = 1 / 30;
const settle = () => new Promise(r => setTimeout(r, 5));

function hub() {
  const members = [];
  return () => {
    const me = { handlers: [], joined: false };
    me.api = {
      join: async () => { me.joined = true; members.push(me); },
      send: (ev, d) => { if (!me.joined) return; const copy = JSON.parse(JSON.stringify(d)); for (const o of members) if (o !== me) Promise.resolve().then(() => o.handlers.forEach(h => h(ev, copy))); },
      leave: () => { me.joined = false; const i = members.indexOf(me); if (i >= 0) members.splice(i, 1); },
      onMessage: f => me.handlers.push(f), onClose: () => {}
    };
    return me.api;
  };
}
// n games in one room; the first is the host.
async function lobby(n, level = 1) {
  const H = hub(), games = [];
  for (let i = 0; i < n; i++) { const g = load(); g.useRoomFactory(H); games.push(g); }
  const code = await games[0].hostRoom(level);
  for (let i = 1; i < n; i++) { assert.strictEqual(await games[i].joinRoom(code), true, 'player ' + (i + 1) + ' joined'); await settle(); }
  await settle();
  return { games, host: games[0], code };
}
const tickAll = (games, frames) => { for (let i = 0; i < frames; i++) for (const g of games) g.tick(DT); };
const botsOf = g => g.S.race.bots.filter(b => b.remote);
const myId = g => g.lobbyPlayers().find(p => p.me).id;
const finish = (games, who) => { who.S.pz = who.LEVELS[1].goal - 12; let t = 0; while (who.state === 'play' && t++ < 30 * 600) tickAll(games, 1); tickAll(games, 60); };

test('a room holds 8 players and refuses the ninth', async () => {
  const H = hub(), games = [];
  for (let i = 0; i < 9; i++) { const g = load(); g.useRoomFactory(H); games.push(g); }
  const code = await games[0].hostRoom(1);
  for (let i = 1; i < 8; i++) { assert.strictEqual(await games[i].joinRoom(code), true); await settle(); }
  const ok = await games[8].joinRoom(code); await settle(); await settle();
  assert.strictEqual(ok, false);
  assert.strictEqual(games[8].lobbyPlayers().length, 0, 'the ninth is not in the list');
  assert.strictEqual(games[0].lobbyPlayers().length, 8);
  assert.match(games[8].lobbyStatus(), /8 players/);
  for (const g of games.slice(0, 8)) assert.strictEqual(g.lobbyPlayers().length, 8, 'all eight see all eight');
});

test('starting with 5 to 8 players puts everyone on the same race and shows every other runner', async () => {
  for (const n of [5, 8]) {
    const { games, code } = await lobby(n);
    games[0].hostStart(); await settle();
    for (const g of games) {
      assert.strictEqual(g.state, 'play'); assert.strictEqual(g.S.seed, code + ':1');
      assert.strictEqual(botsOf(g).length, n - 1, 'sees every other player: ' + n);
      assert.strictEqual(g.S.race.bots.length, n - 1, 'and no computer bots');
    }
  }
});

test('every racer starts in their own spot, and every phone agrees where each one stands', async () => {
  for (const level of [0, 1, 2]) for (const n of [2, 4, 5, 8]) {
    const { games } = await lobby(n, level);
    games[0].hostStart(); await settle();
    const pos = {}; for (const g of games) pos[myId(g)] = { x: g.S.px, z: g.S.pz };
    const ids = Object.keys(pos), half = games[0].LV.half;
    for (let i = 0; i < ids.length; i++) {
      const p = pos[ids[i]];
      assert.ok(Math.abs(p.x) <= half - 0.5, 'inside the street: ' + p.x + ' (' + n + ' players, stage ' + level + ')');
      assert.ok(p.z <= 0 && p.z > -3, 'just behind the line: ' + p.z);
      for (let j = i + 1; j < ids.length; j++) assert.ok(Math.hypot(p.x - pos[ids[j]].x, p.z - pos[ids[j]].z) >= 0.8, 'two racers share a spot (' + n + ' players, stage ' + level + ')');
    }
    for (const g of games) for (const b of botsOf(g)) {
      const want = pos[b.peerId];
      assert.ok(Math.hypot(b.x - want.x, b.z - want.z) < 0.05, 'their runner stands where they really are: ' + b.x + ',' + b.z + ' vs ' + want.x + ',' + want.z);
    }
  }
});

test('with 8 players every other racer has their own colour', async () => {
  const { games } = await lobby(8);
  games[0].hostStart(); await settle();
  const colors = botsOf(games[3]).map(b => b.color);
  assert.strictEqual(colors.length, 7);
  assert.strictEqual(new Set(colors).size, 7, 'all different: ' + colors);
  assert.ok(!colors.includes('#ffcf1f'), 'none looks like you');
});

test('with 8 players position reports stay near 5 a second (measured: the server carried this with nothing lost)', async () => {
  const { games } = await lobby(8);
  const g = games[0]; g.hostStart(); await settle();
  const sent = []; g.S.duel.send = (ev, d) => { if (ev === 'pos') sent.push(d); };
  tickAll([g], 30 * 4 + 60); sent.length = 0; tickAll([g], 60);
  assert.ok(sent.length >= 7 && sent.length <= 13, 'about 5 a second (2 s window): ' + sent.length);
});

test('eight players finishing: the results list all eight and place you by finish time', async () => {
  const { games } = await lobby(8);
  games[0].hostStart(); await settle(); tickAll(games, 100);
  const ids = games.map(myId);
  for (let i = 1; i < 8; i++) games[0].duelReceive('fin', { id: ids[i], ft: 0.5 + i * 0.1 });
  tickAll([games[0]], 10);
  finish([games[0]], games[0]);
  assert.strictEqual(games[0].S.race.board.length, 8);
  assert.strictEqual(games[0].S.race.place, 8, 'slower than all seven');
});

test('rematch with 8 players needs all eight, then everyone is on race two', async () => {
  const { games, code } = await lobby(8);
  games[0].hostStart(); await settle(); tickAll(games, 100);
  finish(games, games[0]); await settle();
  for (let i = 1; i < 8; i++) games[i].requestRematch();
  await settle();
  assert.strictEqual(games[0].S.seed, code + ':1', 'seven of eight is not enough');
  games[0].requestRematch(); await settle();
  for (const g of games) { assert.strictEqual(g.S.seed, code + ':2'); assert.strictEqual(g.state, 'play'); assert.strictEqual(botsOf(g).length, 7); }
});

const emptyStreet = g => { g.S.people.length = 0; g.S.nextChunk = 1e9; };   // nothing but the other racer to touch
const R2 = 0.5;   // two runners touch when their centres are this close (twice the body radius)

test('a live racer is solid: you cannot walk through someone standing in front of you, and it costs no bump', async () => {
  const { games } = await lobby(2);
  const [a, b] = games, bId = myId(b);
  a.hostStart(); await settle(); tickAll([a], 30 * 4);
  emptyStreet(a);
  const x0 = a.S.px, z0 = a.S.pz, ahead = z0 + 6, bumps = a.S.bumps;
  let closest = 99, slowed = 0;
  for (let i = 1; i <= 240; i++) {
    a.duelReceive('pos', { id: bId, n: i, x: x0, z: ahead, vx: 0, s: 0 });   // b stands still in a's lane
    a.tick(DT);
    closest = Math.min(closest, Math.hypot(a.S.px - x0, a.S.pz - ahead));
    slowed = Math.max(slowed, a.S.bumpT);
  }
  assert.ok(closest >= R2 - 0.03, 'never inside them: ' + closest);
  assert.ok(a.S.pz > ahead - 1, 'it did walk up to them: ' + a.S.pz);
  assert.strictEqual(a.S.bumps, bumps, 'not counted as a bump');
  assert.strictEqual(slowed, 0, 'no bump slowdown');
});

test('walking behind a live racer who is moving: you follow at their pace, you are not stopped dead', async () => {
  const { games } = await lobby(2);
  const [a, b] = games, bId = myId(b);
  a.hostStart(); await settle(); tickAll([a], 30 * 4);
  emptyStreet(a);
  const x0 = a.S.px, bz0 = a.S.pz + 3, pace = 2.0;
  let closest = 99;
  for (let i = 1; i <= 300; i++) {
    const bz = bz0 + pace * i * DT;
    a.duelReceive('pos', { id: bId, n: i, x: x0, z: bz, vx: 0, s: pace });
    a.tick(DT);
    if (i > 15) closest = Math.min(closest, Math.hypot(a.S.px - x0, a.S.pz - bz));
  }
  assert.ok(closest >= R2 - 0.1, 'never inside them: ' + closest);
  assert.ok(a.S.pz > 15, 'still got somewhere: ' + a.S.pz);
  assert.ok(a.S.speed < pace + 0.6 && a.S.speed > pace - 0.8, 'about their pace: ' + a.S.speed);
});

test('two racers side by side: only one phone gives way (the same one on both screens), so nobody is thrown apart twice', async () => {
  const { games } = await lobby(2);
  const [a, b] = games, aId = myId(a), bId = myId(b);
  a.hostStart(); await settle(); tickAll([a, b], 30 * 4);
  emptyStreet(a); emptyStreet(b);
  let moveA = 0, moveB = 0;
  for (let i = 1; i <= 6; i++) {
    a.S.px = 0; a.S.pz = 10; a.S.vx = 0; b.S.px = 0.15; b.S.pz = 10; b.S.vx = 0;   // 15 cm apart
    a.duelReceive('pos', { id: bId, n: i, x: 0.15, z: 10, vx: 0, s: 0 }); b.duelReceive('pos', { id: aId, n: i, x: 0, z: 10, vx: 0, s: 0 });
    a.tick(DT); b.tick(DT);
    moveA = Math.max(moveA, Math.abs(a.S.px - 0)); moveB = Math.max(moveB, Math.abs(b.S.px - 0.15));
  }
  const aGivesWay = aId < bId;
  assert.ok((aGivesWay ? moveA : moveB) > 0.2, 'the one who gives way steps clear: ' + moveA + ' / ' + moveB);
  assert.ok((aGivesWay ? moveB : moveA) < 0.03, 'the other stays put: ' + moveA + ' / ' + moveB);
});

test('a racer who has finished no longer blocks anyone', async () => {
  const { games } = await lobby(2);
  const [a, b] = games, bId = myId(b);
  a.hostStart(); await settle(); tickAll([a], 30 * 4);
  emptyStreet(a);
  a.duelReceive('fin', { id: bId, ft: 5 }); tickAll([a], 3);
  const bb = botsOf(a).find(x => x.peerId === bId); bb.x = a.S.px; bb.z = a.S.pz + 0.2;
  const z = a.S.pz; tickAll([a], 10);
  assert.ok(a.S.pz > z + 0.3, 'walked straight on: ' + (a.S.pz - z));
});