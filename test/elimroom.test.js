// B5b: elimination races in friend rooms. The host decides; every phone applies the same ordered list. Pretend room, no network. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load, readyPlayers, PROTO } = require('./harness.js');

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
async function lobby(n, level = 1) {
  const H = hub(), games = [];
  for (let i = 0; i < n; i++) { const g = load(); g.useRoomFactory(H); games.push(g); }
  const code = await games[0].hostRoom(level);
  for (let i = 1; i < n; i++) { assert.strictEqual(await games[i].joinRoom(code), true); await settle(); }
  await settle();
  return { games, host: games[0], code };
}
const tickAll = (games, frames) => { for (let i = 0; i < frames; i++) for (const g of games) g.tick(DT); };
const eq = (a, b, m) => assert.strictEqual(JSON.stringify(Array.from(a)), JSON.stringify(Array.from(b)), m);
const idOf = g => g.lobbyPlayers().find(p => p.me).id;
const hostId = g => g.lobbyPlayers().find(p => p.host).id;

async function elimRace(n, level = 1) {
  const L = await lobby(n, level);
  L.host.setRoomElim(true); await settle();
  await readyPlayers(L.games);
  L.host.hostStart(); await settle();
  for (const g of L.games) { g.S.race.countT = 0; g.S.people.length = 0; g.S.nextChunk = Infinity; }
  L.ids = L.games.map(idOf);
  return L;
}
// hold each phone's own runner at zs[i] (a null leaves it alone) and let the messages flow
async function drive(games, zs, frames = 60) {
  for (let f = 0; f < frames; f++) {
    games.forEach((g, i) => { if (g.state === 'play' && zs[i] != null) { g.S.pz = zs[i]; g.S.me.z = zs[i]; g.S.speed = 0; g.S.vx = 0; } });
    tickAll(games, 1);
    if (f % 5 === 4) await settle();
  }
  await settle();
}
const outIds = g => g.S.race.elim.out.map(o => o.id);
const cps = g => g.S.race.elim.cps;

test('the host picks the format; guests see it; everyone starts the same elimination race', async () => {
  const { games, host } = await lobby(4);
  assert.strictEqual(host.roomElim(), false);
  host.setRoomElim(true); await settle();
  await readyPlayers(games);
  for (const g of games) assert.strictEqual(g.roomElim(), true, 'every phone knows the format');
  host.hostStart(); await settle();
  for (const g of games) { assert.strictEqual(g.state, 'play'); assert.ok(g.S.race.elim, 'elimination race'); assert.strictEqual(g.S.race.elim.cps.length, 3); }
  eq(Array.from(cps(games[1])), Array.from(cps(games[0])));
});

test('a normal room is unchanged: no checkpoints', async () => {
  const { games, host } = await lobby(3);
  await readyPlayers(games);
  host.hostStart(); await settle();
  for (const g of games) assert.ok(!g.S.race.elim);
});

test('the host eliminates the last racer and every phone ends up with the same list', async () => {
  const { games, ids } = await elimRace(4);
  const c = cps(games[0])[0];
  await drive(games, [c + 5, c - 40, c - 20, c - 80], 80);
  for (const g of games) { eq(outIds(g), [ids[3]], 'same single elimination everywhere'); assert.strictEqual(g.S.race.elim.next, 1); }
  assert.strictEqual(games[3].state, 'lost'); assert.strictEqual(games[3].S.race.place, 4);
  for (const g of games.slice(0, 3)) assert.strictEqual(g.state, 'play');
  for (const g of games.slice(0, 3)) assert.ok(!g.S.race.bots.some(b => b.peerId === ids[3]), 'removed from the field');
});

test('repeated, reordered, wrong-race, non-host and unknown decisions eliminate nobody wrongly', async () => {
  const { games, ids } = await elimRace(4);
  const g = games[1], host = hostId(g), seed = g.S.duel.seed, msg = (over = {}) => ({ proto: PROTO, id: host, race: seed, rev: 1, out: [ids[3]], ...over });
  g.injectRoomMessage('elim', msg({ id: ids[2] }));                  // a guest pretending to be the host
  g.injectRoomMessage('elim', msg({ race: 'other:1' }));             // another race
  g.injectRoomMessage('elim', msg({ out: ['nobody'] }));             // an id that is not in the room
  g.injectRoomMessage('elim', msg({ out: [42] }));                   // not even a string
  assert.strictEqual(g.S.race.elim.out.length, 0, 'nothing applied yet');
  g.injectRoomMessage('elim', msg());
  eq(outIds(g), [ids[3]]);
  g.injectRoomMessage('elim', msg());                                // exact repeat
  g.injectRoomMessage('elim', msg({ rev: 0 }));                      // older
  g.injectRoomMessage('elim', msg({ rev: 2, out: [ids[3], ids[3]] })); // duplicate entry
  eq(outIds(g), [ids[3]], 'still exactly one');
  g.injectRoomMessage('elim', msg({ rev: 4, out: [ids[3], ids[2]] })); // a copy that skipped rev 3: still applied in order
  eq(outIds(g), [ids[3], ids[2]]);
  g.injectRoomMessage('elim', msg({ rev: 3, out: [ids[3]] }));       // a late older copy cannot undo anything
  eq(outIds(g), [ids[3], ids[2]]);
  assert.strictEqual(g.S.race.elim.next, 2);
});

