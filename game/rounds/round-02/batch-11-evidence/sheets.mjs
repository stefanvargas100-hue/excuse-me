import {chromium} from 'playwright';import {readFile,writeFile} from 'node:fs/promises';
const b=await chromium.launch(),p=await b.newPage();const d=new URL('./',import.meta.url);
for(const phase of ['before','polish','after'])for(const w of [320,390]){
 const names=['boards','5-entry','5-interior','5-rejoin','6-entry','6-interior','6-rejoin'];let html='<body style="margin:0;display:grid;grid-template-columns:repeat(4,320px);background:#ddd">';
 for(const n of names){const f=`${phase}-${w}-${n}.png`;html+=`<div style="font:16px Arial">${f}<img style="width:320px;display:block" src="data:image/png;base64,${(await readFile(new URL(f,d))).toString('base64')}"></div>`;}
 await p.setViewportSize({width:1280,height:w===320?1180:1425});await p.setContent(html);await p.screenshot({path:new URL(`${phase}-${w}-sheet.png`,d).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
}await b.close();
