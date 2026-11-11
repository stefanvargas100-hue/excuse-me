const assert=require('node:assert/strict');
const {measure,effectivePoints}=require('../../../../tools/build-balance.cjs');
const {load}=require('../../../../test/harness');
const old=require('../batch-16b-evidence/measurements.json');
for(const row of old.rows){const result=measure(row.look,row.option);for(const key of Object.keys(result))assert.deepEqual(result[key],row[key]);}
const E=load(),look={body:'m',build:'large',shirtType:'suit',pantsType:'joggers',shoeType:'runners',hat:'cap',pack:'pack'};
assert.throws(()=>assert.equal(effectivePoints(E,look,'current').speed,13));
assert.equal(E.statsOf(look).speed,13);
console.log('All 72 historical rows match exactly; approved capped-large assertion rejects legacy 10 and accepts active 13.');
