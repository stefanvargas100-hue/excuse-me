const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./harness');
const DT=1/30;
function subway(mode='classic',seed=42){const E=load(undefined,{seed});assert.equal(E.LEVELS[5]?.id,'subway');E.setLevel(5);E.start(mode);E.tick(DT);return E;}
const commuters=E=>E.S.people.filter(p=>p.commuter);
test('subway is appended as the sixth stage and leaves the other indexes alone',()=>{
 const E=subway();assert.equal(E.LEVELS.map(l=>l.id).join(','),'airport,nyc,shibuya,park,bridge,subway');
 const L=E.LEVELS[5];assert.equal(L.city,'New York');assert.equal(L.name,'Subway Platform');assert.equal(L.goal,450);assert.equal(L.goalText,'UPTOWN EXIT');assert.equal(L.half,4.5);
 assert.ok(L.events.includes('train'));assert.ok(!L.events.includes('weave'),'weave is wider than this platform');
});
test('a train wave appears beyond SPAWN_FAR, in separate door groups with a clear way through',()=>{
 for(let seed=1;seed<=12;seed++){
  const E=subway('classic',seed);E.S.people=[];E.runEvent('train');
  const c=commuters(E);assert.ok(c.length>=6,'a real wave');
  for(const p of c)assert.ok(p.z-E.S.pz>=66,'beyond SPAWN_FAR');
  const zs=c.map(p=>p.z).sort((a,b)=>a-b);const groups=[[zs[0]]];
  for(let i=1;i<zs.length;i++){if(zs[i]-zs[i-1]>2)groups.push([zs[i]]);else groups[groups.length-1].push(zs[i]);}
  assert.ok(groups.length>=3,'several doors');
  for(let i=1;i<groups.length;i++)assert.ok(groups[i][0]-groups[i-1].at(-1)>=6,'clear gap between door groups: '+(groups[i][0]-groups[i-1].at(-1)).toFixed(1));
  for(const g of groups)assert.ok(g.at(-1)-g[0]<=1.5,'each door group is tight');
  assert.ok(E.S.people.some(p=>p.prop==='train'),'train cars');
 }
});
test('a wave treats every racer alike: it never depends on where the player is',()=>{
 const snap=px=>{const E=subway('classic',7);E.S.people=[];E.S.px=px;E.runEvent('train');return JSON.stringify(E.S.people.map(p=>[p.x,p.z,p.prop||'']));};
 assert.equal(snap(-3),snap(3));
});
test('the same seed gives the same wave',()=>{
 const snap=()=>{const E=subway('classic',9);E.S.people=[];E.runEvent('train');return JSON.stringify(E.S.people.map(p=>[p.x,p.z]));};assert.equal(snap(),snap());
});
test('people, player and bots stay inside the platform half-width through trains',()=>{
 const E=subway('race',5);E.S.race.countT=0;
 for(let i=0;i<1800&&E.state==='play';i++){
  if(i%240===0){E.runEvent('train');}
  for(const p of E.S.people)if(Math.abs(p.z-E.S.pz)<1.2)p.dead=true;
  E.tick(DT);
  assert.ok(Math.abs(E.S.px)<=E.LV.half-0.4,'player');
  for(const b of E.S.race.bots)assert.ok(Math.abs(b.x)<=E.LV.half-0.4,'bot '+b.x);
  for(const p of E.S.people)if(!p.prop&&!p.free&&!p.dead)assert.ok(Math.abs(p.x)<=E.LV.half,'crowd '+p.x);
 }
 assert.ok(commuters(E).length>0||E.S.pz>0);
});
test('commuters cross the platform and join the crowd',()=>{
 const E=subway();E.S.people=[];E.runEvent('train');const c=commuters(E);const x0=c.map(p=>p.x);
 E.S.pz=c[0].z-30;for(let i=0;i<240;i++){for(const p of E.S.people)if(p.prop)p.dead=false;E.tick(DT);}
 assert.ok(c.some(p=>p.x<x0[c.indexOf(p)]-2||p.dead),'they moved toward the wall side');
});
test('subway renders at several positions in every mode, and drawing never changes the simulation',()=>{
 const E=subway();for(const mode of ['classic','race']){E.start(mode);for(const z of [0,60,150,220,300,400,449,500]){E.S.pz=z;E.S.me.z=z;E.runEvent('train');E.render();}}
 const go=draw=>{const F=subway();for(let i=0;i<180;i++){F.tick(DT);if(draw)F.render();}return JSON.stringify([F.S.pz,F.S.score,F.S.people.map(p=>[p.x,p.z])]);};assert.equal(go(true),go(false));
});
test('classic continues past the subway finish, and a bot race reaches UPTOWN EXIT',()=>{
 const E=subway();E.S.pz=450;E.S.me.z=450;E.S.people=[];E.tick(DT);assert.ok(E.S.endless&&E.S.pz>450);
 const R=subway('race',3);for(let i=0;i<20000&&!R.S.race.finished;i++)R.tick(DT);assert.equal(R.S.race.finished,true);assert.ok(R.S.pz>=450);
});
