const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness');
const {effectivePoints,measure,enumerate}=require('../tools/build-balance.cjs');
test('active stats use treatment A with body and fit inside cap',()=>{
 const E=load(), look={body:'m',build:'large',shirtType:'suit',pantsType:'joggers',shoeType:'runners',hat:'cap',pack:'pack'};
 assert.equal(E.statsOf(look).speed,13);
 assert.equal(E.statsOf({...look,build:'small'}).speed,7);
 assert.equal(E.statsOf({...look,build:'medium'}).speed,10);
});
test('every valid outfit preserves non-speed stats and strict build ordering',()=>{
 const E=load(), slots=Object.keys(E.ITEM_STATS);
 function visit(i,look){
  if(i<slots.length){for(const item of Object.keys(E.ITEM_STATS[slots[i]]))visit(i+1,{...look,[slots[i]]:item});return;}
  for(const body of ['m','f']){let prev=-Infinity;
   for(const build of ['small','medium','large']){
    const l={...look,body,build},actual={...E.statsOf(l)},a=effectivePoints(E,l,'A'),old=effectivePoints(E,l,'current');
    assert.deepEqual(actual,a);assert.equal(actual.accel,old.accel);assert.equal(actual.rec,old.rec);
    assert.ok(actual.speed>prev);prev=actual.speed;
    if(build==='medium'||a.speed===old.speed)assert.deepEqual(actual,old);
   }
  }
 }
 visit(0,{});
 const r=enumerate();
 assert.equal(r.results.A.largeEqualsMedium,0);
 assert.equal(r.results.A.smallEqualsMedium,0);
 assert.equal(r.results.A.smallEqualsLarge,0);
 assert.deepEqual(r.results.A.speedRange,{small:{min:-13,max:7},medium:{min:-10,max:10},large:{min:-7,max:13}});
 assert.equal(r.results.A.speedChanges.small.down,4814);
});
test('production ticks reproduce historical treatment A measurements for all 18 representative looks',()=>{
 const historical=require('../game/rounds/round-02/batch-16b-evidence/measurements.json');
 for(const row of historical.rows.filter(r=>r.option==='A')){
  const E=load();assert.deepEqual({...E.statsOf(row.look)},effectivePoints(E,row.look,'A'));
  const active=measure(row.look,'active');
  for(const key of Object.keys(active))assert.deepEqual(active[key],row[key],`${row.kit}/${row.look.body}/${row.look.build}/${key}`);
  if(row.kit==='speed'&&row.look.body==='m')assert.ok(Math.abs(active.target-({small:3.126,medium:3.180,large:3.234}[row.look.build]))<1e-12);
 }
});
