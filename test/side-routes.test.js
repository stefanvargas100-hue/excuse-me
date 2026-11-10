const test=require('node:test'), assert=require('node:assert/strict'), vm=require('node:vm'), esbuild=require('esbuild');
const {load}=require('./harness');
function moduleOf(file){const m={exports:{}};vm.runInNewContext(esbuild.buildSync({entryPoints:[file],bundle:true,format:'cjs',write:false}).outputFiles[0].text,{module:m,exports:m.exports});return m.exports;}
const R=moduleOf('src/config/side-routes.js');
function drive(useRoute){let r={x:useRoute?3.3:0,z:0,route:''},t=0;while(r.z<450&&t<200){const prev=r.z;R.updateRoute('subway',r,prev);r.z+=4*R.routeSpeed('subway',r)/60;t+=1/60;}return t;}
test('Subway hard stairs and mezzanine save 3-8% on a scripted complete drive',()=>{const main=drive(false),side=drive(true),gain=1-side/main;assert.ok(gain>=.03&&gain<=.08,JSON.stringify({main,side,gain}));});
test('route entry is local, persists until exit and then rejoins',()=>{const r={x:3.3,z:82};R.updateRoute('subway',r,81);assert.equal(r.route,'mezzanine');r.x=0;r.z=180;R.updateRoute('subway',r,179);assert.equal(r.route,'mezzanine');r.z=301;R.updateRoute('subway',r,299);assert.equal(r.route,'');});
test('remote interpolation carries route immediately',()=>{const remote=moduleOf('src/online/remote.js').createRemote();remote.push({n:1,x:0,z:120,vx:0,s:4,route:'mezzanine'},1);assert.equal(remote.sample(1).route,'mezzanine');});
test('crowd on the platform cannot collide with a mezzanine racer',()=>{const E=load(undefined,{seed:4});E.setLevel(5);E.start('race');E.S.people=[];E.S.pz=150;E.S.px=0;E.S.route='mezzanine';E.S.speed=4;E.mkPerson(0,150);E.raceCollide(1/60);assert.equal(E.S.pz,150);assert.equal(E.S.bumps,0);});
test('remote racers on a different floor do not push the player',()=>{const E=load(undefined,{seed:8});E.setLevel(5);E.start('race');E.S.people=[];E.S.px=0;E.S.pz=150;E.S.route='mezzanine';E.S.duel={meId:'a'};E.S.race.bots=[{remote:true,peerId:'b',x:0,z:150.1,vx:0,speed:0,route:''}];E.raceCollide(1/60);assert.equal(E.S.pz,150);assert.equal(E.S.px,0);});
test('a mezzanine shout cannot move shoppers on the platform',()=>{const E=load(undefined,{seed:8});E.setLevel(5);E.start('race');E.S.people=[];E.S.px=0;E.S.pz=150;E.S.route='mezzanine';const p=E.mkPerson(0,152);E.S.shoutCD=0;E.shout();assert.ok(!(p.aside>0));});
test('old untagged friend ghosts cannot compete on the side-route course',()=>{const G=moduleOf('src/sim/ghostshare.js');const mem={'excuseme_fg_race_subway':JSON.stringify([{name:'Old',step:.4,pts:[0,0,0,10],t:1}])};const store={get:(k,d)=>mem[k]??d,set:(k,v)=>mem[k]=v};assert.equal(G.friendGhosts(store,'race','subway').length,0);assert.equal(G.saveFriendGhost(store,'race','subway','New',{step:.4,pts:[0,0,0,10]}),true);assert.equal(G.friendGhosts(store,'race','subway')[0].name,'New');});
test('room sharing sends the tagged Subway ghost and receives route positions',async()=>{
 const {readyPlayers}=require('./harness'),members=[],sent=[];
 const factory=()=>{const m={handlers:[],joined:false};return {join:async()=>{m.joined=true;members.push(m);},leave:()=>{},onMessage:f=>m.handlers.push(f),onClose:()=>{},send:(ev,d)=>{sent.push([ev,d]);const copy=JSON.parse(JSON.stringify(d));for(const o of members)if(o!==m)Promise.resolve().then(()=>o.handlers.forEach(f=>f(ev,copy)));}};};
 const host=load(undefined,{seed:4}),guest=load(undefined,{seed:5});host.useRoomFactory(factory);guest.useRoomFactory(factory);const code=await host.hostRoom(5);await guest.joinRoom(code);await new Promise(r=>setTimeout(r,5));await readyPlayers([host,guest]);
 host.storage.excuseme_ghost_race_subway=JSON.stringify([0,0,0,400]);host.storage['excuseme_ghost_race_subway:sr2']=JSON.stringify([0,0,0,450]);host.hostStart();await new Promise(r=>setTimeout(r,10));
 const ghost=sent.find(([ev,d])=>ev==='ghost'&&d.kind==='race');assert.ok(ghost);assert.equal(ghost[1].ghost.pts.at(-1),450,'send the new course, never legacy');
 host.S.duel.send('pos',{n:1,x:0,z:150,vx:0,s:4,route:'mezzanine'});await new Promise(r=>setTimeout(r,5));const peer=Object.values(guest.S.duel.peers).find(p=>!p.ai);assert.equal(peer.remote.sample(guest.S.clock).route,'mezzanine');host.leaveRoom();guest.leaveRoom();
});

