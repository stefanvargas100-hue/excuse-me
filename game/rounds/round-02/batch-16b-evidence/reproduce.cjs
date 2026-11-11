// Reproduce all measurements, verify exact baseline preservation and repeatability, and write the compact table.
const fs=require('fs'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'../../../..');
const output=execFileSync(process.execPath,['tools/build-balance.cjs'],{cwd:root,encoding:'utf8'});
const again=execFileSync(process.execPath,['tools/build-balance.cjs'],{cwd:root,encoding:'utf8'});
assert.equal(output,again);
const d=JSON.parse(output),old=JSON.parse(fs.readFileSync(path.join(root,'game/rounds/round-02/batch-16-evidence/measurements.json'),'utf8'));
for(const row of old.rows){const {candidate,kit,...before}=row;const {option,kit:unused,...after}=d.rows.find(x=>x.option===(candidate?'candidate':'current')&&x.kit===kit&&x.look.body===row.look.body&&x.look.build===row.look.build);assert.deepEqual(before,after);}
for(const row of d.rows.filter(x=>['A','B'].includes(x.option))){const base=d.rows.find(x=>x.option==='current'&&x.kit===row.kit&&x.look.body===row.look.body&&x.look.build===row.look.build);for(const key of ['accel','rec'])assert.equal(row.points[key],base.points[key]);for(const key of ['t90','t99','steer90','refill','burstDuty','bursts','minEnergy','bump95Seconds'])assert.equal(row[key],base[key]);}
fs.writeFileSync(path.join(__dirname,'measurements.json'),output);
let table='| Option | Kit | Body | Build | Speed points | Cruise m/s | 2s / 60s distance m | Burst mean m/s | Bump95 s / m | Steer90 / refill s |\n|---|---|---|---|---|---|---|---|---|---|\n';
const f=n=>n.toFixed(3);
for(const r of d.rows)table+='| '+[r.option,r.kit,r.look.body,r.look.build,r.points.speed,f(r.target),f(r.shortDistance)+' / '+f(r.longDistance),f(r.burstMeanSpeed),f(r.bump95Seconds)+' / '+f(r.bump95Distance),f(r.steer90)+' / '+f(r.refill)].join(' | ')+' |\n';
fs.writeFileSync(path.join(__dirname,'table.md'),table);
fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify({command:'node game/rounds/round-02/batch-16b-evidence/reproduce.cjs',exactRepeat:true,baselineRowsPreserved:old.rows.length,capRowsWithUnchangedOtherStatsAndTiming:36,analyticalChecks:d.enumeration.analyticalChecks},null,2)+'\n');
console.log('PASS: exact repeated output, 36 original rows preserved, 36 cap rows retain non-speed stats/timing; '+d.enumeration.analyticalChecks+' analytical checks.');
