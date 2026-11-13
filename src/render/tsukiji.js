import {ctx} from '../dom.js';
import {stylePause,styleResume} from './style.js';
import {hex} from '../config/colour.js';
import {LV,mixc} from '../config/levels.js';
import {VZ,F,W,H} from './camera.js';
import {box3D,forSegs,fq,wq,P,label} from './draw.js';
import {goalOf} from '../sim/state.js';
export function paintTsukiji(){
 const styled=stylePause(); ctx.fillStyle='#bde4f4';ctx.fillRect(-W,-H,3*W,3*H); const h=LV.half;
 forSegs(6,100,(k,za,zb,a,b)=>{
  fq(-h,h,0,a,b,mixc(hex('#819a9b'),a));
  for(const side of [-1,1]){const x=side*h;wq(x,0,3.8,a,b,mixc(hex('#526c68'),a));fq(Math.min(x,x-side*1.1),Math.max(x,x-side*1.1),2.6,a,b,mixc(hex(k%2?'#c25f42':'#ddc589'),a));box3D(x-side*.7-.25,x-side*.7+.25,0,.7,za+1,za+1.8,hex('#a37846'));const d=za+3-VZ;if(d>2&&d<60){const p=P(x-side*.2,2,d);label(k%2?'FRESH FISH':'TSUKIJI',p[0],p[1],Math.min(24,F/d*.4),'#fff3ce');}}
 });
 const d=goalOf()-VZ;if(d>1&&d<70){const p=P(0,3.5,d);label(LV.goalText,p[0],p[1],Math.min(30,F/d*.7),'#234d60');}
 styleResume(styled);
}
