const test = require('node:test'), assert = require('node:assert/strict');
const { load } = require('./harness');
const esbuild = require('esbuild'), vm = require('node:vm');
const context = {}; vm.createContext(context);
vm.runInContext(esbuild.buildSync({entryPoints:['src/config/medals.js'],bundle:true,format:'iife',globalName:'medals',write:false}).outputFiles[0].text, context);
const {MEDAL_TIMES,medalFor,nextMedal}=context.medals;
for (const id of ['airport','nyc','shibuya','park','bridge']) {
 test(id+' targets cover every stage in strict order',()=>{
  const t=MEDAL_TIMES[id]; assert.ok(t); assert.ok(t.gold<t.silver && t.silver<t.bronze);
 });
 for(const [medal,slower] of [['gold','silver'],['silver','bronze'],['bronze',null]]) {
  test(id+' '+medal+' inclusive boundary',()=>{assert.equal(medalFor(id,MEDAL_TIMES[id]?.[medal]),medal);});
  test(id+' just slower than '+medal,()=>{assert.equal(medalFor(id,(MEDAL_TIMES[id]?.[medal]||0)+0.001),slower);});
 }
 test(id+' next targets',()=>{
  const t=MEDAL_TIMES[id]||{};
  assert.equal(nextMedal(id,0)?.medal,'bronze');
  for(const [earned,next] of [['bronze','silver'],['silver','gold']]) assert.equal(JSON.stringify(nextMedal(id,t[earned])),JSON.stringify({medal:next,seconds:t[next]}));
  assert.equal(nextMedal(id,t.gold),null);
 });
}
test('invalid and absent times earn nothing',()=>{for(const seconds of [0,-1,NaN,Infinity,undefined]) assert.equal(medalFor('airport',seconds),null);assert.equal(medalFor('unknown',1),null);assert.equal(nextMedal('unknown',1),null);});
const finish=(E,time=1)=>{E.S.race.countT=0; E.S.time=time; E.S.pz=E.LV.goal+1; for(let i=0;i<90;i++)E.tick(1/30);};
test('ordinary bot race shows medal and target regardless of place and difficulty',()=>{
 for(const diff of [0,1,2]) {const E=load(undefined,{dom:true});E.storage.excuseme_botlvl=String(diff);E.start('race');E.S.race.bots[0].done=true;E.S.race.bots[0].finishT=0.5;finish(E);assert.match(E.element('sScore').textContent,/Gold/);}
});
test('ordinary slow race shows next target',()=>{const E=load(undefined,{dom:true});E.start('race');finish(E,999);assert.match(E.element('endLead').textContent,/Bronze \d+:\d/);assert.equal(E.element('endLead').hidden,false); });
for(const kind of ['cup','friend','practice','elimination']) test(kind+' shows no medals after ordinary race',()=>{
 const E=load(undefined,{dom:true});E.start('race');finish(E);assert.match(E.element('sScore').textContent,/Gold/);
 if(kind==='cup')E.startCup();else E.start('race',undefined,kind==='practice'?{run:{category:'practice'}}:kind==='elimination'?{run:{category:'elimination'},elim:true}:undefined);
 if(kind==='friend')E.startDuel({seed:'MEDALS:1',level:0,friend:{name:'Pat',look:{}},send(){}});
 finish(E); assert.doesNotMatch(E.element('sScore').textContent+E.element('sBest').textContent+E.element('endLead').textContent,/Gold|Silver|Bronze/);
});
