// Offline fixed-seed drives. Lane is prescribed, not a human input/playtest.
const {load}=require('../test/harness');
const rows=[];
for(const level of [5,6])for(const seed of [4,8,42])for(const side of [false,true]){
 const E=load(undefined,{seed});E.setLevel(level);E.start(false,'race');E.S.race.countT=0;E.S.race.bots=[];
 const entry=level===5?80:70,exit=level===5?300:260,entryX=level===5?3.3:2.6;
 // Same gear, no burst/dash/shout. Identical centre-lane prescription except entry choice.
 let ticks=0;while(E.S.pz<exit+20&&ticks<30000){E.S.px=side&&E.S.pz>entry-8&&E.S.pz<entry+8?entryX:0;E.S.vx=0;E.tick(1/60);ticks++;}
 rows.push({level,seed,side,seconds:ticks/60,z:E.S.pz,bumps:E.S.bumps,gear:JSON.stringify(E.LOOK)});
}
console.log(JSON.stringify({command:'node tools/route-measurement.cjs',limitations:'Prescribed x each frame; no lateral travel cost, no human steering, dynamic crowd active, no bots. Compare trends only; cannot certify fairness.',rows},null,2));
