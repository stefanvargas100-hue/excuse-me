const test = require('node:test');
const assert = require('node:assert/strict');
const { load, readyPlayers } = require('./harness');
const settle = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };

// Multiple isolated game bundles, asynchronous channel delivery, controllable packet loss.
function network() {
  const sockets = [], packets = [];
  const factory = () => {
    const s = { active: false, handlers: [], closers: [] }; sockets.push(s);
    return {
      join: async () => { s.active = true; },
      send: (ev, data) => {
        if (!s.active) return;
        packets.push({ ev, data: JSON.parse(JSON.stringify(data)) });
        for (const o of sockets) if (o !== s && o.active) Promise.resolve().then(() => {
          if (o.active) o.handlers.forEach(f => f(ev, JSON.parse(JSON.stringify(data))));
        });
      },
      leave: () => { s.active = false; },
      onMessage: f => s.handlers.push(f), onClose: f => s.closers.push(f)
    };
  };
  return { factory, sockets, packets, drop(s) { s.active = false; s.closers.forEach(f => f()); } };
}
async function lobby(n = 2, options = {}) {
  const net = network(), games = Array.from({ length: n }, () => load(null, { clock: true, ...options }));
  games.forEach(g => g.useRoomFactory(net.factory));
  const code = await games[0].hostRoom(1);
  for (const g of games.slice(1)) assert.equal(await g.joinRoom(code), true);
  await settle(); await readyPlayers(games); return { net, games, code };
}
const me = g => g.lobbyPlayers().find(p => p.me).id;
async function race(n = 2) { const p = await lobby(n); p.games[0].hostStart(); await settle(); return p; }

test('old-room close callbacks cannot damage a replacement room', async () => {
  const { net, games: [h] } = await lobby(1);
  const old = net.sockets[0]; await h.hostRoom(1);
  old.closers.forEach(f => f());
  assert.doesNotMatch(h.lobbyStatus(), /lost|reconnect/i);
});

test('brief lobby drop reconnects with the same player and no duplicate roster entry', async () => {
  const { net, games: [h, g] } = await lobby(); const id = me(g);
  net.drop(net.sockets[1]); g.advance(2000); await settle();
  h.advance(2000); await settle();
  assert.equal(g.lobbyPlayers().find(p => p.me).id, id);
  assert.equal(h.lobbyPlayers().length, 2);
  assert.match(g.lobbyStatus(), /connected|waiting/i);
  g.leaveRoom(); await settle(); assert.equal(h.lobbyPlayers().length, 1);
});

test('late packets and duplicate start cannot reset a race or alter a rematch', async () => {
  const { games: [h, g] } = await race(); const host = me(h), seed = g.S.seed;
  g.S.pz = 20;
  g.injectRoomMessage('start', { id: host, level: 1, seed });
  assert.equal(g.S.pz, 20);
  g.injectRoomMessage('fin', { id: host, race: 'old:1', ft: 2 });
  assert.equal(g.S.duel.peers[host].fin, null);
  g.injectRoomMessage('fin', { id: host, race: seed, ft: 10 });
  g.injectRoomMessage('fin', { id: host, race: seed, ft: 1 });
  assert.equal(g.S.duel.peers[host].fin, 10, 'first terminal finish is immutable');
});

test('a racer who never sends a first snapshot becomes DNF on wall-clock timeout', async () => {
  const { net, games: [h, g] } = await race(); const id = me(g);
  net.sockets[1].active = false; h.advance(31000); await settle();
  assert.equal(h.S.duel.peers[id].bye, true);
  assert.equal(h.S.race.board.find(r => r.id === id).dnf, true);
  assert.equal(h.rematchState(), 'gone');
});

test('backgrounding during a race forfeits it; return cannot resurrect that runner', async () => {
  const { games: [h, g] } = await race(); const id = me(g);
  g.visibility(true); await settle();
  assert.equal(g.S.duel.dnf, true);
  assert.equal(h.S.duel.peers[id].bye, true);
  g.visibility(false); await settle();
  assert.equal(g.S.duel.dnf, true);
});

test('host departure during a race preserves the departed row and lets guests finish', async () => {
  const { games: [h, g, b] } = await race(3); const id = me(h);
  h.leaveRoom(); await settle();
  for (const p of [g, b]) {
    assert.equal(p.S.duel.peers[id].bye, true);
    assert.equal(p.S.race.board.find(r => r.id === id).dnf, true);
    assert.equal(p.rematchState(), 'gone');
    assert.match(p.lobbyStatus(), /host/i);
  }
});

test('finished racers repeat their finish and late delivery refreshes both result boards', async () => {
  const { net, games: [h, g] } = await race();
  // Lose the initial finish packet, then restore transport before heartbeat replay.
  net.sockets[0].active = false;
  h.S.time = 12; h.S.race.finished = true; h.S.duel.send('fin', { ft: 12 });
  net.sockets[0].active = true; h.advance(2000); await settle();
  assert.equal(g.S.duel.peers[me(h)].fin, 12);
  g.S.time = 14; g.S.race.finished = true; g.S.duel.send('fin', { ft: 14 }); await settle();
  const rows = p => Array.from(p.S.race.board, r => [r.id, r.finishT, !!r.dnf]);
  assert.deepEqual(rows(h), rows(g));
});

