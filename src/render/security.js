import {ctx} from '../dom.js';
import {stylePause,styleResume} from './style.js';
import {hex} from '../config/colour.js';
import {LV,mixc} from '../config/levels.js';
import {VZ,F,W,H} from './camera.js';
import {box3D,forSegs,fq,wq,P,label} from './draw.js';
import {goalOf} from '../sim/state.js';
export function paintSecurity(){
 const styled=stylePause(); ctx.fillStyle='#cfe0ee';ctx.fillRect(-W,-H,3*W,3*H); const h=LV.half;
 forSegs(6,100,(k,za,zb,a,b)=>{
  fq(-h,h,0,a,b,mixc(hex(k%2?'#c6ced6':'#d3dae1'),a));
  for(const side of [-1,1]){const x=side*h;wq(x,0,3.8,a,b,mixc(hex('#9fb3c4'),a));fq(Math.min(x,x-side*.9),Math.max(x,x-side*.9),.25,a,b,mixc(hex('#7d8da0'),a));
   const d=za+3-VZ;if(d>2&&d<60){const p=P(x-side*.2,2.4,d);label(k%2?'SECURITY':'NO LIQUIDS',p[0],p[1],Math.min(24,F/d*.4),'#1d3557');}
   box3D(x-side*.55-.2,x-side*.55+.2,0,.7,za+1,za+1.8,hex('#3a4352'));}
 });
 const d=goalOf()-VZ;if(d>1&&d<70){const p=P(0,3.5,d);label(LV.goalText,p[0],p[1],Math.min(30,F/d*.7),'#1d3557');}
 styleResume(styled);
}
