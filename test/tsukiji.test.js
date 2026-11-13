const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./harness');
test('Tokyo stages append and expose fair seeded events',()=>{
 const E=load(undefined,{seed:11});assert.equal(E.LEVELS[7]?.id,'tsukiji');assert.equal(E.LEVELS[8]?.id,'skytree');
 for(const [i,event] of [[7,'turret'],[8,'viewpoint']]){E.setLevel(i);E.start('race');E.S.people=[];E.runEvent(event);assert.ok(E.S.people.length);for(const p of E.S.people){assert.ok(p.z-E.S.pz>=66);assert.ok(p.rad< E.LV.half-1);}for(const z of [0,75,200,E.LV.goal-1]){E.S.pz=z;E.S.me.z=z;E.render();}}
});
test('market wet patches leave a dry route',()=>{const E=load(undefined,{seed:5});E.setLevel(7);E.start('classic');E.S.people=[];for(let z=80;z<180;z+=4)E.genChunk(z);const patches=E.S.people.filter(p=>p.wetPatch);assert.ok(patches.length);for(const p of patches){assert.ok(Math.abs(p.x)+p.width/2<E.LV.half);assert.equal(p.circles.length,0);}});

test('market patches reduce player steering and keep forward motion',()=>{const speeds=[];for(const wet of [false,true]){const E=load(undefined,{seed:9});E.setLevel(7);E.start('race');E.S.race.countT=0;E.S.race.bots=[];E.S.people=[];if(wet)E.S.people.push({x:0,z:0,wetPatch:true,width:2.4,depth:4,prop:'wetpatch',circles:[],rad:0});E.fire('keydown',{code:'ArrowRight',key:'ArrowRight'});for(let i=0;i<6;i++)E.tick(1/60);speeds.push(E.S.vx);assert.ok(E.S.pz>0);}assert.ok(speeds[1]<speeds[0]*.5);});

test('wet grip and residual slide are identical for player and bots',()=>{const path=require('node:path');const E=load(path.resolve('game/rounds/round-02/batch-21-evidence/wet-entry.js'),{seed:1});E.setLevel(7);E.start('race');E.S.people=[{x:0,z:10,width:2.4,depth:4,wetPatch:true}];const a={},b={};for(const [x,z]of [[0,10],[0,13],[0,14],[3,15]]){assert.equal(E.wetGrip(a,x,z,.1),E.wetGrip(b,x,z,.1));assert.equal(a.wetSlide,b.wetSlide);}assert.equal(E.wetGrip(a,3,16,.3),1);assert.equal(E.wetGrip({},3,10,.1),1);});

test('both Race courses finish for the player and rendering leaves seeded simulation unchanged',()=>{for(const level of [7,8]){const snap=draw=>{const E=load(undefined,{seed:13});E.setLevel(level);E.start('race');E.S.race.countT=0;E.S.race.bots=[];for(let i=0;i<120;i++){E.tick(1/60);if(draw)E.render();}return JSON.stringify(E.S.people.map(p=>[p.x,p.z]));};assert.equal(snap(true),snap(false));const E=load(undefined,{seed:4});E.setLevel(level);E.start('race');E.S.race.countT=0;E.S.race.bots=[];for(let i=0;i<15000&&!E.S.race.finished;i++){E.S.people=[];E.tick(1/60);}assert.ok(E.S.race.finished);}});
