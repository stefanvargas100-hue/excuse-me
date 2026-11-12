// Friend Cup in a room: host setup, host-run bots, results that heal, players and hosts leaving. Simulated connection only. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load, readyPlayers } = require(require('node:path').join(process.cwd(),'test/harness.js'));

const DT = 1 / 30, STAGES = [2, 0, 4, 1], POINTS = [10, 8, 6, 5, 4, 3, 2, 1];
const settle = () => new Promise(r => setTimeout(r, 5));
const J = x => JSON.stringify(x);

// A pretend Realtime room. It logs every message, and H.drop(event, data, targetIndex) can lose one for one phone.
function hub() {
  const members = [], H = { log: [], drop: null, sockets: [] };
  let made = 0;
  H.factory = () => {
    const me = { handlers: [], closers: [], joined: false, idx: made++ };
    H.sockets.push(me); me.api = {
      join: async () => { me.joined = true; members.push(me); },
      send: (ev, d) => {
        if (!me.joined) return;
        const text = JSON.stringify(d), copy = JSON.parse(text);
        H.log.push({ ev, data: copy, bytes: text.length, from: me.idx });
        for (const o of members) if (o !== me && !(H.drop && H.drop(ev, copy, o.idx))) Promise.resolve().then(() => o.handlers.forEach(h => h(ev, JSON.parse(text))));
      },
      leave: () => { me.joined = false; const i = members.indexOf(me); if (i >= 0) members.splice(i, 1); },
      onMessage: f => me.handlers.push(f), onClose: f => me.closers.push(f)
    };
    return me.api;
  };
  return H;
}
const me = g => g.lobbyPlayers().find(p => p.me).id;

// n phones in a room, nobody ready yet. opts: { load: options for load(), names: saved names, beforeJoin(game, i) }
async function room(n, opts = {}) {
  const H = hub(), games = [];
  for (let i = 0; i < n; i++) {
    const g = load(undefined, opts.load); g.useRoomFactory(H.factory);
    if (opts.names) g.storage.excuseme_online_name = J(opts.names[i]);
    if (opts.beforeJoin) opts.beforeJoin(g, i);
    games.push(g);
  }
  const code = await games[0].hostRoom(0);
  for (let i = 1; i < n; i++) { assert.strictEqual(await games[i].joinRoom(code), true); await settle(); }
  await settle();
  return { H, games, host: games[0], guests: games.slice(1), code, ids: games.map(me) };
}
const quiet = games => { for (const g of games) if (g.S?.race) { g.S.race.countT = 0; g.S.people.length = 0; g.S.nextChunk = 1e9; } };
// A room whose host has set up a Cup and started race 1.
async function cup(n, opts = {}) {
  const L = await room(n, opts);
  L.stages = opts.stages || STAGES; L.difficulty = opts.difficulty ?? 1;
  assert.strictEqual(L.host.setRoomCup({ stages: L.stages, difficulty: L.difficulty }), true);
  await settle();
  await readyPlayers(L.games);
  L.host.hostStart(); await settle(); await settle();
  quiet(L.games);
  return L;
}
const tickAll = (games, frames = 1) => { for (let i = 0; i < frames; i++) for (const g of games) g.tick(DT); };
// Phones cross the line in the given order, a few frames apart.
async function finishOrder(games, order) {
  for (const i of order) { if (games[i].state === 'play') { games[i].S.pz = games[i].LV.goal + 1; } tickAll(games, 3); await settle(); }
  await settle();
}
const next = async L => { L.host.requestRematch(); await settle(); await settle(); quiet(L.games); };
const table = g => g.friendCupStandings().map(r => [r.id, r.points]);
const botsOf = g => g.S.race.bots.filter(b => b.aiBot);
const human = g => g.S.race.bots.filter(b => !b.aiBot);
const cupMessages = H => H.log.filter(m => m.ev === 'cup');
test('brief mid-Cup guest reconnect keeps agreement and accepts later results and next race',async()=>{
 const L=await room(2,{load:{clock:true}});L.host.setRoomCup({stages:STAGES,difficulty:1});await settle();await readyPlayers(L.games);L.host.hostStart();await settle();await settle();quiet(L.games);
 for(const g of L.games)g.advance(2000);await settle();
 const guest=L.guests[0],id=me(guest),old=L.H.sockets[1];old.joined=false;old.closers.forEach(f=>f());guest.advance(2000);await settle();L.host.advance(2000);await settle();
 assert.equal(me(guest),id);assert.equal(L.H.sockets.length,3);
 await finishOrder(L.games,[0,1]);tickAll(L.games,300);await settle();assert.equal(guest.friendCup().rounds.length,1);assert.equal(J(table(guest)),J(table(L.host)));
 await next(L);assert.equal(guest.state,'play');assert.equal(guest.S.seed,L.host.S.seed);
 assert.equal(L.host.setRoomCup({stages:STAGES,difficulty:1,bots:0}),false,'same-room Cup reconfiguration remains forbidden once raced');
});