test('guest can leave and rejoin lobby; delayed bye from old identity is harmless', async () => {
  const { games: [h, g], code } = await lobby(); const old = me(g);
  g.leaveRoom(); await settle(); assert.equal(await g.joinRoom(code), true); await settle();
  h.injectRoomMessage('bye', { id: old });
  assert.equal(h.lobbyPlayers().length, 2);
  assert.notEqual(me(g), old);
});

test('host loss closes guest lobby after grace; background lobby can return before grace', async () => {
  const { net, games: [h, g] } = await lobby();
  g.visibility(true); g.advance(4000); g.visibility(false); await settle();
  assert.equal(g.lobbyPlayers().length, 2);
  net.sockets[0].active = false; g.advance(31000); await settle();
  assert.equal(g.lobbyPlayers().length, 0); assert.match(g.lobbyStatus(), /host/i);
});

test('brief race drop recovers without DNF, with the same race and player', async () => {
  const { net, games: [h, g] } = await race(); const seed = g.S.seed, id = me(g);
  net.drop(net.sockets[1]); g.advance(2000); await settle(); h.advance(2000); await settle();
  assert.equal(g.S.seed, seed); assert.equal(me(g), id);
  assert.equal(h.S.duel.peers[id].bye, false); assert.ok(!g.S.duel.dnf);
  g.S.duel.send('pos', { n: 10, x: 0, z: 4, vx: 0, s: 4 }); await settle();
  assert.ok(h.S.duel.peers[id].remote.sample(h.S.clock));
});

test('a lost rematch request is repeated instead of leaving the room waiting forever', async () => {
  const { net, games: [h, g] } = await race(); const seed = h.S.seed;
  net.sockets[1].active = false; g.requestRematch(); net.sockets[1].active = true;
  h.requestRematch(); await settle(); assert.equal(h.S.seed, seed);
  g.advance(2000); await settle();
  assert.notEqual(h.S.seed, seed); assert.equal(h.S.seed, g.S.seed);
});

test('out-of-order roster revisions cannot resurrect a player who left', async () => {
  const { net, games: [h, g, b] } = await lobby(3);
  const old = net.packets.filter(p => p.ev === 'roster').at(-1).data;
  b.leaveRoom(); await settle();
  g.injectRoomMessage('roster', old);
  assert.equal(g.lobbyPlayers().length, 2);
});

test('a racer that keeps the socket alive but never finishes cannot block final results forever', async () => {
  const { games: [h, g] } = await race(); const id = me(g);
  h.S.race.finished = true; h.S.duel.send('fin', { ft: 12 });
  for (let i = 0; i < 302; i++) { h.injectRoomMessage('hello', { id, proto: 4 }); h.advance(2000); }
  await settle();
  assert.equal(h.S.duel.peers[id].bye, true);
});

test('missing a start while briefly offline cannot leave a guest stuck in the lobby', async () => {
  const { net, games: [h, g] } = await lobby();
  net.sockets[1].active = false; h.hostStart(); await settle();
  net.sockets[1].active = true; h.advance(2000); g.advance(2000); await settle();
  assert.equal(g.S?.seed, h.S.seed);
  assert.equal(g.S.race.countT, h.S.race.countT, 'recovered countdown uses elapsed wall time');
});

test('host repeats accepted finishes even after the finished guest leaves', async () => {
  const { net, games: [h, g, b] } = await race(3); const id = me(g);
  net.sockets[2].active = false;
  g.S.time = 12; g.S.race.finished = true; g.S.duel.send('fin', { ft: 12 }); await settle();
  g.leaveRoom(); await settle();
  net.sockets[2].active = true; h.advance(2000); await settle();
  assert.equal(b.S.duel.peers[id].fin, 12, 'host retains and relays the accepted result');
});

test('host timeout verdict reaches a returned guest instead of two conflicting winners', async () => {
  const { net, games: [h, g] } = await race(); const id = me(g);
  net.sockets[1].active = false;
  g.S.time = 12; g.S.race.finished = true; g.S.duel.send('fin', { ft: 12 });
  h.advance(31000); await settle();
  net.sockets[1].active = true; h.advance(2000); await settle();
  assert.equal(h.S.duel.peers[id].bye, true);
  assert.equal(g.S.duel.dnf, true, 'host could not confirm the finish within grace');
});

test('host vanishing immediately after the first roster cannot leave a guest stuck', async () => {
  const { net, games: [h, g] } = await lobby();
  net.sockets[0].active = false; g.advance(31000);
  assert.equal(g.lobbyPlayers().length, 0);
});

test('a cancelled pending join cannot close a newer room when its rejection arrives', async () => {
  const net = network(), g = load(null, { clock: true }); let reject;
  let first = true;
  g.useRoomFactory(() => {
    const api = net.factory();
    if (first) { first = false; api.join = () => new Promise((_, no) => { reject = no; }); }
    return api;
  });
  const pending = g.hostRoom(1); await settle();
  const code = await g.hostRoom(2); reject(new Error('late failure')); await pending;
  assert.equal(g.lobbyPlayers().length, 1);
  assert.equal(g.roomLevel(), 2);
});

