const assert=require('node:assert/strict'),fs=require('node:fs');
const {load,readyPlayers}=require('../../../../test/harness');
const settle=async()=>{for(let i=0;i<150;i++)await Promise.resolve();};
async function scenario(cup){
 const members=[],sent=[];
 const factory=()=>{const m={live:false,handlers:[]};members.push(m);return {join:async()=>m.live=true,leave:()=>m.live=false,onClose(){},onMessage:f=>m.handlers.push(f),send:(ev,d)=>{sent.push({ev,d});for(const p of members)if(p!==m&&p.live)Promise.resolve().then(()=>p.handlers.forEach(h=>h(ev,JSON.parse(JSON.stringify(d)))));}};};
 const h=load(null,{compat:true,dom:true}),g=load(null,{compat:true,dom:true});h.useRoomFactory(factory);g.useRoomFactory(factory);
 await h.hostRoom(0);assert.ok(await g.joinRoom('abcd'));await settle();
 if(cup){h.setRoomCup({stages:[0,1,2,3],difficulty:1});await settle();}
 await readyPlayers([h,g]);h.hostStart();await settle();assert.equal(h.state,'play');assert.equal(g.state,'play');
 const who=g.lobbyPlayers().find(p=>p.me).id,host=h.lobbyPlayers().find(p=>p.me).id,race=h.S.duel.seed;
 const snap=e=>JSON.stringify({players:e.lobbyPlayers(),cup:e.friendCup(),rematch:e.rematchState(),state:e.state,peers:e.S.duel.peers,storage:e.storage});
 const before=[snap(h),snap(g)];let count=0;
 for(const proto of [undefined,8,10])for(const [e,id]of [[h,who],[g,host]])for(const event of ['pos','fin','dnf','bye','outcomes','cup','bots','rematch','lobby:ready','lobby:start','ghost']){
  e.injectRoomMessage(event,{proto,id,race,seed:race,n:999,rev:999,ft:60,level:0,ready:true,kind:'race',rules:2,stage:'airport',course:':rt1',ghost:{step:2,pts:[0,0,0,12]}});count++;
 }
 for(const e of [h,g])for(const event of ['fin','dnf','bye','cup','rematch','ghost']){e.injectRoomMessage(event,{proto:9,id:'outsider1',race,ft:60});count++;}
 assert.deepEqual([snap(h),snap(g)],before);
 // Positive control: the same compatible peer may finish this active race.
 h.injectRoomMessage('fin',{proto:9,id:who,race,ft:60});assert.equal(h.S.duel.peers[who].fin,60);
 h.leaveRoom();g.leaveRoom();await settle();assert.ok(sent.every(p=>p.d.proto===9));
 return {cup,negativePackets:count,positiveFinishAccepted:true,allOutgoingPacketsStamped:true};
}
(async()=>{
 const E=load(null,{compat:true}),schema=fs.readFileSync('supabase/schema.sql','utf8'),migration=fs.readFileSync('supabase/migrations/0003_race_times.sql','utf8');
 assert.match(schema,/char_length\(board\) between 3 and 40/);assert.ok(migration.includes('^race:[a-z][a-z0-9_-]{0,34}$'));
 const boards=E.LEVELS.map((l,i)=>{const id=E.boardId('race',l.id);assert.equal(id,E.boardIdFor('race',i));assert.match(id,/^race:[a-z][a-z0-9_-]{0,34}$/);assert.ok(id.length<=40);return id;});
 assert.equal(E.recordKey('x'),'x:standard:r2');assert.equal(E.recordKey('x',undefined),'x:standard:r2');assert.equal(E.recordKey('x',{category:'standard',rules:1}),'x');
 const otherBoards=[...E.LEVELS.map(l=>E.boardId('classic',l.id)),E.boardId('daily','2026-11-11'),E.boardId('weekly','2026-W46'),E.boardId('daily','2026-11-10:mp2'),E.boardNameFor('2026-W46',2)];
 for(const id of otherBoards)assert.ok(id.length>=3&&id.length<=40);
 assert.match(otherBoards.at(-1),/^wchal:[0-9]{4}-W[0-9]{2}:r[0-9]{1,3}$/);
 const result={boards,otherBoards,scenarios:[await scenario(false),await scenario(true)]};fs.writeFileSync(__dirname+'/active-adversarial.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exitCode=1;});
