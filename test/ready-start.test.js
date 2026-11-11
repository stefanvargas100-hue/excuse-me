const test = require('node:test');
const assert = require('node:assert/strict');
const {load} = require('./harness');
const settle = async () => { for (let i=0;i<60;i++) await Promise.resolve(); };
async function pair(options = {}) {
  const members=[];
  const factory=()=>{
    const m={handlers:[],closers:[],active:false}; members.push(m);
    return {join:async()=>{m.active=true;},leave:()=>{m.active=false;},onMessage:f=>m.handlers.push(f),onClose:f=>m.closers.push(f),send:(ev,data)=>{
      if(!m.active || options.drop?.(ev,data))return; for(const peer of members)if(peer!==m&&peer.active)Promise.resolve().then(()=>{if(peer.active)peer.handlers.forEach(f=>f(ev,JSON.parse(JSON.stringify(data))));});
    }};
  };
  const games=[load(null,{clock:true,dom:true,manualLobbyClock:true}),load(null,{clock:true,dom:true,manualLobbyClock:true})];
  games.forEach(g=>g.useRoomFactory(factory));
  const code=await games[0].hostRoom(1);assert.equal(await games[1].joinRoom(code),true);await settle();
  return {games,code,members};
}
test('host cannot start until every current player explicitly confirms readiness',async()=>{
  const {games:[h,g]}=await pair();h.hostStart();await settle();
  assert.notEqual(h.state,'play','host must remain in the lobby');assert.notEqual(g.state,'play');
  h.setRoomReady(true);await settle();h.hostStart();await settle();assert.notEqual(h.state,'play','guest has not confirmed');
  g.setRoomReady(true);await settle();assert.equal(h.canStartRoom(),true);
  assert.match(h.element('friendStatus').textContent,/ready/i,'visible status reflects that everyone is ready');
  h.hostStart();await settle();assert.equal(h.state,'play');assert.equal(g.state,'play');assert.equal(h.S.seed,g.S.seed);
});
test('changing the stage clears both ready confirmations and updates the ready controls',async()=>{
  const {games:[h,g]}=await pair();h.setRoomReady(true);g.setRoomReady(true);await settle();
  h.setRoomLevel(2);await settle();
  for(const p of [h,g])assert.ok(p.lobbyPlayers().every(r=>!r.ready));
  assert.equal(h.canStartRoom(),false);assert.equal(h.element('friendStart').disabled,true);
});

