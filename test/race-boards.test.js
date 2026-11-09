const test=require('node:test'), assert=require('node:assert/strict'), esbuild=require('esbuild');
const out=esbuild.buildSync({entryPoints:['src/online/boards.js'],bundle:true,format:'cjs',write:false}).outputFiles[0].text;const m={exports:{}};new Function('module','exports','require',out)(m,m.exports,require);const b=m.exports;
test('each stage has its own race board',()=>{const src=require('fs').readFileSync('src/config/levels.js','utf8'), ids=[...src.matchAll(/\{ id: '([^']+)'/g)].map(x=>x[1]); ids.forEach((id,i)=>assert.equal(b.boardIdFor('race',i),'race:'+id));});
test('faster times score higher and display hundredths',()=>{assert.ok(b.encodeRaceTime(60000)>b.encodeRaceTime(61000)); assert.equal(b.fmtRaceScore(b.encodeRaceTime(61230)),'1:01.23');});
test('unapplied migration leaves race coming soon',()=>assert.equal(b.raceBoardNotice(),'Race boards coming soon.'));
