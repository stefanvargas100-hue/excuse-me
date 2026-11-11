const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./harness');
const game=o=>load(undefined,{compat:true,dom:true,...o});
const plain={body:'m',build:'medium',shirtType:'tee',pantsType:'jeans',shoeType:'sneakers',hat:'cap',pack:'pack'};
test('new and omitted standard records isolate r1 without migrating legacy values',()=>{
 const e=game();assert.equal(e.makeRun().rules,2);assert.equal(e.recordKey('x'),'x:standard:r2');assert.equal(e.recordKey('x',{category:'standard',rules:1}),'x');
 for(let i=0;i<e.LEVELS.length;i++){const id=e.LEVELS[i].id;e.storage['excuseme_race_best_'+id+e.recordKey('',{category:'standard',rules:1})]='1';assert.equal(e.raceBest(id),0);assert.equal(e.boardId('race',id),e.boardIdFor('race',i));assert.match(e.boardIdFor('race',i),/^race:[a-z][a-z0-9_-]{0,34}$/);assert.match(e.boardIdFor('race',i),/_r2$/);}
});
test('Challenge competitive r2 preserves frozen r1 course seed and outfit fixtures',()=>{
 const e=game();for(const before of require('../game/rounds/round-02/batch-17d-evidence/challenge-r1-fixtures.json')){const c=JSON.parse(JSON.stringify(e.challengeFor(before.week)));assert.equal(c.rules,2);assert.deepEqual({...c,rules:1},before);e.storage['excuseme_wchal_'+c.week+':challenge:r1']='20';assert.equal(e.challengeBest(c),0);e.storage['excuseme_wchal_'+c.week+':challenge:r2']='30';assert.equal(e.challengeBest(c),30);}
});
test('captured seeded mp2 remains mp2 while new identities are mp3 and period eligibility stays used',()=>{
 const e=game({date:new Date(2026,10,15,23,59,59)});
 for(const mode of ['daily','weekly']){e.start(mode);const period=e.S.competition.period;e.quitRun();e.toMenu();const old=period+':mp2';assert.equal(e.boardId(mode,old),mode+':'+old);assert.equal(e.seededIdentity(mode,old).rules,'mp2');assert.equal(e.seededIdentity(mode,period).rules,'mp3');e.storage['excuseme_played_'+mode]=period;e.storage['excuseme_'+mode+'_'+old]='999';e.start(mode);assert.notEqual(e.state,'play');assert.equal(e.hasPlayed(mode),true);e.setDate(new Date(2026,10,16,0,0,1));assert.equal(e.hasPlayed(mode),false);e.setDate(new Date(2026,10,15,23,59,59));}
});
test('actual preview output normalizes speed through 13, preserves neutral and try-on numbers',()=>{
 const e=game();Object.assign(e.LOOK,plain,{build:'large',shirtType:'suit',pantsType:'slacks',shoeType:'heels',hat:'fedora'});e.renderStats();let html=e.element('statBars').innerHTML;assert.match(html,/Build stats/);assert.match(html,/width:100%/);assert.doesNotMatch(html,/115%|race only/);
 Object.assign(e.LOOK,plain,{body:'f',build:'small',shirtType:'tank',pantsType:'cargo',shoeType:'slides',hat:'beanie',pack:'boombox'});assert.equal(e.statsOf(e.LOOK).speed,-13);e.renderStats();assert.match(e.element('statBars').innerHTML,/width:0%/);
 Object.assign(e.LOOK,plain,{body:'m',build:'medium',shoeType:'slides'});assert.equal(e.statsOf(e.LOOK).speed,0);e.renderStats();assert.match(e.element('statBars').innerHTML,/width:50%/);e.renderStats({build:'large'});assert.match(e.element('statBars').innerHTML,/&rarr;/);
});
test('actual submissions preserve captured mp2 and pending queue strings; current Classic top fetch is isolated and races remain disabled',async()=>{
 const urls=[],e=game({fetch:async(url)=>{urls.push(url);throw Error('local offline stub');}}),old={board:'daily:2026-11-10:mp2',score:7,name:'Old'};
 e.storage.excuseme_online_queue=JSON.stringify([old]);e.submitRun('daily','2026-11-11:mp2',22);await new Promise(r=>setImmediate(r));
 const q=JSON.parse(e.storage.excuseme_online_queue);assert.deepEqual(q[0],old);assert.equal(q[1].board,'daily:2026-11-11:mp2');e.flushScores();await new Promise(r=>setImmediate(r));assert.deepEqual(JSON.parse(e.storage.excuseme_online_queue),q);
 e.submitRun('weekly','2026-W46',33);await new Promise(r=>setImmediate(r));assert.equal(JSON.parse(e.storage.excuseme_online_queue).at(-1).board,'weekly:2026-W46:mp3');
 await e.fetchTopGhosts('airport');assert.ok(urls.some(u=>decodeURIComponent(u).includes('classic:airport:cm3')));assert.ok(urls.every(u=>!u.includes('cm2')));
 const count=urls.length;e.submitRaceTime('airport',30000);await e.loadBoard(e.boardId('race','airport'));assert.equal(urls.length,count);const ghosts=urls.filter(u=>u.includes('/ghosts')).length;e.start('race');await new Promise(r=>setImmediate(r));assert.equal(urls.filter(u=>u.includes('/ghosts')).length,ghosts,'race start does not fetch top ghosts');
});
test('actual current best and ghost reads ignore retained cm2/r1/Cup r3 and write compatible keys only',()=>{
 const e=game(),old={'excuseme_best_airport:cm2':'9999','excuseme_ghost_airport:cm2':'[0,0,0,99]','excuseme_race_best_airport:rt1':'1','excuseme_cup_nyc:r3':'40:1.00'};Object.assign(e.storage,old);
 assert.equal(e.bestOf('airport'),0);assert.equal(e.raceBest('airport'),0);assert.equal(e.cupBest(),null);e.storage['excuseme_best_airport:cm3']='77';assert.equal(e.bestOf('airport'),77);
 e.start('race');e.S.race.countT=0;e.S.ghostRec=[0,0,0,20];e.S.pz=e.LV.goal+1;e.tick(.01);assert.ok(e.storage['excuseme_race_best_airport:rt1:standard:r2']);assert.ok(e.storage[e.ghostKeyFor('race','airport')]);
 for(const [k,v]of Object.entries(old))assert.equal(e.storage[k],v);
});
