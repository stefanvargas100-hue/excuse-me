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
