// Summarize preserved raw paired native-bot results without dropping losses/timeouts.
const fs=require('fs'),assert=require('node:assert/strict');
const data=require('./bot-results.json'),rows=data.rows;
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const key=r=>JSON.stringify([r.level,r.seed,r.kit,r.rotation,r.normal,r.collisions]);
const groups=new Map();
for(const a of rows.filter(r=>r.treatment==='A')){
 const legacy=rows.find(r=>r.treatment==='legacy'&&key(r)===key(a));assert.ok(legacy);
 for(let i=0;i<a.bots.length;i++){
  const b=a.bots[i],old=legacy.bots[i];assert.deepEqual(b.look,old.look);assert.equal(b.pace,old.pace);assert.deepEqual(b.start,old.start);
  const id=[a.collisions?'forced':a.normal?'random':'controlled',a.level,a.kit,b.look.build].join('/');
  if(!groups.has(id))groups.set(id,{id,n:0,completeA:0,completeLegacy:0,timeoutsA:0,timeoutsLegacy:0,delta:[],timesA:[],timesLegacy:[],placesA:{},placesLegacy:{},bumpsA:[],bumpsLegacy:[],recoveryA:[],recoveryLegacy:[],burstsA:[],burstsLegacy:[],routeSecondsA:{},routeSecondsLegacy:{}});
  const g=groups.get(id);g.n++;
  if(b.done&&old.done)g.delta.push(b.finishTime-old.finishTime);
  for(const [v,suffix] of [[b,'A'],[old,'Legacy']]){
   g['complete'+suffix]+=+v.done;g['timeouts'+suffix]+=+v.timeout;
   if(v.done)g['times'+suffix].push(v.finishTime);
   g['places'+suffix][v.place]=(g['places'+suffix][v.place]||0)+1;
   g['bumps'+suffix].push(v.bumps);g['recovery'+suffix].push(v.bumpSeconds);g['bursts'+suffix].push(v.burstStarts);
   for(const [route,t]of Object.entries(v.routeSeconds))g['routeSeconds'+suffix][route]=(g['routeSeconds'+suffix][route]||0)+t;
  }
 }
}
const summary=[...groups.values()].map(g=>({...g,delta:{n:g.delta.length,mean:mean(g.delta),min:g.delta.length?Math.min(...g.delta):null,max:g.delta.length?Math.max(...g.delta):null,faster:g.delta.filter(x=>x<0).length,slower:g.delta.filter(x=>x>0).length,tied:g.delta.filter(x=>x===0).length},timesA:mean(g.timesA),timesLegacy:mean(g.timesLegacy),bumpsA:mean(g.bumpsA),bumpsLegacy:mean(g.bumpsLegacy),recoveryA:mean(g.recoveryA),recoveryLegacy:mean(g.recoveryLegacy),burstsA:mean(g.burstsA),burstsLegacy:mean(g.burstsLegacy)}));
fs.writeFileSync(__dirname+'/bot-summary.json',JSON.stringify({trials:rows.length,completion:rows.reduce((r,x)=>{r[x.endReason]=(r[x.endReason]||0)+1;return r;},{}),summary},null,2)+'\n');
console.log(JSON.stringify({trials:rows.length,completion:rows.reduce((r,x)=>{r[x.endReason]=(r[x.endReason]||0)+1;return r;},{}),controlled:summary.filter(g=>g.id.startsWith('controlled')).map(g=>({id:g.id,n:g.n,complete:g.completeA,legacy:g.completeLegacy,delta:g.delta.mean,faster:g.delta.faster,slower:g.delta.slower,bumpsA:g.bumpsA,bumpsLegacy:g.bumpsLegacy}))},null,2));
