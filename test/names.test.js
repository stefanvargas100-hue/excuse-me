const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), esbuild = require('esbuild');
function load(file) { const code = esbuild.buildSync({entryPoints:[file],bundle:true,format:'cjs',write:false}).outputFiles[0].text; const m={exports:{}}; new Function('module','exports','require',code)(m,m.exports,require); return m.exports; }
const {cleanPlayerName} = load('src/online/names.js');
test('allowed names are trimmed, Unicode and spaces normalized', () => { for (const n of ['Ana','\u6771\u4eac\u306e\u4eba','Runner_12','Jean-Luc','abcdefghijklmnopqrstuvwx']) assert.equal(cleanPlayerName(n),n); assert.equal(cleanPlayerName('  Ana   Maria  '),'Ana Maria'); });
test('invalid names and simple offensive swaps are blocked', () => { for (const n of ['',null,42,'ab','a'.repeat(25),'Joe!','fuck','f0ck','sh1t','b1tch','@ssh0le','$hit']) assert.equal(cleanPlayerName(n),null,String(n)); });
test('every existing generated name passes', () => { const src=fs.readFileSync('src/online/board.js','utf8'); const adj=new Function('return '+src.match(/const ADJ = (.*);/)[1])(), noun=new Function('return '+src.match(/const NOUN = (.*);/)[1])(); for (const a of adj) for(const n of noun) for(const num of [10,99]) {const name=a+' '+n+' '+num; assert.equal(cleanPlayerName(name),name);} });

test('received room names use the shared fallback',()=>{const E=require('./harness.js').load();E.startDuel({seed:'names',level:0,friend:{name:'sh1t'},send:()=>{}});assert.equal(E.S.race.bots.find(b=>b.remote).name,'Friend');});