test('back alley scripted drive is no faster and within 1% of main',()=>{const R=moduleOf('src/config/side-routes.js');function drive(side){let r={x:side?2.6:0,z:0,route:''},t=0,entered=false;while(r.z<360&&t<200){R.updateRoute('takeshita',r,r.z);entered ||= !!r.route;r.z+=4*R.routeSpeed('takeshita',r)/60;t+=1/60;}return {t,entered};}const main=drive(false),side=drive(true);assert.ok(side.entered);const cost=side.t/main.t-1;assert.ok(cost>=0&&cost<=.01,JSON.stringify({main,side,cost}));});


for(const [runner,spill,expected] of [['mezzanine','',0],['','mezzanine',0],['mezzanine','mezzanine',.7],['','',.7]]) test('spill floor isolation '+JSON.stringify({runner,spill}),()=>{
 const E=load(undefined,{seed:8}); E.setLevel(5); E.start(false,'race');
 for(let i=0;i<91;i++) E.tick(1/30);
 E.S.people=[]; E.S.race.bots=[]; E.S.nextChunk=1e9;
 E.S.px=0; E.S.pz=150; E.S.route=E.S.me.route=runner; E.S.slipT=0;
 Object.assign(E.mkPerson(0,150),{prop:'spill',circles:[],route:spill}); E.tick(1/60);
 assert.equal(E.S.slipT,expected);
});

