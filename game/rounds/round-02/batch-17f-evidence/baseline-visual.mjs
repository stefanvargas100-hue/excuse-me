import {createServer} from 'vite';
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
// Read-only baseline preview, with only an export added for the same capture instrumentation.
const baseline=execFileSync('git',['show','99283c2:src/render/preview.js'],{encoding:'utf8'}).replace('function renderStats(tryOn)','export function renderStats(tryOn)');
const server=await createServer({base:'/playtest/',plugins:[{name:'baseline-preview',enforce:'pre',transform(code,id){if(id.replaceAll('\\','/').endsWith('/src/render/preview.js'))return {code:baseline,map:null};}}],server:{host:'127.0.0.1',port:0}});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await chromium.launch(),out=[];
try{for(const [width,height]of [[320,568],[390,844]]){
 const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 await context.addInitScript(()=>{window.requestAnimationFrame=()=>0;localStorage.setItem('playtest:seeded','1');localStorage.setItem('playtest:excuseme_tut','1');});
 const page=await context.newPage();await page.goto(origin+'/playtest/');await page.waitForFunction(()=>window.__excuse);
 const sample=await page.evaluate(async()=>{const E=window.__excuse,P=await import('/playtest/src/render/preview.js');Object.assign(E.LOOK,{body:'m',build:'medium',shirtType:'tee',pantsType:'jeans',shoeType:'slides',hat:'cap',pack:'pack'});document.getElementById('lookBtn').click();P.renderStats();P.drawPreview(performance.now());document.getElementById('statBars').scrollIntoView({block:'center'});return {header:document.getElementById('statBars').textContent};});
 await page.screenshot({path:`game/rounds/round-02/batch-17f-evidence/baseline-neutral-${width}x${height}.png`});
 out.push({width,height,...sample});await context.close();
}writeFileSync('game/rounds/round-02/batch-17f-evidence/baseline-visual.json',JSON.stringify(out,null,2)+'\n');}finally{await browser.close();await server.close();}
