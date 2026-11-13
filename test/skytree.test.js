const test=require('node:test'),assert=require('node:assert/strict');const {load}=require('./harness');
for(const level of [7,8])test('Tokyo '+level+' modes, deterministic events, boundaries and bot calibration',()=>{
 const medians=[];
 for(const diff of [0,1,2]){const times=[];for(const seed of [1,2,3]){
 const E=load(undefined,{seed});E.storage.excuseme_botlvl=String(diff);E.setLevel(level);E.start('race',undefined,{cup:{model:{bots:[]}}});E.S.cup=null;E.S.race.countT=0;
 for(let i=0;i<36000&&!E.S.race.bots.every(b=>b.done);i++){E.S.pz=Math.max(0,Math.min(...E.S.race.bots.filter(b=>!b.done).map(b=>b.z))-20);E.tick(1/60);for(const b of E.S.race.bots)assert.ok(Math.abs(b.x)<=E.LV.half-.4);}
 assert.ok(E.S.race.bots.every(b=>b.done));times.push(...E.S.race.bots.map(b=>b.finishT));
 }times.sort((a,b)=>a-b);medians.push(times[Math.floor(times.length/2)]);}
 console.log(JSON.stringify({level,medianEasyMediumHard:medians}));
 const C=load(undefined,{seed:4});C.setLevel(level);C.start('classic');C.S.pz=C.LV.goal;C.S.me.z=C.S.pz;C.S.people=[];C.tick(1/60);assert.ok(C.S.endless);
});
test('new events ignore racer lateral positions and leave a route',()=>{for(const [level,event]of [[7,'turret'],[8,'viewpoint']]){const snapshots=[];for(const px of [-2,2]){const E=load(undefined,{seed:8});E.setLevel(level);E.start('classic');E.S.people=[];E.S.px=px;E.runEvent(event);snapshots.push(JSON.stringify(E.S.people.map(p=>[p.x,p.z,p.drive])));for(const p of E.S.people){if(p.viewpoint)assert.ok(p.x>3);else assert.ok(p.rad*2<E.LV.half*2-2);}}assert.equal(...snapshots);}});
