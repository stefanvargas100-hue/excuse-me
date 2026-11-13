import { createServer } from 'vite';
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const evidence = 'game/rounds/round-02/batch-22-evidence';
const server = await createServer({base:'/playtest/',server:{host:'127.0.0.1',port:0}});
await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
let browser; const results=[];
try {
 browser=await chromium.launch();
 for(const width of [320,390]) for(const spectatorRole of ['host','guest']) {
  const height=width===320?568:844;
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true});
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await context.addInitScript(()=>{window.requestAnimationFrame=()=>0;localStorage.setItem('excuseme_tut',JSON.stringify('1'));});
  const pages=[],active=new Set();
  await context.exposeBinding('roomSend',async({page},event,data)=>{await Promise.all(pages.filter(p=>p!==page&&active.has(p)).map(p=>p.evaluate(({event,data})=>window.deliverRoom(event,data),{event,data})));});
  for(let i=0;i<2;i++){
   const page=await context.newPage();pages.push(page);
   await page.goto(origin+'/playtest/');await page.waitForFunction(()=>window.__excuse,null,{polling:50});
   await page.evaluate(async i=>{const E=window.__excuse;localStorage.setItem('excuseme_online_name',JSON.stringify('ABCDEFGHIJKLMNOPQRSTUVW'+i));const handlers=[];window.deliverRoom=(ev,data)=>handlers.forEach(h=>h(ev,data));E.useRoomFactory(()=>({join:async()=>{},leave(){},onMessage:f=>handlers.push(f),onClose(){},send:(ev,data)=>{window.roomSend(ev,data);}}));(await import('/playtest/src/ui/friend.js')).openFriend();},i);
   active.add(page);
  }
  const [host,guest]=pages;
  await host.locator('#friendMake').click();await host.waitForFunction(()=>/^[A-Z2-9]{4}$/.test(document.getElementById('friendCode').textContent),null,{polling:50});
  const code=await host.locator('#friendCode').textContent();
  for(const page of pages.slice(1)){await page.locator('#friendJoinBtn').click();await page.locator('#friendInput').fill(code);await page.locator('#friendGo').click();await page.locator('#friendGuest').waitFor({state:'visible'});}


  await host.evaluate(()=>window.__excuse.setRoomCup({stages:[1,3,4,5],difficulty:1}));
  await guest.waitForFunction(()=>window.__excuse.roomCup(),null,{polling:50});
  for(const p of pages.slice(1)) await p.evaluate(()=>window.__excuse.setRoomReady(true));
  await host.waitForFunction(()=>window.__excuse.canStartRoom(),null,{polling:50});
  await host.evaluate(()=>window.__excuse.hostStart());
  for(const page of pages) await page.waitForFunction(()=>window.__excuse.state==='play',null,{polling:50});
  for(const page of pages) await page.evaluate(()=>{const g=window.__excuse;g.S.race.countT=0;for(let i=0;i<5;i++)g.tick(1/30);});
  for(const [name,page] of [[spectatorRole,spectatorRole==='host'?host:guest]]) {
   await page.evaluate(()=>{const g=window.__excuse;g.S.pz=g.LV.goal+1;g.tick(1/30);});
   for(const kind of ['human','bot']) {
    await page.evaluate(kind=>{const g=window.__excuse;const b=g.S.race.bots.find(b=>kind==='bot'?b.aiBot:(!b.aiBot && g.S.duel.peers[b.peerId].fin==null));for(const r of g.S.race.bots) r.z=20;b.z=60;g.S.race.spectate.target=null;g.tick(1/30);},kind);
    for(let attempt=0;attempt<8;attempt++) {
     if(await page.evaluate(kind=>!!window.__excuse.S.race.spectate.target.aiBot===(kind==='bot'),kind)) break;
     await page.locator('#spectateNext').tap();
    }
    assert.equal(await page.evaluate(()=>!!window.__excuse.S.race.spectate.target.aiBot),kind==='bot');
    await page.evaluate(()=>window.__excuse.render());
    await page.screenshot({path:evidence+'/'+width+'-'+name+'-'+kind+'.png'});
    results.push(await page.evaluate(({name,kind})=>{const bar=document.querySelector('#spectateBar'),b=bar.getBoundingClientRect();const buttons=[...bar.querySelectorAll('button')].map(el=>{const r=el.getBoundingClientRect();return {text:el.textContent,x:r.x,y:r.y,width:r.width,height:r.height,clipped:el.scrollWidth>el.clientWidth || el.scrollHeight>el.clientHeight,reachable:r.x>=0 && r.right<=innerWidth && r.y>=0 && r.bottom<=innerHeight};});return {name,kind,width:innerWidth,rect:{x:b.x,y:b.y,width:b.width,height:b.height},target:document.querySelector('#spectateName').textContent,buttons};},{name,kind}));
   }
   await page.locator('#spectateStop').tap();
   await page.screenshot({path:evidence+'/'+width+'-'+name+'-stopped.png'});
  }
  assert.ok(results.every(r=>r.buttons.every(b=>b.reachable && !b.clipped && b.height>=44)));
  await context.close();
 }
 writeFileSync(evidence+'/capture.json',JSON.stringify(results,null,2)); console.log(JSON.stringify(results));
} finally {if(browser)await browser.close();await server.close();}

