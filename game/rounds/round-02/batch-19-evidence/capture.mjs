import { createServer } from 'vite';
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const evidence = 'game/rounds/round-02/batch-19-evidence';
const server = await createServer({base:'/playtest/',server:{host:'127.0.0.1',port:0}});
await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
let browser; const results=[];
try {
 browser=await chromium.launch();
 for(const width of [320,390]) {
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

  await host.locator('#friendFormat .chip').nth(2).click();
  for(const city of ['New York','Tokyo']) {
   await host.locator('.friendCity').filter({hasText:city}).click();
   await guest.waitForFunction(city=>window.__excuse.LEVELS[window.__excuse.roomCup().stages[0]].city===city,city,{polling:50});
   for(const [name,page] of [['host',host],['guest',guest]]) {
    await page.locator('#friend .card').evaluate(e=>e.scrollTop=0);
    await page.screenshot({path:evidence+'/'+width+'-'+name+'-'+city.replaceAll(' ','-')+'.png'});
    results.push(await page.evaluate(({city,name,width})=>{const c=document.querySelector('#friend .card');return {city,name,width,horizontalOverflow:c.scrollWidth-c.clientWidth,selection:window.__excuse.roomCup().stages};},{city,name,width}));
   }
  }
  await host.evaluate(()=>window.__excuse.setRoomCup({...window.__excuse.roomCup(),bots:0}));
  await guest.waitForFunction(()=>window.__excuse.roomCup().bots===0,null,{polling:50});
  await guest.evaluate(()=>window.__excuse.setRoomReady(true));
  await host.waitForFunction(()=>window.__excuse.canStartRoom(),null,{polling:50});
  await host.evaluate(()=>window.__excuse.hostStart());
  for(let round=0;round<2;round++) {
   await host.waitForFunction(()=>window.__excuse.state==='play',null,{polling:50});
   await guest.waitForFunction(()=>window.__excuse.state==='play',null,{polling:50});
   for(const page of pages) await page.evaluate(()=>{const g=window.__excuse;g.S.race.countT=0;g.S.pz=g.LV.goal+1;for(let i=0;i<5;i++)g.tick(1/30);});
   await host.waitForFunction(n=>window.__excuse.friendCup().rounds.length===n,round+1,{polling:50});
   if(round===0)await host.evaluate(()=>window.__excuse.requestRematch());
  }
  await host.evaluate(()=>{for(let i=0;i<30;i++)window.__excuse.tick(1/30);});
  await host.locator('#end').waitFor({state:'visible'});
  await host.screenshot({path:evidence+'/'+width+'-tokyo-final.png'});
  assert.equal(await host.evaluate(()=>window.__excuse.friendCupOver()),true);
  await context.close();
 }
 writeFileSync(`${evidence}/18b-guest-result.json`,JSON.stringify({method:'Batch 10c multi-page local relay; external traffic blocked',results},null,2));
 console.log(JSON.stringify(results));
} catch(error){writeFileSync(`${evidence}/18b-guest-result.json`,JSON.stringify({results,error:String(error),attempts:1},null,2));throw error;}
finally{if(browser)await browser.close();await server.close();}
