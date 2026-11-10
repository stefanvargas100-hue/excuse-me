const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/sim/race.js','utf8');
function setup(remote,botRoute,humanRoute){
 const b={x:0,z:150,route:botRoute,pressT:0,pressX:0,thinkT:0,target:0,seed:0,speed:4,seen:new Map(),diff:{fight:1,miss:0}};
 const human={x:0,z:148,route:humanRoute,remote:true,peerId:'guest'};
 const S={px:remote?20:0,pz:remote?10:148,route:humanRoute,clock:0,people:[],race:{finished:false,bots:remote?[b,human]:[b],rng:()=>.5,me:true},duel:{cup:{}}};
 const context={S,Math,Map,Infinity,LAT_MAX:4,R_PLAYER:.25,LV:{id:'subway'},DRAFT_LEN:4,DRAFT_W:.6,
 sameRoute:(a,b)=>(a.route||'')===(b.route||''),halfAt:()=>4.5,contain:(_id,_x,tx)=>tx,routeAim:()=>null,onStrip:()=>false,beltAt:()=>0,clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};
 for(const name of ['cupPressure','think'])vm.runInNewContext(source.match(new RegExp('function '+name+'\\(b\\) \\{[\\s\\S]*?\\n\\}'))[0]+';this.'+name+'='+name,context);
 return {b,human,S,...context};
}
for(const remote of [false,true])for(const [botRoute,humanRoute,positive] of [['','',true],['mezzanine','mezzanine',true],['mezzanine','',false],['','mezzanine',false]]){
 test(`Cup pressure ${remote?'remote':'local'} bot=${botRoute} human=${humanRoute}`,()=>{
  const E=setup(remote,botRoute,humanRoute);E.cupPressure(E.b);assert.equal(E.b.pressT>0,positive);
 });
}
for(const remote of [false,true])for(const changes of ['bot','human','both'])test(`active ${remote?'remote':'local'} pressure clears on ${changes} floor change`,()=>{
 const E=setup(remote,'','');E.cupPressure(E.b);assert.ok(E.b.pressT>0);
 if(changes!=='human')E.b.route='mezzanine';
 if(changes!=='bot'){E.human.route='mezzanine';E.S.route='mezzanine';}
 // If both change floor, move the source away: the old pressure cannot carry over.
 if(changes==='both'){E.human.z=100;E.S.pz=100;}
 const control=setup(remote,E.b.route,remote?E.human.route:E.S.route);control.b.pressT=0;
 if(changes==='both'){control.human.z=100;control.S.pz=100;}
 E.think(E.b);control.think(control.b);assert.equal(E.b.target,control.b.target,'stale pressure cannot charge a lane cost before refresh');
 E.cupPressure(E.b);assert.equal(E.b.pressT,0);
});
test('same-floor active Cup pressure still changes the avoidance lane',()=>{
 const E=setup(false,'',''),control=setup(false,'','');E.cupPressure(E.b);E.think(E.b);control.think(control.b);assert.notEqual(E.b.target,control.b.target);
});

