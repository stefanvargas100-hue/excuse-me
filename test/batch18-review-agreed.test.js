// Friend Cup in a room: host setup, host-run bots, results that heal, players and hosts leaving. Simulated connection only. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load, readyPlayers } = require('./harness.js');

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

for(const bots of [2,'fill']) test('agreed gate survives later rounds, departure and host transfer: '+bots,async()=>{
 const L=await room(4);L.host.setRoomCup({stages:STAGES,difficulty:1,bots});await settle();await readyPlayers(L.games);L.host.hostStart();await settle();await settle();quiet(L.games);
 const racers=J(L.host.friendCup().racers.map(r=>r.id));
 await finishOrder(L.games,[0,1,2,3]);tickAll(L.games,300);await settle();
 for(const g of L.games)assert.equal(g.friendCup().rounds.length,1);
 await next(L);tickAll(L.games,6);await settle();
 L.games[3].leaveRoom();await settle();L.host.leaveRoom();await settle();
 const survivors=L.games.slice(1,3),newHost=survivors[0];quiet(survivors);
 assert.equal(newHost.lobbyPlayers().find(p=>p.me).host,true);
 for(let round=2;round<=4;round++){
  await finishOrder(survivors,[0,1]);tickAll(survivors,300);await settle();
  for(const g of survivors){assert.equal(g.friendCup().rounds.length,round);assert.equal(J(g.friendCup().racers.map(r=>r.id)),racers);assert.equal(J(table(g)),J(table(newHost)));assert.equal(g.friendCup().racers.filter(r=>r.left).length,2);}
  if(round<4)await next({host:newHost,games:survivors});
 }
});
test('all JSON invalid bot shapes remain inert on the receiving guest',async()=>{
 const L=await room(2);L.host.setRoomCup({stages:STAGES,difficulty:1,bots:0});await settle();const base=L.H.log.filter(m=>m.ev==='roster').at(-1).data;let rev=base.rev+1;
 for(const bots of [{},[],[0],{toString:null},1.2,8,-1,'0','2','bad',null]){
  assert.doesNotThrow(()=>L.guests[0].injectRoomMessage('roster',{...base,rev:rev++,cupCfg:{...base.cupCfg,bots}}));
  assert.equal(L.guests[0].roomCup().valid,false);assert.equal(L.guests[0].roomCup().botCount,null);assert.match(L.guests[0].lobbyStatus(),/host is choosing/);assert.equal(L.guests[0].canStartRoom(),false);assert.notEqual(L.guests[0].state,'play');
 }
});
