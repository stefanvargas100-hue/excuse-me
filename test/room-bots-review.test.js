// Independent batch 24 review: adversarial protocol and post-finish spectating.
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
test('review: a late field cannot replace declared bots or introduce an undeclared racer', async () => {
  const L = await botRace(2, { bots: 1, difficulty: 1 });
  const guest = L.guests[0];
  const before = J(guest.S.duel.order);
  guest.injectRoomMessage('field', { proto: PROTO, id: L.ids[0], race: guest.S.seed, difficulty: 2, bots: [{id:'bot:5',name:'Mia'}] });
  guest.injectRoomMessage('bots', { proto: PROTO, id: L.ids[0], race: guest.S.seed, n: 100, rows: [['bot:5',0,50,0,5,null]] });
  await settle(); tickAll(L.games, 6); await settle();
  assert.strictEqual(J(guest.S.duel.order), before);
  assert.ok(!guest.S.duel.peers['bot:5']);
  assert.ok(!guest.S.race.bots.some(b => b.peerId === 'bot:5'));
  for (const g of L.games) g.leaveRoom();
});

test('review: a finished host stops bot simulation after final rows but keeps spectating human racers', async () => {
  const L = await botRace(2, { bots: 1, difficulty: 1 });
  await finishOrder(L, [0, 'bot:0']);
  assert.strictEqual(L.host.state, 'won');
  const bot = botsOf(L.host)[0];
  assert.ok(bot.done && bot.finSent);
  const remote = L.host.S.race.bots.find(b => b.peerId === L.ids[1]);
  const oldZ = remote.z, oldTime = L.host.S.time;
  await drive(L, [null, 100], {}, 45);
  assert.strictEqual(L.host.S.time, oldTime, 'bot simulation has stopped');
  assert.ok(remote.z > oldZ + 20, 'host must still display the unfinished human moving: ' + oldZ + ' -> ' + remote.z);
  for (const g of L.games) g.leaveRoom();
});
