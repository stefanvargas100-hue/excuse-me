const fs=require('fs');
const assert=require('node:assert/strict');
const {measure,enumerate}=require('../../../../tools/build-balance.cjs');
const old=require('../batch-16b-evidence/measurements.json');
const rows=old.rows.filter(r=>r.option==='A').map(r=>({kit:r.kit,...measure(r.look,'active')}));
for(let i=0;i<rows.length;i++)for(const k of Object.keys(rows[i]))assert.deepEqual(rows[i][k],old.rows.filter(r=>r.option==='A')[i][k]);
for(const r of old.rows){
 const result=measure(r.look,r.option);
 for(const k of Object.keys(result))assert.deepEqual(result[k],r[k]);
}
const repeated=old.rows.filter(r=>r.option==='A').map(r=>({kit:r.kit,...measure(r.look,'active')}));
assert.deepEqual(rows,repeated);
fs.writeFileSync(__dirname+'/measurements.json',JSON.stringify({source:'Active production stats; compared exactly with historical A rows (historical files unchanged)',seed:42,dt:1/60,isolated:true,rows,enumeration:enumerate()},null,2)+'\n');
console.log('18 active rows match historical A and repeat exactly; all 72 historical analytical tick rows preserved; exhaustive enumeration complete');
