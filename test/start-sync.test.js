const test=require('node:test'),assert=require('node:assert/strict'),esbuild=require('esbuild'),path=require('node:path');
const output=esbuild.buildSync({entryPoints:[path.join(__dirname,'../src/online/start-sync.js')],bundle:true,format:'cjs',write:false,logLevel:'silent'}).outputFiles[0].text;
const m={exports:{}};new Function('module','exports',output)(m,m.exports);const {createStartCoordinator}=m.exports;
function setup(n=2,delay=0){
 let time=1000,packets=[],filter=()=>true;const nodes=[],starts=[],notices=[];
 for(let i=0;i<n;i++)nodes.push(createStartCoordinator({id:'p'+i,hostId:'p0',now:()=>time+i*54321,send:(event,data)=>{for(let j=0;j<n;j++)if(i!==j&&filter(i,j,event,data))packets.push({i,j,event,data:JSON.parse(JSON.stringify({...data,id:'p'+i})),at:time+delay});},onStart:p=>starts.push({i,p,at:time}),onNotice:s=>notices.push({i,s})}));
 const flush=()=>{let count=0;while(packets.some(p=>p.at<=time)){if(count++>10000)throw Error('message loop');const k=packets.findIndex(p=>p.at<=time),p=packets.splice(k,1)[0];nodes[p.j].receive(p.event,p.data);}};
 const advance=ms=>{for(let left=ms;left>0;){const step=Math.min(left,100);time+=step;left-=step;flush();nodes.forEach(n=>n.tick());flush();}};
 nodes[0].setPlayers(nodes.map((_,i)=>'p'+i),1);flush();advance(delay*4+500);
 return {nodes,starts,notices,flush,advance,get time(){return time;},setFilter:f=>filter=f,get packets(){return packets;}};
}
const ready=s=>{s.nodes.forEach(n=>n.setReady(true));s.advance(600);s.flush();};
test('a race format change invalidates acknowledgements and travels with the start plan',()=>{
 const s=setup();ready(s);s.nodes[0].setPlayers(['p0','p1'],1,true);s.flush();
 assert.equal(s.nodes[0].canStart(),false);assert.ok(s.nodes[0].view().players.every(p=>!p.ready));
 ready(s);assert.equal(s.nodes[0].start('elim:1'),true);s.advance(1000);
 assert.equal(s.starts.length,2);assert.ok(s.starts.every(({p})=>p.elim===true));
});
test('offset clocks map a common deadline into every phone clock at 2, 4 and 8 players',()=>{
 for(const n of [2,4,8]){const s=setup(n,40);ready(s);assert.equal(s.nodes[0].canStart(),true);assert.equal(s.nodes[0].start('room:1'),true);s.advance(1000);assert.equal(s.starts.length,n);const deadlines=s.starts.map(({i,p})=>p.startAtLocal-i*54321);assert.ok(Math.max(...deadlines)-Math.min(...deadlines)<1);assert.ok(deadlines.every(t=>t>s.time));}
});
test('missing prepare acknowledgement cancels without starting anyone',()=>{
 const s=setup();ready(s);s.setFilter((i,j,event)=>event!=='prepared');s.nodes[0].start('room:1');s.advance(3500);assert.equal(s.starts.length,0);assert.equal(s.nodes[0].view().phase,'idle');assert.equal(s.nodes[0].canStart(),false);
});
test('missing commit acknowledgement also cancels',()=>{
 const s=setup();ready(s);s.setFilter((i,j,event)=>event!=='committed');s.nodes[0].start('room:1');s.advance(3500);assert.equal(s.starts.length,0);assert.equal(s.nodes[1].view().phase,'idle');
});
test('lost prepare and release packets are repeated and never cause duplicate starts',()=>{
 const s=setup();ready(s);const preparedAfter=s.time+300,goAfter=s.time+900;s.setFilter((i,j,event,data)=>{
   if((event==='prepare'||(event==='state'&&data.phase==='preparing'))&&s.time<preparedAfter)return false;
   if((event==='go'||(event==='state'&&data.phase==='running'))&&s.time<goAfter)return false;return true;
 });
 s.nodes[0].start('room:1');s.advance(2000);assert.equal(s.starts.length,2);s.advance(1000);assert.equal(s.starts.length,2);
});
test('stage and membership changes reset all confirmations',()=>{
 const s=setup(3);ready(s);s.nodes[0].setPlayers(['p0','p1','p2'],2);s.flush();assert.ok(s.nodes[0].view().players.every(p=>!p.ready));assert.equal(s.nodes[0].canStart(),false);ready(s);s.nodes[0].setPlayers(['p0','p1'],2);s.flush();assert.ok(s.nodes[0].view().players.every(p=>!p.ready));
});
test('reordered readiness and unsolicited clock samples are ignored',()=>{
 const s=setup();ready(s);const snapshot=s.nodes[0].snapshot(),config=snapshot.config;
 s.nodes[0].receive('ready',{id:'p1',protocol:2,config,n:100,ready:false,rtt:0,clock:true});
 s.nodes[0].receive('ready',{id:'p1',protocol:2,config,n:99,ready:true,rtt:0,clock:true});assert.equal(s.nodes[0].canStart(),false);
 const before=s.nodes[1].view().rtt;s.nodes[1].receive('pong',{id:'p0',to:'p1',nonce:99999,hostTime:1e12});assert.equal(s.nodes[1].view().rtt,before);
});
test('unready or disconnected during preparation cancels and old go packets cannot resurrect it',()=>{
 const s=setup();ready(s);s.setFilter((i,j,event)=>event!=='prepared');s.nodes[0].start('room:1');s.flush();const plan=s.nodes[0].snapshot().plan;s.nodes[1].setReady(false);s.flush();s.advance(1000);assert.equal(s.starts.length,0);s.nodes[1].receive('go',{id:'p0',plan});assert.equal(s.starts.length,0);
});
test('incompatible clients cannot ready or start',()=>{
 const s=setup();s.nodes[1].acceptSnapshot({protocol:1});assert.equal(s.nodes[1].setReady(true),false);assert.equal(s.nodes[1].view().compatible,false);
});
test('host disappearing during preparation cannot strand the guest beyond the start deadline',()=>{
 const s=setup();ready(s);s.setFilter((i,j,event)=>event!=='committed');s.nodes[0].start('room:1');s.flush();s.nodes[0].setConnected(false);s.advance(4000);
 assert.equal(s.starts.length,0);assert.equal(s.nodes[1].view().phase,'idle');assert.equal(s.nodes[1].view().ready,false);
});
test('a release delivered after the scheduled deadline is explicitly marked late',()=>{
 const s=setup();ready(s);let held;
 s.setFilter((i,j,event,data)=>{if(j===1&&(event==='go'||(event==='state'&&data.phase==='running'))){if(data.plan)held=data.plan;return false;}return true;});
 s.nodes[0].start('room:1');s.flush();s.advance(3100);s.nodes[1].receive('go',{id:'p0',protocol:2,plan:held});assert.equal(s.starts.length,2);assert.equal(s.starts.find(x=>x.i===1).p.late,true);
});
test('losing a connection immediately clears local readiness, before a host acknowledgement',()=>{
 const s=setup();ready(s);s.nodes[1].setConnected(false);assert.equal(s.nodes[1].view().ready,false);assert.equal(s.nodes[1].view().players.find(p=>p.id==='p1').ready,false);
});
test('temporary packet loss clears stale readiness and permits a fresh confirmation after recovery',()=>{
 const s=setup();ready(s);s.setFilter(i=>i!==1);s.advance(7000);s.setFilter(()=>true);s.advance(2500);
 assert.equal(s.nodes[1].view().ready,false);assert.equal(s.nodes[1].view().pending,false,'a host-cleared confirmation is not permanently pending');
 assert.equal(s.nodes[0].canStart(),false);assert.equal(s.nodes[1].setReady(true),true);s.flush();assert.equal(s.nodes[0].canStart(),true);
});
test('an older host confirmation cannot overwrite a newer local not-ready request',()=>{
 const s=setup();ready(s);s.setFilter((i,j,event)=>!(i===1&&event==='ready'));
 s.nodes[1].setReady(false);s.nodes[0].setReady(true);s.flush();
 assert.equal(s.nodes[1].view().ready,false);assert.equal(s.nodes[1].view().pending,true);
 s.setFilter(()=>true);s.advance(2500);assert.equal(s.nodes[1].view().pending,false);assert.equal(s.nodes[0].canStart(),false);
});
