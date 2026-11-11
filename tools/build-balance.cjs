// Isolated mechanics on empty Classic ground. Actual tick/action; no race-controller claims.
const {load}=require('../test/harness');
const DT=1/60, SEED=42;
const gear={plain:{shirtType:'tee',pantsType:'jeans',shoeType:'sneakers',hat:'cap',pack:'pack'},speed:{shirtType:'suit',pantsType:'joggers',shoeType:'runners',hat:'cap',pack:'pack'},responsive:{shirtType:'tank',pantsType:'shorts',shoeType:'slides',hat:'cap',pack:'pack'}};
function measure(look, candidate=false){
 const E=load(undefined,{seed:SEED}); Object.assign(E.LOOK,gear.plain,look); E.setLevel(0); E.start('classic');
 const option=candidate===true?'candidate':candidate||'current';
 const S=E.S, points=effectivePoints(E,E.LOOK,option);
 const st={...E.effects(points)}; S.moveStats=st;
 function reset(){Object.assign(S,{speed:0,pz:0,px:0,vx:0,energy:100,chain:0,bumpT:0,burstT:0,dashT:0,draftT:0,nearT:0,puT:0,perfectT:0,streakT:0,timeLeft:1e6,pickupNext:1e9});E.keys.r=E.keys.l=false;}
 function step(){S.people=[];S.pickups=[];S.nextChunk=1e9;S.fastT=S.rivalT=S.rushSpawn=S.eventT=S.rushT=1e9;E.tick(DT);if(E.state!=='play')throw Error('simulation ended');}
 reset(); const target=3*st.speed; let firstSpeed,t90=null,t99=null,shortDistance,longDistance;
 for(let i=1;i<=3600;i++){step();if(i===1)firstSpeed=S.speed;if(t90===null&&S.speed>=.9*target)t90=i*DT;if(t99===null&&S.speed>=.99*target)t99=i*DT;if(i===120)shortDistance=S.pz;}
 longDistance=S.pz;const actual=S.speed;
 // Apply the post-collision timer, cancelling boosts/chain as collision code does; no contact geometry tested.
 reset();S.speed=target;S.bumpT=st.bumpT;let recover=null,recoverDistance=null,minSpeed=target;
 for(let i=1;i<=600;i++){step();minSpeed=Math.min(minSpeed,S.speed);if(S.bumpT<=0&&S.speed>=.95*target){recover=i*DT;recoverDistance=S.pz;break;}}
 reset();E.keys.r=true;let steer90=null;for(let i=1;i<=60;i++){step();if(S.vx>=2.4*.9){steer90=i*DT;break;}}
 reset();S.energy=0;let refill=null;for(let i=1;i<=1800;i++){step();if(S.energy>=100){refill=i*DT;break;}}
 reset();let burstTicks=0,bursts=0,minEnergy=100;
 // Conservative identical policy: spend only at >=70, so no low-energy pace penalty.
 for(let i=0;i<7200;i++){if(S.burstT<=0&&S.energy>=70){E.action('M');bursts++;}step();if(S.burstT>0)burstTicks++;minEnergy=Math.min(minEnergy,S.energy);}
 return {look:{...gear.plain,...look},points,st,target,actual,firstSpeed,t90,t99,secondsAbove99:60-t99,shortDistance,longDistance,bump95Seconds:recover,bump95Distance:recoverDistance,minBumpSpeed:minSpeed,steer90,refill,burstDuty:burstTicks/7200,bursts,burstMeanSpeed:S.pz/120,minEnergy};
}
const clamp=(n,cap)=>Math.max(-cap,Math.min(cap,n));
function rawPoints(E,look){
 const nonBuild={...E.BODIES[look.body||'m']};
 for(const slot in E.ITEM_STATS){const it=E.ITEM_STATS[slot][look[slot]];if(it)for(const k in nonBuild)nonBuild[k]+=it[k];}
 const fit=E.fitOf(look).boost;for(const k in nonBuild)nonBuild[k]+=fit;
 return nonBuild;
}
function fromRaw(E,look,option,nonBuild){
 const b=option==='candidate'&&look.build==='large'?{speed:4,accel:-3,rec:-1}:E.BUILDS[look.build||'medium'];
 const out={};for(const k in nonBuild)out[k]=clamp(nonBuild[k]+b[k],10);
 if(option==='A')out.speed=clamp(nonBuild.speed,10)+b.speed;
 if(option==='B')out.speed=clamp(nonBuild.speed+b.speed,13);
 return out;
}
// 'current' preserves the historical pre-trial analytical baseline.
// 'active' uses production stats; A remains the independent treatment reference.
function effectivePoints(E,look,option='current'){if(option==='active')return {...E.statsOf(look)};return fromRaw(E,look,option,rawPoints(E,look));}
function enumerate(){
 const E=load(), options=['current','candidate','A','B'], builds=['small','medium','large'];
 const results=Object.fromEntries(options.map(o=>[o,{loadoutsPerBuild:0,capApplied:0,atSpeedBoundary:0,largeEqualsMedium:0,largeEqualsMediumWithAccelCost:0,smallEqualsMedium:0,smallEqualsLarge:0,speedChanges:Object.fromEntries(builds.map(b=>[b,{up:0,down:0,same:0}])),speedRange:Object.fromEntries(builds.map(b=>[b,{min:Infinity,max:-Infinity}]))}]));
 let checks=0;
 function visit(look){
  const nonBuild=rawPoints(E,look);
  for(const option of options){
   const r=results[option];r.loadoutsPerBuild++;
   const pts=builds.map(build=>fromRaw(E,{...look,build},option,nonBuild));
   for(let i=0;i<3;i++){
    const build=builds[i],st=pts[i], b=option==='candidate'&&build==='large'?{speed:4}:E.BUILDS[build];
    const baseSpeed=clamp(nonBuild.speed+E.BUILDS[build].speed,10);r.speedChanges[build][st.speed>baseSpeed?'up':st.speed<baseSpeed?'down':'same']++;
    const limit=option==='B'?13:10;
    const input=nonBuild.speed+(option==='A'?0:b.speed);
    if(Math.abs(input)>limit)r.capApplied++;
    if(Math.abs(input)>=limit)r.atSpeedBoundary++;
    r.speedRange[build].min=Math.min(r.speedRange[build].min,st.speed);r.speedRange[build].max=Math.max(r.speedRange[build].max,st.speed);
    if(option==='A'){
     const current=E.statsOf({...look,build});
     for(const k in current)if(current[k]!==st[k])throw Error('analytical stats mismatch');
     checks++;
    }
   }
   if(pts[2].speed===pts[1].speed){r.largeEqualsMedium++;if(pts[2].accel<pts[1].accel)r.largeEqualsMediumWithAccelCost++;}
   if(pts[0].speed===pts[1].speed)r.smallEqualsMedium++;
   if(pts[0].speed===pts[2].speed)r.smallEqualsLarge++;
  }
 }
 const slots=Object.keys(E.ITEM_STATS);
 function walk(i,look){if(i===slots.length){for(const body of ['m','f'])visit({...look,body});return;}const slot=slots[i];for(const item of Object.keys(E.ITEM_STATS[slot]))walk(i+1,{...look,[slot]:item});}
 walk(0,{});return {definition:'All current ITEM_STATS slot combinations x two bodies; cap counts across three builds; pair counts per same-gear/body tuple; not usage frequencies',analyticalChecks:checks,results};
}
module.exports={measure,effectivePoints,enumerate};
if(require.main===module){const rows=[];for(const option of ['current','candidate','A','B','active'])for(const body of ['m','f'])for(const [kit,items]of Object.entries(gear))for(const build of ['small','medium','large'])rows.push({option,kit,...measure({...items,body,build},option)});console.log(JSON.stringify({command:'node tools/build-balance.cjs',seed:SEED,dt:DT,rows,enumeration:enumerate()},null,2));}
