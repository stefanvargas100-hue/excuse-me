import {createServer} from 'vite';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const dir='game/rounds/round-02/batch-14b-evidence';
const server=await createServer({base:'/playtest/',server:{host:'127.0.0.1',port:5182}});await server.listen();const browser=await chromium.launch({headless:true});
try{for(const width of [320,390]){
 const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});let blocked=0;
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():(blocked++,route.abort()));
 await page.goto('http://127.0.0.1:5182/playtest/');await page.evaluate(()=>{localStorage.setItem('playtest:excuseme_tut','1');});await page.reload();
 for(const mode of ['daily','weekly']){
 const data=await page.evaluate(mode=>{const e=window.__excuse;e.start(mode);e.S.people=[];e.S.nextChunk=1e9;e.S.pz=50;e.S.pickups=[{x:0,z:58,type:'boost',taken:false}];e.render();return {path:location.pathname,mode,stats:e.S.moveStats,board:e.boardIdFor(mode,0),captured:e.S.competition.board};},mode);assert.equal(data.path,'/playtest/');assert.equal(data.board,data.captured);
 await page.screenshot({path:`${dir}/${width}-${mode}-pickup.png`});
 const boost=await page.evaluate(()=>{const e=window.__excuse;e.S.pickups[0].z=e.S.pz+.01;e.tick(.01);e.render();return e.powerMul(e.S);});assert.ok(boost>1);
 await page.screenshot({path:`${dir}/${width}-${mode}-boost.png`});
 const title=await page.evaluate(()=>{const e=window.__excuse;e.S.ghostT=0;e.S.people=[e.mkPerson(e.S.px,e.S.pz+.1)];e.tick(.01);for(let i=0;i<100;i++)e.tick(.05);return document.getElementById('endEyebrow').textContent;});assert.match(title,/Updated movement/);
 await page.screenshot({path:`${dir}/${width}-${mode}-results.png`});console.log(JSON.stringify({width,...data,boost,title,blocked}));
 }
 await page.evaluate(()=>{window.__excuse.toMenu();document.getElementById('boardsBtn').click();});
 for(const tab of ['daily','weekly']) {await page.locator('#boardTabs [data-tab="'+tab+'"]').click();const label=await page.locator('#boardTitle').innerText();assert.match(label,/Updated movement/);await page.screenshot({path:dir+'/'+width+'-'+tab+'-board.png'});console.log(JSON.stringify({width,tab,label}));}
 await page.close();
}}finally{await browser.close();await server.close();}
