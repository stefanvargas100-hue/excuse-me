// Medal calibration for the three batch-23 Airport stages, the same method as batch-21-evidence/calibrate.js:
// ordinary Race (3 racers), seeds 1-3, 60 Hz, following the rear bot so the whole course stays active; median of the nine finishes
// per difficulty (Easy, Medium, Hard) becomes Bronze, Silver and Gold, rounded up.
const {load}=require('../../../../test/harness');
const path=require('path'),fs=require('fs');
const ENTRY=path.join(__dirname,'lane-entry.js');
const out={hz:60,seeds:[1,2,3],racersPerRace:3};
for(const [level,id] of [[9,'security'],[10,'baggage'],[11,'gatechange']]){
 const medians=[];
 for(const diff of [0,1,2]){
  const times=[];
  for(const seed of [1,2,3]){
   const E=load(ENTRY,{seed});E.storage.excuseme_botlvl=String(diff);E.setLevel(level);E.start('race');E.S.race.countT=0;
   for(let i=0;i<36000&&!E.S.race.bots.every(b=>b.done);i++){E.S.pz=Math.max(0,Math.min(...E.S.race.bots.filter(b=>!b.done).map(b=>b.z))-20);E.tick(1/60);}
   if(!E.S.race.bots.every(b=>b.done))throw Error('unfinished '+id);
   times.push(...E.S.race.bots.map(b=>b.finishT));
  }
  times.sort((a,b)=>a-b);medians.push(times[4]);
 }
 out[id]=medians;console.log(id,medians,medians.map(Math.ceil));
}
fs.writeFileSync(path.join(__dirname,'ordinary-medians.json'),JSON.stringify(out,null,2));
