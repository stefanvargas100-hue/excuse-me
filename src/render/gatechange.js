import {ctx} from '../dom.js';
import {stylePause,styleResume} from './style.js';
import {hex} from '../config/colour.js';
import {LV,mixc} from '../config/levels.js';
import {VZ,F,W,H} from './camera.js';
import {box3D,forSegs,fq,wq,P,label} from './draw.js';
import {goalOf} from '../sim/state.js';
export function paintGateChange(){
 const styled=stylePause(); ctx.fillStyle='#bcd3e6';ctx.fillRect(-W,-H,3*W,3*H); const h=LV.half;
 forSegs(6,100,(k,za,zb,a,b)=>{
  fq(-h,h,0,a,b,mixc(hex(k%2?'#aeb9c6':'#bcc7d3'),a));
  fq(-.25,.25,.01,a,b,mixc(hex('#e8c547'),a));
  for(const side of [-1,1]){const x=side*h;wq(x,0,3.8,a,b,mixc(hex(side<0?'#8da3b8':'#7f93a8'),a));
   box3D(x-side*.3-.05,x-side*.3+.05,2.2,3.4,za+1,za+5,hex('#10202e'));
   const d=za+3-VZ;if(d>2&&d<60){const p=P(x-side*.45,2.8,d);label(side<0?'GATE C'+(10+k):'DEPARTURES',p[0],p[1],Math.min(24,F/d*.4),side<0?'#ffcf1f':'#7dff9a');}}
 });
 const d=goalOf()-VZ;if(d>1&&d<70){const p=P(0,3.5,d);label(LV.goalText,p[0],p[1],Math.min(30,F/d*.7),'#1d3557');}
 styleResume(styled);
}
