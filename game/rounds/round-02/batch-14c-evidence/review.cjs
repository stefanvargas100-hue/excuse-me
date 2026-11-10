const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.cwd(),dir=__dirname,base='dd3fddb';
const changed=execFileSync('git',['diff','--name-only',base,'55ca35b','--','src'],{encoding:'utf8'}).trim().split('\n');
const prior=new Map(changed.filter(p=>p!=='src/sim/seeded-rules.js').map(p=>[p,execFileSync('git',['show',base+':'+p],{encoding:'utf8'})]));
const baseline={name:'review-baseline',setup(b){b.onLoad({filter:/\.js$/},args=>{const p=path.relative(root,args.path).replaceAll('\\','/');if(prior.has(p))return {contents:prior.get(p),loader:'js'};});}};
(async()=>{
 const file=path.join(dir,'temporary-baseline.js');
 try{
 const out=await require('esbuild').build({entryPoints:['src/main.js'],bundle:true,format:'iife',write:false,plugins:[baseline]});fs.writeFileSync(file,out.outputFiles[0].text);
 const {load}=require('../../../../test/harness');let pairs=0;
 for(const mode of ['daily','weekly'])for(let stage=0;stage<5;stage++)for(const mod of [null,'tired','rush','phones']){
 const sample=source=>{const e=load(source,{date:new Date(2026,10,10,12),seed:1234});e.setLevel(stage);e.start(mode,undefined,{mod});const initial=JSON.stringify(e.S.people);e.S.pz=10000;e.S.time=42;e.S.people=[];e.genChunk(10100);return {initial,later:JSON.stringify(e.S.people),mod:e.S.mod};};
 assert.deepEqual(sample(undefined),sample(file),`${mode}/${stage}/${mod}`);pairs++;
 }console.log(`Baseline full initial/generated crowd, modifier comparisons: ${pairs} passed`);
 }finally{fs.rmSync(file,{force:true});}
 const {createServer}=await import('vite');const {chromium}=require('playwright');
 const server=await createServer({base:'/playtest/',plugins:[{name:'baseline-source',enforce:'pre',load(id){const p=path.relative(root,id.split('?')[0]).replaceAll('\\','/');return prior.get(p);}}],server:{host:'127.0.0.1',port:5183}});await server.listen();const browser=await chromium.launch({headless:true});
 try{const p=await browser.newPage({viewport:{width:320,height:844},isMobile:true,hasTouch:true});await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await p.goto('http://127.0.0.1:5183/playtest/');await p.evaluate(()=>{localStorage.setItem('playtest:excuseme_tut','1');});await p.reload();await p.evaluate(()=>{window.__excuse.toMenu();document.getElementById('boardsBtn').click();});await p.screenshot({path:path.join(dir,'baseline-320-board.png')});console.log('Baseline /playtest/ 320 board captured; external network blocked');}finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

