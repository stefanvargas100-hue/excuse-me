const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {load}=require('./harness');
test('adding Brooklyn Bridge preserves the published daily and weekly course until next reset',()=>{
 const E=load(path.join(__dirname,'entries/rotation-entry.js'));
 assert.equal(E.dailyLevel('2026-11-07'),2);assert.equal(E.weeklyLevel('2026-W45'),3);
 // Future periods can choose any of the five stages using the game's stable hash.
 const seen=new Set();for(let d=10;d<30;d++)seen.add(E.dailyLevel('2026-11-'+d));assert.ok(seen.has(4));
});