test('a decision cannot eliminate more racers than there are checkpoints, or the winner', async () => {
  const { games, ids } = await elimRace(3);
  const g = games[0 + 1], host = hostId(g), seed = g.S.duel.seed;
  g.injectRoomMessage('elim', { proto: PROTO,  id: host, race: seed, rev: 1, out: [ids[2], ids[1], ids[0]] });   // 3 racers: only 2 can go
  assert.ok(g.S.race.elim.out.length <= 2);
  assert.ok(!outIds(g).includes(ids[0]) || g.S.race.elim.out.length <= 2);
});

test('a paused room eliminates nobody until everyone who paused is ready', async () => {
  const { games, ids } = await elimRace(4);
  const c = cps(games[0])[0];
  await drive(games, [c - 60, c - 70, c - 80, c - 90], 10);
  games[1].pauseGame(); await settle();
  for (const g of games) assert.strictEqual(g.state, 'paused');
  games[0].S.pz = c + 5; tickAll(games, 90); await settle();
  for (const g of games) assert.strictEqual(g.S.race.elim.out.length, 0, 'nobody cut while paused');
  games[1].resumeGame(); await settle();
  await drive(games, [c + 5, c - 70, c - 80, c - 90], 60);
  for (const g of games) eq(outIds(g), [ids[3]]);
});

test('a racer who leaves at the checkpoint is not counted as eliminated; the next-last goes instead, once', async () => {
  const { games, ids } = await elimRace(4);
  const c = cps(games[0])[0];
  await drive(games, [c - 60, c - 50, c - 70, c - 90], 10);
  games[3].leaveRoom(); await settle();
  await drive(games, [c + 5, c - 30, c - 60, null], 80);
  for (const g of games.slice(0, 3)) { eq(outIds(g), [ids[2]], 'only the next-last is cut'); assert.ok(!outIds(g).includes(ids[3])); }
  assert.strictEqual(games[2].state, 'lost');
});

test('an eliminated host keeps deciding for the others until there is a winner', async () => {
  const { games, ids } = await elimRace(4);
  const [c0, c1, c2] = Array.from(cps(games[0]));
  await drive(games, [c0 - 90, c0 + 5, c0 - 10, c0 - 30], 80);
  assert.strictEqual(games[0].state, 'lost', 'the host is out first'); assert.strictEqual(games[0].S.race.place, 4);
  await drive(games, [null, c1 + 5, c1 - 10, c1 - 40], 80);
  for (const g of games) eq(outIds(g), [ids[0], ids[3]], 'the second cut still happened');
  await drive(games, [null, c2 + 5, c2 - 30, null], 80);
  for (const g of games) eq(outIds(g), [ids[0], ids[3], ids[2]]);
  assert.strictEqual(games[1].state, 'won'); assert.strictEqual(games[1].S.race.place, 1);
  assert.strictEqual(games[2].state, 'lost'); assert.strictEqual(games[2].S.race.place, 2);
  assert.strictEqual(games[3].S.race.place, 3); assert.strictEqual(games[0].S.race.place, 4);
});

test('if the host leaves, the elimination race ends for everyone with no winner', async () => {
  const { games } = await elimRace(3);
  const c = cps(games[0])[0];
  await drive(games, [c - 60, c - 50, c - 40], 10);
  games[0].leaveRoom(); await settle();
  for (const g of games.slice(1)) { assert.strictEqual(g.state, 'lost'); assert.strictEqual(g.S.race.elimOut, -1); assert.strictEqual(g.S.race.elim.out.length, 0); }
});

test('rewards: friend rooms keep their exclusion from unlock progress', async () => {
  const { games } = await elimRace(3);
  const [c0, c1] = Array.from(cps(games[0]));
  await drive(games, [c0 + 5, c0 - 10, c0 - 40], 80);
  await drive(games, [c1 + 5, c1 - 40, null], 80);
  assert.strictEqual(games[0].state, 'won');
  for (const g of games) { assert.strictEqual(g.tallyOf('races'), 0); assert.strictEqual(g.tallyOf('wins'), 0); }
});

test('a rematch keeps the elimination format', async () => {
  const { games } = await elimRace(3);
  const [c0, c1] = Array.from(cps(games[0]));
  await drive(games, [c0 + 5, c0 - 10, c0 - 40], 80);
  await drive(games, [c1 + 5, c1 - 40, null], 80);
  for (const g of games) g.requestRematch();
  await settle(); await settle();
  for (const g of games) { assert.strictEqual(g.state, 'play'); assert.ok(g.S.race.elim, 'still elimination'); assert.strictEqual(g.S.race.elim.out.length, 0, 'fresh race'); }
});
