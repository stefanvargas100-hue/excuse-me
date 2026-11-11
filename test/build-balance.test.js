const test = require('node:test');
const assert = require('node:assert/strict');
const {measure} = require('../tools/build-balance.cjs');
const plain = {build:'medium',body:'m'};
test('real ticks match known neutral-acceleration and speed constants',()=>{
 const r=measure(plain);
 assert.ok(Math.abs(r.firstSpeed - 3*1.012*3.5/60)<1e-10);
 assert.equal(r.t90, Math.ceil(Math.log(.1)/Math.log(1-3.5/60))/60);
 assert.ok(Math.abs(r.actual-r.target)<1e-8);
 assert.ok(Math.abs(r.refill-100/(9*.92))<=1/60);
});
test('fixed seed reproduces all reported measurements',()=>{
 assert.deepEqual(measure(plain),measure(plain));
});
const {effectivePoints} = require('../tools/build-balance.cjs');
const {load} = require('./harness');
test('cap treatments preserve uncapped stats and handle body/fit once',()=>{
 const E=load();
 const bare={body:'m',build:'large',shirtType:'tee',pantsType:'jeans',shoeType:'sneakers',hat:'cap',pack:'pack'};
 for(const mode of ['A','B'])assert.deepEqual(effectivePoints(E,bare,mode),{...E.statsOf(bare)});
 const capped={...bare,shirtType:'suit',pantsType:'joggers',shoeType:'runners'};
 assert.deepEqual(effectivePoints(E,capped,'A'),{speed:13,accel:-5,rec:-3});
 assert.deepEqual(effectivePoints(E,capped,'B'),{speed:13,accel:-5,rec:-3});
 // Here the non-build sum is 13: A clamps that before adding build; B clamps total.
 const extreme={...capped,hat:'fedora'};
 assert.equal(effectivePoints(E,extreme,'A').speed,13);
 assert.equal(effectivePoints(E,{...extreme,build:'small'},'A').speed,7);
 assert.equal(effectivePoints(E,{...extreme,build:'small'},'B').speed,10);
});
