import { createServer } from 'vite';
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const evidence = 'game/rounds/round-02/batch-18-evidence';
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
  for(let i=0;i<3;i++){
   const page=await context.newPage();pages.push(page);
   await page.goto(origin+'/playtest/');await page.waitForFunction(()=>window.__excuse,null,{polling:50});
   await page.evaluate(async i=>{const E=window.__excuse;localStorage.setItem('excuseme_online_name',JSON.stringify('ABCDEFGHIJKLMNOPQRSTUVW'+i));const handlers=[];window.deliverRoom=(ev,data)=>handlers.forEach(h=>h(ev,data));E.useRoomFactory(()=>({join:async()=>{},leave(){},onMessage:f=>handlers.push(f),onClose(){},send:(ev,data)=>{window.roomSend(ev,data);}}));(await import('/playtest/src/ui/friend.js')).openFriend();},i);
   active.add(page);
  }
  const [host,guest]=pages;
  await host.locator('#friendMake').click();await host.waitForFunction(()=>/^[A-Z2-9]{4}$/.test(document.getElementById('friendCode').textContent),null,{polling:50});
  const code=await host.locator('#friendCode').textContent();
  for(const page of pages.slice(1)){await page.locator('#friendJoinBtn').click();await page.locator('#friendInput').fill(code);await page.locator('#friendGo').click();await page.locator('#friendGuest').waitFor({state:'visible'});}
  await host.evaluate(()=>window.__excuse.setRoomCup({stages:[2,0,4,1],difficulty:1,bots:2}));
  await guest.waitForFunction(()=>window.__excuse.roomCup()?.botCount===2&&window.__excuse.roomLobbyState().canReady,null,{polling:50});
  const button=guest.locator('#friendReady');await button.scrollIntoViewIfNeeded();assert.equal(await button.isVisible(),true);assert.equal(await button.isEnabled(),true);
  const box=await button.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=height);
  assert.match(await guest.locator('#friendStatus').textContent(),/3 players, 2 bots/);
  await guest.screenshot({path:`${evidence}/18b-real-guest-ready-${width}.png`});
  await button.click();await guest.waitForFunction(()=>window.__excuse.lobbyPlayers().find(p=>p.me).ready,null,{polling:50});
  results.push({width,height,players:3,bots:2,guestView:true,readyVisible:true,readyEnabled:true,readyClicked:true,box});
  await context.close();
 }
 writeFileSync(`${evidence}/18b-guest-result.json`,JSON.stringify({method:'Batch 10c multi-page local relay; external traffic blocked',results},null,2));
 console.log(JSON.stringify(results));
} catch(error){writeFileSync(`${evidence}/18b-guest-result.json`,JSON.stringify({results,error:String(error),attempts:1},null,2));throw error;}
finally{if(browser)await browser.close();await server.close();}
