const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {load}=require('./harness');
test('adding Brooklyn Bridge preserves the published daily and weekly course until next reset',()=>{
 const E=load(path.join(__dirname,'entries/rotation-entry.js'));
 assert.equal(E.dailyLevel('2026-11-07'),2);assert.equal(E.weeklyLevel('2026-W45'),3);
 // Future periods can choose any of the five stages using the game's stable hash.
 const seen=new Set();for(let d=10;d<30;d++)seen.add(E.dailyLevel('2026-11-'+d));assert.ok(seen.has(4));
});
test('adding Subway Platform leaves every daily and weekly stage as published',()=>{
 const E=load(path.join(__dirname,'entries/rotation-entry.js'));
 const daily=[['2026-11-07',2],['2026-11-08',3],['2026-11-09',1],['2026-11-10',2],['2026-11-15',0],['2026-12-01',3],['2027-01-01',1],['2027-03-14',1],['2028-02-29',2]];
 const weekly=[['2026-W44',2],['2026-W45',3],['2026-W46',1],['2026-W47',4],['2026-W52',0],['2027-W01',2],['2027-W20',4],['2028-W10',4]];
 for(const [k,v]of daily)assert.equal(E.dailyLevel(k),v,k);for(const [k,v]of weekly)assert.equal(E.weeklyLevel(k),v,k);
 for(let d=1;d<=28;d++)for(const m of ['2026-11','2026-12','2027-05','2027-09'])assert.ok(E.dailyLevel(m+'-'+String(d).padStart(2,'0'))<5);
 for(let w=1;w<=52;w++)assert.ok(E.weeklyLevel('2027-W'+String(w).padStart(2,'0'))<5);
});