test('changing race format clears readiness and starts the same synchronized elimination race',async()=>{
  const {games:[h,g]}=await pair();h.setRoomReady(true);g.setRoomReady(true);await settle();
  h.setRoomElim(true);await settle();
  for(const p of [h,g])assert.ok(p.lobbyPlayers().every(r=>!r.ready),'format change requires fresh agreement');
  assert.equal(h.canStartRoom(),false);
  h.setRoomReady(true);g.setRoomReady(true);await settle();h.hostStart();await settle();
  for(const p of[h,g]){assert.equal(p.state,'play');assert.ok(p.S.race.elim);assert.ok(p.S.duel.startRemaining()>0);}
  assert.equal(h.S.seed,g.S.seed);
});
test('backgrounding in the lobby clears readiness without ending a short visit',async()=>{
  const {games:[h,g]}=await pair();h.setRoomReady(true);g.setRoomReady(true);await settle();
  g.visibility(true);await settle();g.visibility(false);await settle();
  assert.equal(h.canStartRoom(),false);assert.equal(g.lobbyPlayers().find(p=>p.me).ready,false);assert.equal(g.lobbyPlayers().length,2);
});
test('scheduled countdown cannot advance physics early even with accelerated simulation steps',async()=>{
  const {games:[h,g]}=await pair();h.setRoomReady(true);g.setRoomReady(true);await settle();h.hostStart();await settle();
  for(const p of [h,g]) {const z=p.S.pz;for(let i=0;i<300;i++)p.tick(1/30);assert.equal(p.S.pz,z);assert.equal(p.S.time,0);}
});
test('countdown gestures cannot spend stamina or shout before the shared GO',async()=>{
  const {games:[h,g]}=await pair();h.setRoomReady(true);g.setRoomReady(true);await settle();h.hostStart();await settle();
  const energy=h.S.energy;h.action('M');h.shout();assert.equal(h.S.energy,energy);assert.equal(h.S.shoutCD,0);
  h.advance(3001);g.advance(3001);await settle();h.tick(1/30);h.tick(1/30);assert.ok(h.S.time>0);
});
test('a shared pause holds both runners across GO and resumes without a new countdown',async()=>{
  const {games:[h,g]}=await pair();h.setRoomReady(true);g.setRoomReady(true);await settle();h.hostStart();await settle();
  g.pauseGame();await settle();h.advance(4000);g.advance(4000);await settle();for(const p of[h,g]){p.tick(1/30);assert.equal(p.S.time,0);assert.equal(p.state,'paused');}
  g.fire('keydown',{key:'p'});await settle();for(const p of[h,g]){p.tick(1/30);p.tick(1/30);assert.equal(p.state,'play');assert.ok(p.S.time>0);}
});
test('a missing start acknowledgement returns both phones to a usable lobby and they can retry',async()=>{
  let blocked=true;const {games:[h,g]}=await pair({drop:ev=>blocked&&ev==='lobby:committed'});
  h.setRoomReady(true);g.setRoomReady(true);await settle();h.hostStart();await settle();assert.equal(h.roomLobbyState().busy,true);
  h.advance(2600);g.advance(2600);await settle();
  for(const p of[h,g]){assert.notEqual(p.state,'play');assert.equal(p.roomLobbyState().phase,'idle');assert.equal(p.element('friendReady').disabled,false);assert.match(p.element('friendStatus').textContent,/cancel|ready/i);}
  blocked=false;h.setRoomReady(true);g.setRoomReady(true);await settle();h.hostStart();await settle();assert.equal(h.state,'play');assert.equal(g.state,'play');assert.equal(h.S.seed,g.S.seed);
});
test('a guest rejects an older host cleanly instead of occupying a room it cannot race in',async()=>{
  const g=load(null,{clock:true,dom:true});let handler,bye=false;
  g.useRoomFactory(()=>({join:async()=>{},leave(){},onMessage:f=>handler=f,onClose(){},send:(ev,d)=>{
    if(ev==='bye')bye=true;
    if(ev==='hello')Promise.resolve().then(()=>handler('roster',{id:'oldhost1',level:1,players:[{id:'oldhost1',name:'Old host'},{id:d.id,name:'Guest'}]}));
  }}));
  assert.equal(await g.joinRoom('ABCD'),false);assert.equal(g.lobbyPlayers().length,0);assert.match(g.lobbyStatus(),/update.*game/i);assert.equal(bye,true);
});
test('Ready becomes usable after a silent network gap without a socket close event',async()=>{
  let blocked=false,guestId;const {games:[h,g]}=await pair({drop:(ev,data)=>blocked&&data.id===guestId});
  guestId=g.lobbyPlayers().find(p=>p.me).id;h.setRoomReady(true);g.setRoomReady(true);await settle();
  blocked=true;h.advance(7000);g.advance(7000);await settle();
  blocked=false;h.advance(2000);g.advance(2000);await settle();
  assert.equal(g.roomLobbyState().pending,false);assert.equal(g.element('friendReady').disabled,false);
  assert.equal(g.setRoomReady(true),true);await settle();assert.equal(h.canStartRoom(),true);
});

test('Start confirms host intent without a separate Ready or automatic countdown',async()=>{
 const {games:[h,g]}=await pair();
 assert.equal(h.element('friendReady').hidden,true);
 assert.equal(g.element('friendReady').hidden,false);
 g.setRoomReady(true);await settle();
 assert.equal(h.canStartRoom(),true);assert.notEqual(h.state,'play');
 h.hostStart();await settle();assert.equal(h.state,'play');assert.equal(g.state,'play');
});
