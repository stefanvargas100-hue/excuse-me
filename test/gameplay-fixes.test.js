const test=require('node:test'), assert=require('node:assert/strict');
const {load}=require('./harness.js');
test('combo continues beyond eight, caps at sixteen, and adds 60 percent race speed',()=>{
  const E=load(); assert.equal(E.racePace(24,100),1.32); assert.equal(E.racePace(45,100),1.6); assert.equal(E.racePace(999,100),1.6);
  E.start('classic'); E.S.chain=44; E.S.lastPassT=E.S.time; E.S.multPrev=15;
  E.onPass(E.mkPerson(E.S.px+1,E.S.pz)); assert.equal(E.S.multPrev,16);
  assert.doesNotThrow(()=>E.render());
});
for(const edge of [1.9,5.9]) for(const kind of ['shoulder','suitcase','object']) test(`glass blocks ${kind} collisions across edge ${edge}`,()=>{
  const E=load(); E.start('race'); E.S.race.countT=0; E.S.people.length=0; E.S.race.bots.length=0;
  const sign=edge===1.9?1:-1; E.S.px=edge+sign*.22; E.S.pz=40; E.S.speed=3;
  const circle = kind==='suitcase' ? {ox:sign*.3,oz:-.5,r:.17} : kind==='shoulder' ? {ox:sign*.15,oz:0,r:.25} : {ox:0,oz:0,r:.35};
  const p=E.mkPerson(edge-sign*.22,40-(circle.oz||0)); p.circles=[circle]; if(kind==='object') p.prop='bin';
  E.raceCollide(1/60); assert.equal(E.S.bumps,0); assert.equal(E.S.px,edge+sign*.22); assert.ok(!p.hit);
  // The same hitbox remains solid on the player's side.
  p.x=E.S.px; E.raceCollide(1/60); assert.equal(E.S.bumps,1);
});
test('customization reports actual race units and faster recovery means shorter waits',()=>{
  const E=load(), neutral=E.statDetails({speed:0,accel:0,rec:0}), best=E.statDetails({speed:10,accel:10,rec:10});
  assert.ok(Math.abs(neutral.burstMph-12.07945)<.001); assert.ok(Math.abs(neutral.walkMph-6.71081)<.001);
  assert.ok(best.burstMph>neutral.burstMph); assert.ok(best.accel90<neutral.accel90);
  assert.ok(best.refillSeconds<neutral.refillSeconds); assert.ok(best.bumpSeconds<neutral.bumpSeconds);
  assert.equal(neutral.bumpSeconds,1.3); assert.ok(Math.abs(neutral.refillSeconds-100/9)<1e-9);
});

test('open ends still allow contact and collisions across the belt divider remain solid',()=>{
  for(const [x,px,z] of [[2.12,1.68,78],[3.7,4.1,40]]){
    const E=load(); E.start('race'); E.S.people.length=0; E.S.race.bots.length=0;
    E.S.px=x; E.S.pz=z; E.mkPerson(px,z); E.raceCollide(1/60);
    assert.equal(E.S.bumps,1);
  }
});
test('glass protects racers outside the belt too',()=>{
  const E=load(); E.start('race'); E.S.people.length=0; E.S.race.bots.length=0;
  E.S.px=1.68; E.S.pz=40; E.mkPerson(2.12,40); E.raceCollide(1/60);
  assert.equal(E.S.bumps,0); assert.equal(E.S.px,1.68);
});
test('solo race pause freezes simulation and releases held steering',()=>{
  const E=load(); E.start('race'); E.keys.l=true; E.touches.set(1,'L'); E.pauseGame();
  const z=E.S.pz,clock=E.S.clock; E.tick(2); assert.equal(E.state,'paused');assert.equal(E.S.pz,z);assert.equal(E.S.clock,clock);
  assert.equal(E.keys.l,false); assert.equal(E.touches.size,0); E.fire('keydown',{key:'p'}); assert.equal(E.state,'play');
});

test('race HUD keeps working after the last opponent leaves',()=>{
  const E=load(); E.startDuel({seed:'SOLO:1',level:0,friend:{name:'Pat',look:{}},send(){}});
  E.S.race.countT=0; E.S.race.bots.length=0;
  assert.doesNotThrow(()=>E.hud());
});
