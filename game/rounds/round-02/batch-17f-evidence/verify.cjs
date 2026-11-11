const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict'),vm=require('node:vm'),esbuild=require('esbuild');
const root=process.cwd(),here=__dirname;
const git=(...args)=>cp.execFileSync('git',args,{encoding:'utf8'});
assert.equal(git('show','61b9edb:src/config/stats.js'),fs.readFileSync('src/config/stats.js','utf8').replaceAll('\r\n','\n'));
assert.equal(git('show','ac1c301:src/sim/people.js'),fs.readFileSync('src/sim/people.js','utf8').replaceAll('\r\n','\n'));
function challenge(text){const c={};vm.runInNewContext(esbuild.buildSync({stdin:{contents:text,resolveDir:path.join(root,'src/config')},bundle:true,format:'iife',globalName:'C',write:false}).outputFiles[0].text,c);return week=>JSON.parse(JSON.stringify(c.C.challengeFor(week)));}
const old=challenge(git('show','99283c2:src/config/challenge.js')),now=challenge(fs.readFileSync('src/config/challenge.js','utf8'));
const weeks=[...new Set([...require('../batch-17d-evidence/challenge-r1-fixtures.json').map(r=>r.week),...Array.from({length:52},(_,i)=>'2026-W'+String(i+1).padStart(2,'0'))])];
for(const week of weeks)assert.deepEqual({...now(week),rules:1},old(week));
for(const row of require('../batch-17d-evidence/challenge-r1-fixtures.json'))assert.deepEqual(row,old(row.week));
console.log('Exact reviewed stats/people blobs; '+weeks.length+' Challenge weeks match pre-change production, and all saved fixtures independently verified.');
// Existing actual-caller negative tests must detect removing only the new protocol guard.
const isolated=path.join(here,'mutation');fs.mkdirSync(isolated,{recursive:true});
try{
 fs.cpSync('src',path.join(isolated,'src'),{recursive:true});fs.mkdirSync(path.join(isolated,'test'));
 for(const name of ['harness.js','cap-wire-compatibility.test.js'])fs.copyFileSync(path.join(root,'test',name),path.join(isolated,'test',name));
 const file=path.join(isolated,'src/online/duel.js'),text=fs.readFileSync(file,'utf8'),guard="  if (!['hello', 'roster', 'full'].includes(ev) && (data.proto !== PROTO || !from || !roster.some(p => p.id === from))) return;";
 assert.ok(text.includes(guard));fs.writeFileSync(file,text.replace(guard,''));
 const r=cp.spawnSync(process.execPath,['--test','--test-name-pattern=actual room sender/receiver',path.join(isolated,'test/cap-wire-compatibility.test.js')],{encoding:'utf8'});
 fs.writeFileSync(path.join(here,'sensitivity-red.log'),(r.stdout+r.stderr).replace(/[ \t]+$/gm,''));assert.notEqual(r.status,0);assert.match(r.stdout,/AssertionError|ERR_ASSERTION/);console.log('Protocol guard mutation rejected by actual room storage assertion; failure preserved.');
}finally{fs.rmSync(isolated,{recursive:true,force:true});}
const helper=fs.readFileSync('tools/cap-compatibility-check.mjs','utf8').replace("const evidence='game/rounds/round-02/batch-17d-evidence'","const evidence='game/rounds/round-02/batch-17f-evidence'");
fs.writeFileSync(path.join(here,'browser-check.mjs'),helper);
