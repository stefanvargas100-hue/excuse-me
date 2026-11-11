// Isolated mechanics on empty Classic ground. Actual tick/action; no race-controller claims.
const {load}=require('../test/harness');
const DT=1/60, SEED=42;
const gear={plain:{shirtType:'tee',pantsType:'jeans',shoeType:'sneakers',hat:'cap',pack:'pack'},speed:{shirtType:'suit',pantsType:'joggers',shoeType:'runners',hat:'cap',pack:'pack'},responsive:{shirtType:'tank',pantsType:'shorts',shoeType:'slides',hat:'cap',pack:'pack'}};
function measure(look, candidate=false){
 const E=load(undefined,{seed:SEED}); Object.assign(E.LOOK,gear.plain,look); E.setLevel(0); E.start('classic');
 if(candidate)Object.assign(E.BUILDS.large,{speed:4,accel:-3,rec:-1});
 const S=E.S, points={...E.statsOf(E.LOOK)};
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
module.exports={measure};
if(require.main===module){const rows=[];for(const candidate of [false,true])for(const body of ['m','f'])for(const [kit,items]of Object.entries(gear))for(const build of ['small','medium','large'])rows.push({candidate,kit,...measure({...items,body,build},candidate)});console.log(JSON.stringify({command:'node tools/build-balance.cjs',seed:SEED,dt:DT,rows},null,2));}


