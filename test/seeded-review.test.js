const test=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./harness');
for(const mode of ['daily','weekly'])test(`${mode}: quit, reload and real boundary keep device eligibility and board identity`,()=>{
 const before=new Date(2026,10,15,23,59,59),after=new Date(2026,10,16,0,0,1);
 const e=load(undefined,{date:before});e.start(mode);const id=e.S.competition;e.S.score=321;e.quitRun();
 const reloaded=load(undefined,{date:before});Object.assign(reloaded.storage,e.storage);
 reloaded.start(mode);assert.notEqual(reloaded.state,'play');assert.equal(reloaded.storage[id.scoreKey],'321');
 assert.equal(reloaded.storage['excuseme_played_'+mode],id.period);
 reloaded.setDate(after);assert.equal(reloaded.hasPlayed(mode),false);reloaded.start(mode);
 assert.equal(reloaded.state,'play');assert.notEqual(reloaded.S.competition.period,id.period);
 assert.equal(reloaded.S.competition.board,reloaded.boardIdFor(mode,0));
 assert.equal(reloaded.boardId(mode,id.key),id.board);assert.equal(reloaded.storage[id.scoreKey],'321');
});
