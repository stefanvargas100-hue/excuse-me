const test=require('node:test'),assert=require('node:assert/strict');
const {runCase}=require('../tools/build-bot-trial.cjs');
test('trial applies approved/legacy points to native bot caches and player, retaining populated ticks',()=>{
 for(const treatment of ['legacy','A']){
  const r=runCase({treatment,level:5,seed:42,kit:'speed',rotation:0,seconds:8});
  assert.equal(r.bots.length,3);assert.ok(r.treatmentVerified);assert.ok(r.maxPeople>0);
  assert.deepEqual(r.bots.map(b=>b.points.speed),treatment==='A'?[7,10,13]:[8,10,10]);
  assert.ok(r.bots.every(b=>b.z>0&&Number.isFinite(b.speed)));
 }
});
test('actual geometry produces repeated bot collisions and no cross-floor contact',()=>{
 const r=runCase({treatment:'A',level:5,seed:42,kit:'speed',rotation:0,seconds:20,collisions:true});
 assert.ok(r.bots.every(b=>b.bumps>=2));
 assert.ok(r.bots.every(b=>b.bumpSeconds>0));
 assert.equal(r.crossRouteBumps,0);
});
test('representative native populated race repeats exactly with fixed seed',()=>{
 const o={treatment:'A',level:6,seed:8,kit:'speed',rotation:2,seconds:12};
 const a=runCase(o);assert.ok(a.maxPeople>0);assert.equal(a.bots.length,3);assert.deepEqual(a,runCase(o));
});
