// Friend Cup in a room: host setup, host-run bots, results that heal, players and hosts leaving. Simulated connection only. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load, readyPlayers } = require('./harness.js');

const DT = 1 / 30, STAGES = [1, 3, 4, 5], POINTS = [10, 8, 6, 5, 4, 3, 2, 1];
const settle = () => new Promise(r => setTimeout(r, 5));
const J = x => JSON.stringify(x);

// A pretend Realtime room. It logs every message, and H.drop(event, data, targetIndex) can lose one for one phone.
function hub() {
  const members = [], H = { log: [], drop: null };
  let made = 0;
  H.factory = () => {
    const me = { handlers: [], joined: false, idx: made++ };
    me.api = {
      join: async () => { me.joined = true; members.push(me); },
      send: (ev, d) => {
        if (!me.joined) return;
        const text = JSON.stringify(d), copy = JSON.parse(text);
        H.log.push({ ev, data: copy, bytes: text.length, from: me.idx });
        for (const o of members) if (o !== me && !(H.drop && H.drop(ev, copy, o.idx))) Promise.resolve().then(() => o.handlers.forEach(h => h(ev, JSON.parse(text))));
      },
      leave: () => { me.joined = false; const i = members.indexOf(me); if (i >= 0) members.splice(i, 1); },
      onMessage: f => me.handlers.push(f), onClose: () => {}
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
    const g = load(undefined, {...opts.load, dom:true}); g.useRoomFactory(H.factory);
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

test('finish immediately watches the running leader; cycling and stop preserve own result', async () => {
 const L=await cup(2), g=L.host;
 const bots=botsOf(g); bots[0].z=90; bots[1].z=70;
 await finishOrder(L.games,[0]);
 assert.strictEqual(g.S.race.spectate.target,bots[0]);
 const place=g.S.race.place, time=g.S.duel.finish;
 await g.element('spectateNext').onclick();
 assert.notStrictEqual(g.S.race.spectate.target,bots[0]);
 await g.element('spectatePrev').onclick();
 assert.strictEqual(g.S.race.spectate.target,bots[0]);
 bots[0].done=true; g.tick(DT);
 assert.notStrictEqual(g.S.race.spectate.target,bots[0]);
 await g.element('spectateStop').onclick();
 assert.strictEqual(g.element('end').hidden,false);
 assert.strictEqual(g.S.race.spectate.target,null);
 tickAll(L.games,30);
 assert.strictEqual(g.S.race.place,place);
 assert.strictEqual(g.S.duel.finish,time);
 assert.strictEqual(g.S.race.spectate.target,null);
});


test('all done goes to results and solo remains unchanged', async()=>{
 const L=await cup(2); await finishOrder(L.games,[1,0]); tickAll(L.games,30);
 assert.strictEqual(L.host.S.race.spectate.target,null);
 assert.strictEqual(L.host.element('end').hidden,false);
 const g=load(undefined,{dom:true}); g.start('race'); g.S.race.countT=0; g.S.pz=g.LV.goal+1; g.tick(DT);
 assert.strictEqual(g.S.race.spectate.target,null);
});
test('departed target is skipped and last finish opens results', async()=>{
 const L=await cup(2),g=L.guests[0]; await finishOrder(L.games,[1]);
 const target=g.S.race.spectate.target;
 g.S.duel.peers[target.peerId].bye=true; g.tick(DT);
 assert.notStrictEqual(g.S.race.spectate.target,target);
 for(const b of g.S.race.bots) b.done=true;
 g.tick(DT); assert.strictEqual(g.S.race.spectate.target,null); assert.strictEqual(g.element('end').hidden,false);
});
test('host bots finish identically while watching or stopped; input cannot move the finisher',async()=>{
 const outcomes=[];
 for(const stop of [false,true]) {
  const L=await cup(2,{load:{seed:42}}),g=L.host;
  await finishOrder(L.games,[0]); if(stop) g.element('spectateStop').onclick();
  const x=g.S.px,z=g.S.pz; g.keys.l=true; g.action('M'); g.action('L');
  for(let i=0;i<12000 && botsOf(g).some(b=>!b.done);i++) g.tick(DT);
  assert.strictEqual(g.S.px,x); assert.strictEqual(g.S.pz,z);
  assert.ok(botsOf(g).every(b=>b.done)); outcomes.push(botsOf(g).map(b=>b.finishT));
 }
 assert.strictEqual(J(outcomes[0]),J(outcomes[1]));
});

test('finished host and guest emit identical traffic while watching and stopped',async()=>{
 for(const index of [0,1]) {
  const logs=[];
  for(const stop of [false,true]) {
   const L=await cup(2,{load:{seed:77}}),g=L.games[index];
   await finishOrder(L.games,[index]); if(stop) g.element('spectateStop').onclick();
   const start=L.H.log.length; tickAll(L.games,60);
   logs.push(L.H.log.slice(start).filter(m=>m.from===index));
  }
  assert.strictEqual(J(logs[0]),J(logs[1]));
 }
});

test('knocked out friend watches while the race continues',async()=>{
 const L=await room(3),g=L.games[1]; L.host.setRoomElim(true); await settle(); await readyPlayers(L.games); L.host.hostStart(); await settle(); quiet(L.games);
 g.injectRoomMessage('elim',{proto:12,id:L.ids[0],race:g.S.duel.seed,rev:1,out:[L.ids[1]]}); g.tick(DT);
 assert.strictEqual(g.S.race.elim.meOut,true); assert.ok(g.S.race.spectate.target);
});
test('Cup next race starts while guest is still watching',async()=>{
 const L=await cup(2),g=L.guests[0]; await finishOrder(L.games,[1]); assert.ok(g.S.race.spectate.target);
 await finishOrder(L.games,[0]); L.host.requestRematch(); await settle(); await settle();
 assert.strictEqual(g.state,'play'); assert.strictEqual(g.S.race.spectate.target,null); assert.strictEqual(g.element('spectateBar').hidden,true);
});
