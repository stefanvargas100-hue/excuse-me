import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const { load, readyPlayers } = require('../test/harness.js');
const settle = () => new Promise(r => setTimeout(r, 5));
export async function simulate(n = 4, leaves = false, seconds = 6) {
  const members = [], counts = Array.from({length:n}, () => ({ sent: [], received: [] }));
  let second = 0;
  const games = counts.map((_, i) => {
    const g = load(undefined, {clock:true});
    g.useRoomFactory(() => {
      const m = {i, handlers:[]};
      return {join:async()=>members.push(m), onMessage:f=>m.handlers.push(f), onClose:()=>{},
        leave:()=>members.splice(members.indexOf(m),1), send:(ev,data)=>{
          counts[i].sent[second] = (counts[i].sent[second] || 0)+1;
          const json = JSON.stringify(data);
          for(const o of members) if(o!==m) {
            counts[o.i].received[second]=(counts[o.i].received[second]||0)+1;
            Promise.resolve().then(()=>o.handlers.forEach(f=>f(ev,JSON.parse(json))));
          }
        }};
    }); return g;
  });
  const code = await games[0].hostRoom(0);
  for(const g of games.slice(1)) { await g.joinRoom(code); await settle(); }
  games[0].setRoomCup({stages:[0,1,2,3],difficulty:1}); await settle();
  await readyPlayers(games); games[0].hostStart(); await settle(); await settle();
  let active = [...games], host = games[0];
  for(let race=0;race<4;race++) {
    for(const g of active) { g.S.race.countT=0; g.S.people.length=0; g.S.nextChunk=1e9; }
    for(let s=0;s<seconds;s++) {
      if(leaves && race===1 && s===1) {host.leaveRoom(); active=active.slice(1); await settle(); host=active[0];}
      for(let f=0;f<30;f++) {for(const g of active) g.tick(1/30); if(f%6===5) await settle();}
      for(const g of active) g.advance(1000);
      await settle(); second++;
    }
    for(const g of active) {g.S.pz=g.LV.goal+1; for(const p of active) p.tick(1/30); await settle();}
    await settle();
    if(host.friendCup().rounds.length!==race+1) throw Error('Cup did not settle race '+(race+1));
    if(race<3) {await readyPlayers(active); host.requestRematch(); await settle(); await settle();}
  }
  const result={games,active,counts,seconds:second};
  return result;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  for(const [n,left] of [[2,false],[4,false],[8,false],[4,true]]) {
    const r=await simulate(n,left,20);
    const stats=a=>({total:a.reduce((s,v)=>s+(v||0),0),average:(a.reduce((s,v)=>s+(v||0),0)/r.seconds).toFixed(2),peak:Math.max(...a.map(v=>v||0))});
    console.log(JSON.stringify({humans:n,hostLeaves:left,seconds:r.seconds,phones:r.counts.map(c=>({sent:stats(c.sent),received:stats(c.received)}))}));
  }
}
