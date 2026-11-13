// Batch 22c independent review of finish spectating: finished phones stay silent in plain and Elimination rooms, eliminated racers are never targets,
// stale pop-ups fade, handover and rematch leave the spectate bar in a sane state. Simulated connection only. node --test test/spectate-review.test.js
const test = require('node:test');
const assert = require('node:assert');
const { load, readyPlayers } = require('./harness.js');

const DT = 1 / 30, settle = () => new Promise(r => setTimeout(r, 5)), J = x => JSON.stringify(x);
function hub() {
  const members = [], H = { log: [], n: -1 };
  H.factory = () => {
    const me = { handlers: [], joined: false, idx: ++H.n };
    me.api = {
      join: async () => { me.joined = true; members.push(me); },
      send: (ev, d) => { if (!me.joined) return; const text = JSON.stringify(d); H.log.push({ ev, data: JSON.parse(text), from: me.idx }); for (const o of members) if (o !== me) Promise.resolve().then(() => o.handlers.forEach(h => h(ev, JSON.parse(text)))); },
      leave: () => { me.joined = false; const i = members.indexOf(me); if (i >= 0) members.splice(i, 1); },
      onMessage: f => me.handlers.push(f), onClose: () => {}
    };
    return me.api;
  };
  return H;
}
// n phones, mode 'plain' | 'cup' | 'elim', race running with nobody moving.
async function room(n, mode, seed = 5) {
  const H = hub(), games = [];
  for (let i = 0; i < n; i++) { const g = load(undefined, { seed, dom: true }); g.useRoomFactory(H.factory); games.push(g); }
  const code = await games[0].hostRoom(0);
  for (let i = 1; i < n; i++) { assert.strictEqual(await games[i].joinRoom(code), true); await settle(); }
  await settle();
  if (mode === 'cup') { assert.strictEqual(games[0].setRoomCup({ stages: [1, 3, 4, 5], difficulty: 1 }), true); await settle(); }
  if (mode === 'elim') { games[0].setRoomElim(true); await settle(); }
  await readyPlayers(games); games[0].hostStart(); await settle(); await settle();
  for (const g of games) if (g.S?.race) { g.S.race.countT = 0; g.S.people.length = 0; g.S.nextChunk = 1e9; }
  const ids = games.map(g => g.lobbyPlayers().find(p => p.me).id);
  return { H, games, ids };
}
const tickAll = (games, f = 1) => { for (let i = 0; i < f; i++) for (const g of games) g.tick(DT); };
const cross = async (g, games) => { g.S.pz = g.LV.goal + 1; tickAll(games, 3); await settle(); };

test('finished phone in a plain friend race sends nothing more, watching or stopped, host and guest', async () => {
  for (const idx of [0, 1]) {
    const logs = [];
    for (const stop of [false, true]) {
      const { H, games } = await room(3, 'plain'), g = games[idx];
      await cross(g, games);
      assert.ok(g.S.race.spectate.target, 'a racer is still running, so the finisher watches');
      if (stop) g.element('spectateStop').onclick();
      const start = H.log.length;
      for (let f = 0; f < 90; f++) { tickAll(games); if (f % 5 === 4) await settle(); }
      logs.push(H.log.slice(start).filter(m => m.from === idx));
    }
    assert.strictEqual(J(logs[0]), J(logs[1]));
    assert.strictEqual(logs[0].length, 0, 'a finished plain-race phone stays silent, as before the batch');
  }
});

test('knocked-out guest in Elimination watches only racers still in, sends nothing, keeps its result', async () => {
  const { H, games, ids } = await room(3, 'elim'), g = games[1];
  for (const o of games) o.injectRoomMessage('elim', { proto: 12, id: ids[0], race: games[0].S.duel.seed, rev: 1, out: [ids[1]] });
  tickAll(games, 3); await settle();
  assert.strictEqual(g.S.race.elim.meOut, true);
  const first = g.S.race.spectate.target; assert.ok(first);
  const place = g.S.race.place;
  // the next knock-out takes the host's racer out of the field: it can no longer be a target
  for (const o of games) o.injectRoomMessage('elim', { proto: 12, id: ids[0], race: games[0].S.duel.seed, rev: 2, out: [ids[1], first.peerId] });
  tickAll(games, 3); await settle();
  assert.ok(!g.S.race.spectate.target || g.S.race.spectate.target !== first, 'an eliminated racer is not watched');
  const start = H.log.length;
  for (let f = 0; f < 60; f++) { tickAll(games); if (f % 5 === 4) await settle(); }
  assert.strictEqual(H.log.slice(start).filter(m => m.from === 1).length, 0);
  assert.ok(g.S.race.place >= place);
});

test('a pop-up from the spectator\'s own last pass fades within its normal 1.3 s', async () => {
  const { games } = await room(3, 'plain'), g = games[1];
  g.S.pz = g.LV.goal + 1; g.S.pops.push({ text: 'NEAR-MISS STREAK', color: '#ff6b9d', size: 30, t: 0 }); tickAll(games, 3);
  assert.ok(g.S.race.spectate.target);
  tickAll(games, 45);
  assert.strictEqual(g.S.pops.length, 0);
});

test('Cup host leaves while a finished guest watches: no crash, target stays a live racer or results open', async () => {
  const { games } = await room(3, 'cup'), [old, g, other] = games;
  await cross(g, games); assert.ok(g.S.race.spectate.target);
  old.leaveRoom(); await settle(); await settle();
  const live = [g, other];
  for (let f = 0; f < 600; f++) { tickAll(live); if (f % 10 === 9) await settle(); }
  const t = g.S.race.spectate.target;
  assert.ok(!t || g.S.race.bots.includes(t), 'target is still in the field');
  assert.ok(t || g.element('end').hidden === false, 'either watching someone or on the results screen');
});

test('plain rematch after watching clears the spectate state for the new race', async () => {
  const { games } = await room(2, 'plain'), [h, g] = games;
  await cross(g, games); assert.ok(g.S.race.spectate.target);
  await cross(h, games); tickAll(games, 30); await settle();
  assert.strictEqual(g.S.race.spectate.target, null); assert.strictEqual(g.element('end').hidden, false);
  g.requestRematch(); await settle(); h.requestRematch(); await settle(); await settle();
  assert.strictEqual(g.state, 'play', 'the rematch started a new race');
  assert.strictEqual(g.element('spectateBar').hidden, true); assert.strictEqual(g.element('hud').hidden, false, 'the race HUD is back for the next race');
  assert.strictEqual(g.S.race.spectate.target, null); assert.strictEqual(g.S.race.spectate.stopped, false);
});
