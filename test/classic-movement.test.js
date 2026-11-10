const test = require('node:test');
const assert = require('node:assert/strict');
const {load} = require('./harness');
test('razor passes keep time and grant the shared near speed boost',()=>{const e=load(); e.start(false,'classic'); const s=e.S; const p=e.mkPerson(.65,0); p.circles=[{ox:0,r:.3}]; e.onPass(p); assert.equal(s.hitStop,0); assert.equal(s.slowT,0); assert.ok(e.nearMul(s)>1);});
for(const build of ['small','medium','large']) test(build+' Classic movement matches a race at equivalent state',()=>{const e=load(); e.LOOK.build=build; e.start(false,'classic'); e.S.people=[]; e.S.chain=12; e.S.energy=30; e.tick(.01); const v=e.S.speed; e.start(false,'race'); e.S.race.countT=0; e.S.speed=3; e.S.people=[]; e.S.chain=12; e.S.energy=30; e.tick(.01); assert.equal(v,e.S.speed);});
test('Classic pickups continue past goal, collect swept, expire and reset', () => {
  const e = load(); e.start(false, 'classic');
  // Teleporting must not populate a new crowd before this pickup-only check.
  e.S.pz = 2000; e.S.people = []; e.S.nextChunk = 1e9;
  e.tick(.01); assert.equal(e.state, 'play');
  assert.ok(e.S.pickups.some(p => p.z > 2000)); assert.ok(e.S.pickups.length < 10);
  const pk = e.S.pickups.find(p => p.z > 2000);
  pk.type = 'boost'; pk.x = e.S.px; pk.z = e.S.pz + .01;
  e.S.people = []; e.tick(.01); assert.equal(e.state, 'play'); assert.ok(e.powerMul(e.S) > 1);
  e.S.people = []; e.tick(4); assert.equal(e.state, 'play'); assert.equal(e.powerMul(e.S), 1);
  e.start(false, 'classic'); assert.equal(e.powerMul(e.S), 1);
  assert.ok(e.S.pickups.every(p => p.z < 2000));
});
test('Classic clear path protects from collisions',()=>{const e=load();e.start(false,'classic');e.S.ghostT=2;e.S.people=[e.mkPerson(0,.1)];e.tick(.01);assert.equal(e.state,'play');});
test('Classic does not invent pedestrian drafting',()=>{const e=load();e.start('classic');assert.equal(e.S.race,null);for(let i=0;i<90;i++){e.S.people=[];e.S.nextChunk=1e9;const p=e.mkPerson(e.S.px,e.S.pz+2);p.vz=3;e.tick(1/30);}assert.equal(e.S.draftT,0);assert.equal(e.S.draftC,0);});
test('Classic rules leave old local records and ghosts untouched',()=>{const e=load();const old='[0,0,0,300]';e.storage.excuseme_ghost_airport=old;e.storage.excuseme_best_airport='9999';e.start('classic');assert.equal(e.S.ghost,null);e.S.ghostRec=[0,0,0,20];e.S.score=100;e.S.people=[e.mkPerson(0,0)];e.tick(.01);assert.equal(e.storage.excuseme_best_airport,'9999');assert.equal(e.storage.excuseme_ghost_airport,old);assert.ok(e.storage['excuseme_best_airport:cm2']);});
test('pickup collection respects floors and refill effect',()=>{const e=load();e.start('classic');e.S.energy=2;e.S.pickups=[{x:0,z:1,type:'refill',taken:false}];e.S.route='upper';e.collectPowerups(e.S,0,2,0,true);assert.equal(e.S.energy,2);e.S.route='';e.collectPowerups(e.S,0,2,0,true);assert.equal(e.S.energy,100);});
test('diagonal movement collects a pickup crossed between endpoints',()=>{const e=load();e.start('classic');e.S.pickups=[{x:0,z:5,type:'boost',taken:false}];e.collectPowerups(e.S,2,10,0,true,-2);assert.equal(e.powerMul(e.S),1.6);});
test('Classic applies shared movement after the tutorial finishes in the same run',()=>{const e=load();e.storage.excuseme_tut='0';e.start('classic');assert.ok(e.S.tut);e.S.tut=null;e.S.people=[];e.tick(.01);assert.ok(e.S.moveStats);assert.ok(e.S.pickups.length>0);});
