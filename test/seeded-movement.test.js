const test=require('node:test'), assert=require('node:assert/strict');
const {load}=require('./harness');
for(const mode of ['daily','weekly']) for(const build of ['small','medium','large']) for(const body of ['m','f']) test(`${mode} ${build} ${body} matches Classic movement`,()=>{
 const sample=kind=>{const e=load();Object.assign(e.LOOK,{build,body,shirtType:"wind",pantsType:"track",shoeType:"runners"});e.start(kind,undefined,{mod:'tired'});e.S.people=[];e.S.nextChunk=1e9;e.S.energy=30;e.S.chain=12;e.S.perfectT=1;e.S.streakT=1;e.S.nearT=1;e.S.nearAmt=.1;e.keys.r=true;e.tick(.01);return [e.S.speed,e.S.vx,e.S.energy];};
 assert.deepEqual(sample(mode),sample('classic'));
});
for(const mode of ['daily','weekly']) test(`${mode} isolated score, frozen identity, pickups and reset`,()=>{
 const e=load();e.start(mode);const period=e.S.dailyKey;assert.ok(e.S.moveStats);assert.ok(e.S.pickups.length);assert.equal(e.S.race,null);assert.equal(e.S.ghost,null);
 e.S.people=[];e.S.nextChunk=1e9;e.S.pz=10000;e.tick(.01);assert.ok(e.S.pickups.length<10);assert.ok(e.S.pickups.some(p=>p.z>10000));
 e.S.pickups=[{x:0,z:5,type:'boost',taken:false}];e.collectPowerups(e.S,2,10,0,true,-2);assert.ok(e.powerMul(e.S)>1);
 e.storage['excuseme_'+mode+'_'+period]='9999';e.S.dailyKey='future';e.S.score=123;e.quitRun();assert.equal(e.storage['excuseme_'+mode+'_'+period+':mp2'],'123');assert.equal(e.storage['excuseme_'+mode+'_'+period],'9999');assert.equal(e.storage['excuseme_played_'+mode],period);
 e.start('classic');assert.equal(e.S.competition,null);assert.equal(e.powerMul(e.S),1);
});
for(const mode of ['daily','weekly']) test(`${mode} refill, clear, fatal contact, expiry and frozen loadout`,()=>{
 const e=load();e.start(mode);const stats=JSON.stringify(e.S.moveStats);Object.assign(e.LOOK,{build:'large',body:'f',shoeType:'heels'});e.S.energy=2;e.S.pickups=[{x:0,z:0,type:'refill'}];e.collectPowerups(e.S,0,0,0,true);assert.equal(e.S.energy,100);
 e.S.pickups=[{x:0,z:0,type:'clear'}];e.collectPowerups(e.S,0,0,0,true);assert.ok(e.S.ghostT>0);e.S.people=[e.mkPerson(0,.1)];e.tick(.01);assert.equal(e.state,'play');assert.equal(JSON.stringify(e.S.moveStats),stats);
 e.S.ghostT=0;e.S.people=[e.mkPerson(0,e.S.pz+.1)];e.tick(.01);assert.equal(e.state,'over');const xp=e.xp();e.quitRun();assert.equal(e.xp(),xp);
});
for(const mode of ['daily','weekly']) for(const stage of [0,1,2,3,4]) for(const mod of [null,'tired','rush','phones']) test(mode+' stage '+stage+' '+mod+' direct pickup RNG isolation',()=>{
 const sample=extend=>{const e=load(undefined,{seeded:true,date:new Date(2026,10,10,12)});e.setLevel(stage);e.start(mode,undefined,{mod});e.S.pz=10000;e.S.time=42;e.S.people=[];e.setR(e.mulberry32(918273));const before=e.random();if(extend)e.extendClassicPickups();const after=e.random();e.genChunk(10100);const crowd=JSON.stringify(e.S.people);return [before,after,crowd,e.random()];};assert.deepEqual(sample(true),sample(false));
});
for(const mode of ['daily','weekly']) test(mode+' actual clock boundary retains captured score and rewards once',()=>{
 const e=load(undefined,{seeded:true,dom:true,date:new Date(2026,10,15,23,59,59)});e.start(mode);const identity=e.S.competition;e.setDate(new Date(2026,10,16,0,0,1));assert.equal(e.hasPlayed(mode),false);e.S.score=777;e.S.people=[e.mkPerson(0,.1)];e.tick(.01);assert.equal(e.state,'over');const xp=e.xp();e.quitRun();assert.equal(e.xp(),xp);assert.equal(e.storage[identity.scoreKey],'777');assert.equal(e.storage['excuseme_played_'+mode],identity.period);for(let i=0;i<100;i++)e.tick(.05);assert.match(e.element('endEyebrow').textContent,new RegExp(identity.period));assert.match(e.element('endEyebrow').textContent,/Updated movement/);
});
for(const mode of ['daily','weekly']) test(mode+' upgrade marker retained and boost expires',()=>{
 const e=load(undefined,{date:new Date(2026,10,10,12)});const period=mode==='daily'?'2026-11-10':e.weekKey(new Date(2026,10,10));e.storage['excuseme_played_'+mode]=period;e.start(mode);assert.notEqual(e.state,'play');delete e.storage['excuseme_played_'+mode];e.start(mode);e.S.people=[];e.S.nextChunk=1e9;e.S.pickups=[{x:0,z:0,type:'boost'}];e.collectPowerups(e.S,0,0,0,true);e.tick(4);assert.equal(e.powerMul(e.S),1);
});
for(const mode of ['daily','weekly']) test(mode+' razor pass grants Classic stamina and near bonus; no ghosts or extra quit rewards',()=>{
 const sample=kind=>{const e=load();e.start(kind,undefined,{mod:null});e.S.energy=30;e.S.chain=12;const p=e.mkPerson(.65,0);p.circles=[{ox:0,r:.3}];e.onPass(p);return {energy:e.S.energy,near:e.nearMul(e.S),chain:e.S.chain};};assert.deepEqual(sample(mode),sample('classic'));assert.ok(sample(mode).near>1);
 const e=load();e.start(mode);e.S.score=300;e.S.ghostRec=[0,0,0,20];e.quitRun();const xp=e.xp();e.quitRun();assert.equal(e.xp(),xp);assert.equal(Object.keys(e.storage).filter(k=>k.includes('ghost')).length,0);
});
