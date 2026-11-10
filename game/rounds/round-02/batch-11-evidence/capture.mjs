import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const phase=process.argv[2]||'before', out=new URL('./',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1');
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'}); await server.listen();
const browser=await chromium.launch();
const perf=[];
try {for(const [width,height] of [[390,844],[320,568]]){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 await context.route(/supabase\.co/,r=>r.abort());
 await context.addInitScript(()=>{localStorage.setItem('excuseme_tut','1');window.requestAnimationFrame=()=>0;});
 const page=await context.newPage(); await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);await page.waitForFunction(()=>!!window.__excuse);await page.evaluate(()=>document.fonts.ready);
 await page.locator('#boardsBtn').click();await page.screenshot({path:`${out}/${phase}-${width}-boards.png`});
 for(const [level,route,entrance,exit] of [[5,'mezzanine',80,300],[6,'back-alley',70,260],[0,'',0,0]]){
  for(const [scene,z,active] of level===0?[['busy',160,'']]:[['entry',entrance-12,''],['interior',entrance+48,route],['rejoin',exit-4,route]]){
   const stats=await page.evaluate(({level,z,active})=>{
    const E=window.__excuse;Math.random=()=>.42;E.setLevel(level);E.start(false,'race');E.S.race.countT=0;E.S.pz=z;E.S.px=0;E.S.camX=0;E.S.route=E.S.me.route=active;E.S.me.z=z;E.S.people=[];
    for(let n=Math.floor((z-16)/4)*4;n<z+90;n+=4)E.genChunk(n);
    E.S.banner={text:'RUSH HOUR',color:'#ff9f43',t:1};E.hud();for(let n=0;n<30;n++)E.render();
    const samples=[];for(let n=0;n<200;n++){const t=performance.now();E.render();samples.push(performance.now()-t);}samples.sort((a,b)=>a-b);
    return {median:samples[100],p95:samples[189],actors:E.S.people.length,style:E.styleId()};
   },{level,z,active});
   perf.push({phase,width,level,scene,...stats});await page.screenshot({path:`${out}/${phase}-${width}-${level}-${scene}.png`});
  }
 }
 await context.close();
}await writeFile(`${out}/${phase}-perf.json`,JSON.stringify(perf,null,2));}
finally{await browser.close();await server.close();}
