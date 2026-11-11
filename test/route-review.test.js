const {test}=require('node:test'),assert=require('node:assert/strict');
const {steer,drive}=require('../tools/route-review.cjs');
test('controller steers away from a visible central obstacle',()=>{
 const s={px:0,pz:0,vx:0,speed:4,route:'',people:[{x:0,z:4,circles:[{ox:0,oz:0,r:.5}]}]};
 assert.notEqual(steer(s,3,0),0);
});
test('physical steering fixture avoids obstacle without clearing it',()=>{
 const E=require('./harness').load(undefined,{seed:4});E.setLevel(6);E.start(false,'race');E.S.race.countT=0;E.S.race.bots=[];E.S.people=[];E.S.nextChunk=1e9;E.S.fastT=E.S.rivalT=1e9;
 const p=E.mkPerson(0,8);Object.assign(p,{prop:'barrier',v0:0,circles:[{ox:0,oz:0,r:.5}]});
 let lateral=0;for(let i=0;i<600&&E.S.pz<14;i++){const x=E.S.px,u=steer(E.S,3,0);E.keys.l=u<0;E.keys.r=u>0;E.tick(1/60);lateral+=Math.abs(E.S.px-x);}
 assert.ok(E.S.pz>=14);assert.equal(E.S.bumps,0);assert.ok(lateral>.8);assert.ok(E.S.people.includes(p));
});

test('clean control contains no actors or collisions for the complete course',()=>{
 const r=drive({level:5,seed:8,side:false,build:'large',clean:true});
 assert.equal(r.maxActors,0);assert.equal(r.bumps,0);assert.ok(r.completed);
});
test('ordinary traversal generates route props without forced route state',()=>{
 for(const level of [5,6]){
  const E=require('./harness').load(undefined,{seed:42});E.setLevel(level);E.start(false,'race');E.S.race.countT=0;E.S.race.bots=[];
  const entry=level===5?80:70,entryX=level===5?3.3:2.6;let observed=0,entered=false;
  for(let n=0;n<10000&&E.S.pz<230;n++){
   const s=E.S,approach=!entered&&s.pz>entry-22&&s.pz<entry+6;
   const err=entryX-s.px-s.vx*.14;
   const u=approach?(Math.abs(err)<.08?0:Math.sign(err)):steer(s,E.LV.half-.55,0);
   E.keys.l=u<0;E.keys.r=u>0;E.tick(1/60);entered ||= !!s.route;
   if(s.route&&s.pz>entry+40)observed=Math.max(observed,s.people.filter(p=>p.route===s.route&&p.prop&&p.z>s.pz&&p.z<s.pz+60).length);
  }
  assert.ok(entered);assert.ok(observed>0,'active route has real upcoming props');assert.ok(E.S.pz>=230);
 }
});