test('a backgrounded guest clears readiness so the host cannot start a suspended race', async () => {
  const { games: [h, g] } = await lobby();
  g.visibility(true); h.hostStart(); await settle(); g.visibility(false); await settle();
  assert.notEqual(g.state, 'play');
  assert.notEqual(h.state, 'play');
  assert.equal(h.canStartRoom(), false);
});

test('after host departure both result screens offer a working path to create a fresh room', async () => {
  const { games: [h, g] } = await lobby(2, { dom: true });
  h.hostStart(); await settle();
  for (const p of [h, g]) {
    p.S.race.countT = 0; p.S.pz = p.LV.goal + 1; p.tick(1 / 30);
    for (let i = 0; i < 25; i++) p.tick(1 / 30);
  }
  await settle(); h.leaveRoom(); await settle();
  for (const p of [h, g]) {
    assert.equal(p.element('again').disabled, false, 'new-room action must be tappable');
    await p.element('again').click();
    assert.equal(p.element('end').hidden, true);
    assert.equal(p.element('friend').hidden, false);
    assert.equal(p.element('friendHome').hidden, false);
    await p.element('friendMake').click();
    assert.equal(p.lobbyPlayers().length, 1, 'created a new room through the actual button');
    assert.equal(p.lobbyPlayers()[0].host, true);
    assert.match(p.element('friendCode').textContent, /^[A-Z2-9]{4}$/);
    p.leaveRoom(); await settle();
  }
});

test('a paused guest reconnects with the same vote and can release the room', async () => {
  const {net,games:[h,g]}=await race(); const seed=g.S.seed;
  g.pauseGame(); await settle(); assert.equal(h.state,'paused');
  net.drop(net.sockets[1]); g.advance(2000); await settle(); h.advance(2000); await settle();
  assert.equal(g.S.seed,seed); assert.equal(h.state,'paused');
  g.fire('keydown',{key:'p'}); await settle();
  assert.equal(h.state,'play'); assert.equal(g.state,'play');
});

test('backgrounding or timing out a pauser releases every other racer', async () => {
  const first=await race(3), [h,g,b]=first.games;
  g.pauseGame(); await settle(); g.visibility(true); await settle();
  assert.equal(g.S.duel.dnf,true); assert.equal(h.state,'play'); assert.equal(b.state,'play');
  const second=await race(3), [a,lost,c]=second.games;
  lost.pauseGame(); await settle(); second.net.sockets[1].active=false;
  // The present third racer keeps reporting; only the disconnected pauser times out.
  a.advance(29000); c.advance(29000); await settle(); a.advance(2000); await settle();
  assert.equal(a.state,'play'); assert.equal(c.state,'play');
  assert.equal(a.S.duel.peers[me(lost)].bye,true);
});

test('a missed ready message is repaired by the next pause heartbeat', async () => {
  const {net,games:[h,g]}=await race();
  g.pauseGame(); await settle(); assert.equal(h.state,'paused');
  net.sockets[0].active=false; g.fire('keydown',{key:'p'}); await settle(); assert.equal(h.state,'paused');
  net.sockets[0].active=true; g.advance(2000); await settle(); assert.equal(h.state,'play');
});

test('incompatible start packets cannot start a joined guest on different rules', async () => {
  const { games: [h, g], net } = await lobby();
  const proto = net.packets.find(p => p.ev === 'roster').data.proto;
  for (const version of [undefined, proto + 1]) {
    g.injectRoomMessage('start', { id: me(h), proto: version, level: 1, seed: 'wrong:1' });
    assert.notEqual(g.state, 'play');
  }
  h.hostStart(); await settle();
  assert.equal(g.state, 'play');
  assert.equal(g.S.seed, h.S.seed);
});

test('host refuses missing and incompatible protocol versions without adding racers', async () => {
  const { games: [h], net } = await lobby(2);
  const proto = net.packets.find(p => p.ev === 'roster').data.proto;
  for (const version of [undefined, proto + 1]) {
    h.injectRoomMessage('hello', { id: 'oldphone', proto: version, name: 'Old phone' });
    assert.equal(h.lobbyPlayers().length, 2);
    assert.equal(net.packets.at(-1).data.why, 'version');
  }
});

test('guest refuses an incompatible host roster and closes its pending join', async () => {
  for (const proto of [undefined, 999]) {
    const g = load(); let receive, left = false;
    g.useRoomFactory(() => ({
      join: async () => {}, leave: () => { left = true; },
      onMessage: f => { receive = f; }, onClose: () => {},
      send: (ev, data) => { if (ev === 'hello') receive('roster', {
        id: 'oldhost1', proto, level: 1, players: [{ id: 'oldhost1' }, { id: data.id }]
      }); }
    }));
    assert.equal(await g.joinRoom('ABCD'), false);
    assert.equal(left, true);
    assert.match(g.lobbyStatus(), /different version/);
    assert.equal(g.lobbyPlayers().length, 0);
  }
});