for(const [level,id] of [[5,'mezzanine'],[6,'back-alley']]){
 function population(seed){const E=load(undefined,{seed});E.setLevel(level);E.start(false,'race');E.S.people=[];for(let z=64;z<304;z+=4)E.genChunk(z);return E.S.people.filter(p=>p.route===id);}
 test(id+' has deterministic real props and pedestrians with safe stairs and gaps',()=>{
  const a=population(42),b=population(42);assert.ok(a.some(p=>p.prop),'route has obstacles');assert.ok(a.some(p=>!p.prop),'route has pedestrians');
  const key=p=>[p.x,p.z,p.prop||'',p.shirt,p.phase,p.circles];assert.equal(JSON.stringify(a.map(key)),JSON.stringify(b.map(key)));
  const route=R.sideRoutes(level===5?'subway':'takeshita')[0];assert.ok(a.every(p=>p.z>=route.entrance+20&&p.z<=route.exit-20));
  for(const p of a.filter(p=>p.prop)) {const occupied=p.circles.map(c=>[p.x+c.ox-c.r-.25,p.x+c.ox+c.r+.25]);assert.ok(occupied.every(([x,y])=>y<0||x>0),'central lane stays open');}
 });
 test(id+' population cannot collide or shout across floors in either direction',()=>{
  for(const [runner,actor] of [['',id],[id,'']]){
   const E=load(undefined,{seed:4});E.setLevel(level);E.start(false,'race');E.S.people=[];E.S.pz=150;E.S.px=0;E.S.route=runner;
   const p=E.mkPerson(0,150);p.route=actor;E.raceCollide(1/60);assert.equal(E.S.bumps,0);p.z=152;E.S.shoutCD=0;E.shout();assert.ok(!(p.aside>0));
  }
 });
 test(id+' player and bot rejoin after their route exit',()=>{
  const E=load(undefined,{seed:42});E.setLevel(level);E.start(false,'race');E.S.race.countT=0;E.S.people=[];E.S.nextChunk=1e9;
  const exit=level===5?300:260,b=E.S.race.bots[0];E.S.race.bots=[b];E.S.route=E.S.me.route=b.route=id;E.S.pz=b.z=exit-.01;E.S.px=b.x=0;E.S.speed=b.speed=4;
  for(let n=0;n<4;n++)E.tick(1/60);assert.equal(E.S.route,'');assert.equal(b.route,'');assert.ok(b.z>exit);
 });
}
test('only populated route stages get new record/ghost course tags',()=>{const C=moduleOf('src/config/routes.js');assert.equal(C.courseTag('subway'),':sr2');assert.equal(C.courseTag('takeshita'),':sr2');assert.equal(C.courseTag('airport'),':rt1');assert.equal(C.courseTag('park'),'');});
test('bots get the same mezzanine cruise benefit as players',()=>{
 function advance(route){const E=load(undefined,{seed:42});E.setLevel(5);E.start(false,'race');E.S.race.countT=0;E.S.people=[];E.S.nextChunk=1e9;E.S.pz=140;const b=E.S.race.bots[0];E.S.race.bots=[b];b.x=0;b.z=150;b.route=route;b.speed=4;E.tick(1/60);return b.z-150;}
 assert.ok(advance('mezzanine')/advance('')>1.2);
});

test('route generation repeats for race and friend-course seeds',()=>{
 for(const level of [5,6]) for(const seed of ['room:1','daily:2026-11-10']){
  const E=load(undefined,{seed:42});E.setLevel(level);E.start(false,'race');E.S.seed=seed;
  const gen=()=>{E.S.people=[];for(let z=96;z<208;z+=4)E.genChunk(z);return JSON.stringify(E.S.people.map(p=>[p.x,p.z,p.route||'',p.prop,p.phase,p.shirt]));};
  const first=gen();assert.equal(gen(),first);assert.ok(E.S.people.some(p=>p.route));
 }
});
test('generated route barriers collide on their own floor and leave the centre traversable',()=>{
 for(const level of [5,6]){const E=load(undefined,{seed:42});E.setLevel(level);E.start(false,'race');E.S.people=[];for(let z=96;z<140;z+=4)E.genChunk(z);
  const p=E.S.people.find(p=>p.route&&p.prop);assert.ok(p);E.S.people=[p];E.S.route=p.route;E.S.px=p.x;E.S.pz=p.z;E.S.speed=4;E.raceCollide(1/60);assert.equal(E.S.bumps,1);
  E.S.bumps=0;E.S.ghostT=0;E.S.bumpT=0;E.S.px=0;E.S.pz=p.z;E.raceCollide(1/60);assert.equal(E.S.bumps,0);
 }
});
test('sr1 friend ghosts remain saved but cannot compete on sr2 courses',()=>{
 const G=moduleOf('src/sim/ghostshare.js'),old=JSON.stringify([{name:'Old',step:.4,pts:[0,0,0,10],t:1}]);
 for(const id of ['subway','takeshita']){const key='excuseme_fg_race_'+id+':sr1',mem={[key]:old};const store={get:(k,d)=>mem[k]??d,set:(k,v)=>mem[k]=v};assert.equal(G.friendGhosts(store,'race',id).length,0);assert.equal(mem[key],old);}
});

test('unseeded offline races still repeat route-local actor identities',()=>{
 const E=load(undefined,{seed:42});E.setLevel(5);E.start(false,'race');E.S.seed=0;
 const gen=()=>{E.S.people=[];E.genChunk(108);return JSON.stringify(E.S.people.filter(p=>p.route).map(p=>[p.x,p.z,p.phase,p.shirt]));};
 const first=gen();assert.notEqual(first,'[]');assert.equal(gen(),first);
});
