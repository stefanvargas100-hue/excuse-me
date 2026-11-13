const test=require('node:test'),assert=require('node:assert/strict');
const {load,readyPlayers}=require('./harness');
const settle=async()=>{for(let i=0;i<100;i++)await Promise.resolve();};
async function pair(level=0,mutate){const members=[],sent=[];const factory=()=>{const m={handlers:[],live:false};members.push(m);return {join:async()=>m.live=true,leave:()=>m.live=false,onClose(){},onMessage:f=>m.handlers.push(f),send:(ev,d)=>{d=mutate?mutate(members.indexOf(m),ev,{...d}):d;sent.push([ev,JSON.parse(JSON.stringify(d))]);for(const p of members)if(p!==m&&p.live)Promise.resolve().then(()=>p.handlers.forEach(h=>h(ev,JSON.parse(JSON.stringify(d)))));}};};const h=load(null,{compat:true,dom:true}),g=load(null,{compat:true,dom:true});h.useRoomFactory(factory);g.useRoomFactory(factory);await h.hostRoom(level);const joined=await g.joinRoom('abcd');await settle();return {h,g,sent,joined};}
test('protocol 10 rejects old/missing hello before roster or readiness mutations',async()=>{
 const e=load(null,{compat:true,dom:true}),sent=[];e.useRoomFactory(()=>({join:async()=>{},leave(){},onClose(){},onMessage(){},send:(ev,d)=>sent.push([ev,d])}));await e.hostRoom(0);
 for(const proto of [undefined,7,9,11]){e.injectRoomMessage('hello',{id:'oldpeer1',proto,startProtocol:2,name:'Old'});assert.equal(e.lobbyPlayers().length,1);assert.equal(e.canStartRoom(),false);}
 assert.ok(sent.some(([ev,d])=>ev==='full'&&d.why==='version'));
});
test('actual room sender/receiver share route-only and side-route ghost keys; invalid identities never persist',async()=>{
 for(const level of [0,1,2,3,4,5,6]){const {h,g,sent}=await pair(level),id=h.LEVELS[level].id,who=g.lobbyPlayers().find(p=>p.me).id;
  const identity=h.ghostIdentity?h.ghostIdentity('race',id):{kind:'race',rules:2,stage:id,course:':rt1'};
  const ghost={step:2,pts:[0,0,0,12]};
  const before=JSON.stringify(h.storage);
  for(const change of [{rules:1},{rules:undefined},{course:'wrong'},{course:undefined},{stage:'wrong'},{proto:8},{proto:undefined}])h.injectRoomMessage('ghost',{id:who,proto:10,...identity,level,ghost,...change});
  assert.equal(JSON.stringify(h.storage),before);
  const key=h.ghostKeyFor?h.ghostKeyFor('race',id):'excuseme_ghost_race_'+id+':standard:r2';h.storage[key]=JSON.stringify([0,0,0,6,0,12]);await readyPlayers([h,g]);h.hostStart();await settle();
  const packet=sent.find(([ev,d])=>ev==='ghost'&&d.kind==='race');assert.ok(packet,'new own race ghost sent');assert.equal(packet[1].proto,10);assert.equal(packet[1].stage,id);assert.equal(packet[1].rules,2);
  assert.ok(g.storage[g.friendGhostKey('race',id)]);assert.equal(JSON.parse(g.storage[g.friendGhostKey('race',id)]).length,1);
  h.leaveRoom();g.leaveRoom();
 }
});
test('old/missing peer packets cannot alter a compatible roster, readiness, rematch or Cup',async()=>{
 const {h,g}=await pair(),id=g.lobbyPlayers().find(p=>p.me).id;
 const snapshot=()=>JSON.stringify({players:h.lobbyPlayers(),cup:h.friendCup(),state:h.state,rematch:h.rematchState()});
 const before=snapshot();
 for(const proto of [undefined,9,11])for(const event of ['lobby:ready','lobby:start','start','rematch','cup','bots','ghost','bye','dnf','outcomes','pos','fin'])h.injectRoomMessage(event,{proto,id,level:0,rev:999,ready:true,kind:'race',rules:2,stage:'airport',course:':rt1',ghost:{step:2,pts:[0,0,0,9]}});
 assert.equal(snapshot(),before);h.leaveRoom();g.leaveRoom();
});
test('old host/new guest and new host/old guest fail through real join callers with readable update messages',async()=>{
 for(const endpoint of [0,1])for(const proto of [undefined,9,11]){
  const {h,g,joined}=await pair(0,(index,event,d)=>{if(index===endpoint&&(event==='hello'||event==='roster'))d.proto=proto;return d;});
  assert.equal(joined,false);assert.notEqual(g.state,'play');assert.equal(g.canStartRoom(),false);assert.match(g.element('friendStatus').textContent,/update|different version/i);h.leaveRoom();g.leaveRoom();
 }
});
test('airport Friend Cup stays on new rules/protocol with generated crowd and suppressed ordinary records',async()=>{
 const {h,g}=await pair(0);h.setRoomCup({stages:[1,3,4,5],difficulty:1});await settle();await readyPlayers([h,g]);h.hostStart();await settle();
 for(const e of [h,g]){assert.equal(e.LV.id,'airport');assert.equal(e.S.run.category,'friendcup');assert.equal(e.S.run.rules,2);assert.equal(e.S.run.policy.records,false);assert.equal(e.S.run.policy.ghosts,false);assert.equal(e.S.people.filter(p=>!p.prop&&p.z>30&&p.z<76&&p.x>3.9&&p.x<=5.9).length,0);}
 h.leaveRoom();g.leaveRoom();
});
