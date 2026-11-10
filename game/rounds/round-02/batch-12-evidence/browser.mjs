import { createServer } from 'vite';
import { chromium } from 'playwright';
const server=await createServer({server:{host:'127.0.0.1',port:5179}});await server.listen();
const browser=await chromium.launch({headless:true});
try{
for(const width of [320,390]){
 const page=await browser.newPage({viewport:{width,height:844}});
 // No live services are contacted for evidence.
 await page.route('https://**/*',route=>route.abort());
 await page.goto('http://127.0.0.1:5179/?playtest=1');
 await page.evaluate(()=>{localStorage.setItem('excuseme_tut','1');});
 await page.reload();
 for(const build of ['small','medium','large']){
  const data=await page.evaluate(build=>{const e=window.__excuse;e.LOOK.build=build;e.start('classic');e.S.people=[];e.S.nextChunk=1e9;e.S.pz=50;e.S.pickups=[{x:0,z:58,type:'boost',taken:false}];e.render();return {build,stats:e.S.moveStats,pickup:e.S.pickups[0]};},build);
  await page.screenshot({path:`game/rounds/round-02/batch-12-evidence/${width}-${build}-pickup.png`});
  const effect=await page.evaluate(()=>{const e=window.__excuse;const s=e.S;s.pickups[0].z=s.pz+.01;e.tick(.01);s.chain=50;s.lastPassT=s.time;e.onPass(e.mkPerson(.65,s.pz));e.render();return {boost:e.powerMul(s),slow:s.slowT,hitStop:s.hitStop,combo:s.chain};});
  await page.screenshot({path:`game/rounds/round-02/batch-12-evidence/${width}-${build}-effect.png`});
  if(effect.boost<=1||effect.slow!==0||effect.hitStop!==0)throw Error(JSON.stringify(effect));
  console.log(JSON.stringify({width,...data,effect}));
 }
 await page.close();
}
}finally{await browser.close();await server.close();}
