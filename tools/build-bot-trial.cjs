// Native AI/controller and populated production race ticks. No prescribed lanes or crowd clearing.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {load}=require('../test/harness');
const {effectivePoints}=require('./build-balance.cjs');
const DT=1/30,builds=['small','medium','large'];
const kits={plain:{shirtType:'tee',pantsType:'jeans',shoeType:'sneakers',hat:'cap',pack:'pack'},speed:{shirtType:'suit',pantsType:'joggers',shoeType:'runners',hat:'cap',pack:'pack'}};
function runCase({treatment='A',level=1,seed=42,kit='speed',rotation=0,seconds=600,collisions=false,normal=false}={}){
 const E=load(undefined,{seed,date:new Date('2026-11-10T12:00:00Z')});E.storage.excuseme_botlvl='2';
 const look={...kits[kit],body:'m',build:builds[rotation]};Object.assign(E.LOOK,look);
 E.setLevel(level);E.start('race',undefined,{run:{seed:String(seed)}});
 const S=E.S,R=S.race;
 const points=l=>effectivePoints(E,l,treatment==='A'?'A':'current');
 const apply=l=>{const p=points(l);if(treatment==='A')assert.deepEqual(p,{...E.statsOf(l)});return {...E.effects(p)};};
 // Override cached effects only, using independently computed approved/legacy points.
 R.me=apply(look);
 const meta=R.bots.map((b,i)=>{
  const l=normal?Object.fromEntries(['body','build',...Object.keys(kits.plain)].map(k=>[k,b[k]])):{...kits[kit],body:'m',build:builds[(i+rotation)%3]};
  if(normal){if(b.face==='shades')l.hat='shades';assert.deepEqual({...b.st},{...E.effects(E.statsOf(l))},'reconstructed native random outfit matches original cache');}
  Object.assign(b,l);b.st=apply(l);
  return {slot:i,look:l,points:points(l),pace:b.pace,start:{x:b.x,z:b.z},burstStarts:0,burstSeconds:0,dashStarts:0,bumpSeconds:0,routeSeconds:{},previousBurst:false,previousDash:false};
 });
 let maxPeople=S.people.length,frames=0,crossRouteBumps=0,forced=0;
 const collisionChecks=[];
 for(let n=0;n<Math.ceil((seconds+3.3)/DT)&&E.state==='play';n++){
  const time=S.time;
  if(R.countT<=0&&collisions&&forced<3&&time>=4+forced*5){
   // Add contacts without removing normal pedestrians. Alternate a cross-floor probe then same-floor contacts.
   const cross=forced===0;
   for(const b of R.bots){const p=E.mkPerson(b.x,b.z+.02);Object.assign(p,{vx:0,vz:0,v0:0,rival:true,route:cross?'trial-other-floor':(b.route||'')});S.people.push(p);}
   collisionChecks.push({cross,before:R.bots.map(b=>b.bumps)});forced++;
  }
  E.tick(DT);if(R.countT>0)continue;frames++;maxPeople=Math.max(maxPeople,S.people.length);
  for(let i=0;i<R.bots.length;i++){
   const b=R.bots[i],m=meta[i];assert.ok([b.x,b.z,b.speed,b.energy,b.vx].every(Number.isFinite),'finite native bot');
   if(b.burstT>0&&!m.previousBurst)m.burstStarts++;
   if(b.dashT>0&&!m.previousDash)m.dashStarts++;
   m.previousBurst=b.burstT>0;m.previousDash=b.dashT>0;
   if(!b.done){if(b.burstT>0)m.burstSeconds+=DT;if(b.bumpT>0)m.bumpSeconds+=DT;m.routeSeconds[b.route||'main']=(m.routeSeconds[b.route||'main']||0)+DT;}
   // Unknown routes cannot arise in production AI; the injected cross-floor probes are pedestrians only.
   assert.ok(!b.route||(level===5&&b.route==='mezzanine')||(level===6&&b.route==='back-alley'),'route isolation: known course route');
  }
  if(collisionChecks.length){const c=collisionChecks.at(-1);if(!c.checked){c.after=R.bots.map(b=>b.bumps);c.checked=true;if(c.cross)crossRouteBumps+=c.after.reduce((a,v,i)=>a+Math.max(0,v-c.before[i]),0);}}
  if((R.bots.every(b=>b.done)&&!collisions)||S.time>=seconds)break;
 }
 const ranked=[...R.bots].sort((a,b)=>Number(b.done)-Number(a.done)||(a.done&&b.done?a.finishT-b.finishT:b.z-a.z));
 return JSON.parse(JSON.stringify({treatment,level,seed,kit,rotation,normal,collisions,seconds,dt:DT,elapsed:S.time,frames,maxPeople,treatmentVerified:true,crossRouteBumps,collisionChecks,
  endReason:R.bots.every(b=>b.done)?'all-bots-finished':E.state!=='play'?'player-finished-field-censored':'time-limit',
  player:{look,points:points(look),effects:{...R.me},z:S.pz,bumps:S.bumps,finished:R.finished,policy:'idle physical player; no steering or actions'},
  bots:R.bots.map((b,i)=>{const {previousBurst,previousDash,...m}=meta[i];return {...m,z:b.z,speed:b.speed,done:b.done,timeout:!b.done,finishTime:b.finishT,place:ranked.indexOf(b)+1,bumps:b.bumps,calls:b.calls||0,routes:{...b.routes},sideChoices:{...b.sideChoices}};})}));
}
module.exports={runCase};
if(require.main===module){
 const rows=[];
 for(const level of [1,5,6])for(const seed of [1,4,8,42,73])for(const kit of ['plain','speed'])for(const rotation of [0,1,2])for(const treatment of ['legacy','A'])rows.push(runCase({level,seed,kit,rotation,treatment}));
 for(const level of [1,5,6])for(const seed of [1,4,8,42,73])for(const treatment of ['legacy','A'])rows.push(runCase({level,seed,treatment,normal:true}));
 for(const level of [1,5,6])for(const treatment of ['legacy','A'])rows.push(runCase({level,seed:42,treatment,collisions:true,seconds:20}));
 for(const level of [1,5,6]){const r=rows.find(r=>r.level===level&&r.seed===42&&r.kit==='speed'&&r.rotation===0&&r.treatment==='A'&&!r.normal&&!r.collisions);assert.deepEqual(runCase({level,seed:42}),r);}
 fs.writeFileSync('game/rounds/round-02/batch-17a-evidence/bot-results.json',JSON.stringify({command:'node tools/build-bot-trial.cjs',dt:DT,seeds:[1,4,8,42,73],determinism:'one complete A speed race per course repeated exactly',rows},null,2)+'\n');
 console.log('Saved '+rows.length+' native populated race trials; three full-race determinism repeats matched exactly.');
}
