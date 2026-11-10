const {load}=require('../test/harness');
// Discrete lane scoring uses only nearby visible actors and their collision circles.
function steer(s,lim,preferred){
 let best=Infinity,target=preferred;
 for(let x=-lim;x<=lim+.01;x+=.3){
  let cost=.08*Math.abs(x-preferred)+.16*Math.abs(x-s.px);
  for(const p of s.people){if(p.dead||(p.route||'')!==(s.route||''))continue;
   const dz=p.z-s.pz;if(dz<-.5||dz>16)continue;
   const t=Math.max(0,dz/Math.max(2,s.speed));
   for(const c of p.circles||[{ox:0,oz:0,r:.3}]){
    const ox=p.x+c.ox+(p.vx||0)*Math.min(t,1);
    const clearance=Math.abs(x-ox)-c.r-.38;
    cost+=Math.max(0,1-clearance)* (clearance<0?12:1) / (1+dz*.2);
   }
  }
  if(cost<best){best=cost;target=x;}
 }
 const error=target-s.px-s.vx*.14;
 return Math.abs(error)<.12?0:Math.sign(error);
}
function drive({level,seed,side,build,clean=false}){
 const E=load(undefined,{seed});E.setLevel(level);E.LOOK.build=build;E.start(false,'race');E.S.race.countT=0;E.S.race.bots=[];
 if(clean){E.S.people=[];E.S.nextChunk=1e9;E.S.fastT=E.S.rivalT=E.S.rushSpawn=E.S.eventT=E.S.rushT=1e9;}
 const entry=level===5?80:70,exit=level===5?300:260,entryX=level===5?3.3:2.6;
 let maxActors=0,ticks=0,lateral=0,entryT=null,rejoinT=null,entered=false,popMin=Infinity;
 while(E.state==='play'&&ticks<24000){
  maxActors=Math.max(maxActors,E.S.people.length);const S=E.S,approach=side&&!entered&&S.pz>entry-22&&S.pz<entry+6;
  // A visible marked entrance is a compulsory local waypoint, reached by held keys.
  const u=approach?(Math.abs(entryX-S.px-S.vx*.14)<.08?0:Math.sign(entryX-S.px-S.vx*.14)):steer(S,E.LV.half-.55,0);
  E.keys.l=u<0;E.keys.r=u>0;const x=S.px,z=S.pz;E.tick(1/60);ticks++;lateral+=Math.abs(S.px-x);
  if(z<entry&&S.pz>=entry)entryT=ticks/60;
  entered ||= !!S.route;
  if(z<exit&&S.pz>=exit)rejoinT=ticks/60;
  if(S.route&&S.pz>entry+35&&S.pz<exit-25)popMin=Math.min(popMin,S.people.filter(p=>p.route===S.route&&p.z>S.pz&&p.z<S.pz+35).length);
 }
 return {maxActors,level,seed,side,build,clean,seconds:ticks/60,segment:rejoinT===null?null:rejoinT-entryT,bumps:E.S.bumps,lateral,entered,completed:E.S.pz>=E.LV.goal,z:E.S.pz,popMin:Number.isFinite(popMin)?popMin:null};
}
module.exports={steer,drive};
if(require.main===module){const rows=[];for(const level of [5,6])for(const seed of [4,8,42])for(const build of ['small','large'])for(const clean of [false,true])for(const side of [false,true])rows.push(drive({level,seed,build,clean,side}));console.log(JSON.stringify({command:'node tools/route-review.cjs',rows},null,2));}
