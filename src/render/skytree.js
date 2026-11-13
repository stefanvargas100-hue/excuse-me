import {ctx} from '../dom.js';
import {stylePause,styleResume} from './style.js';
import {hex} from '../config/colour.js';
import {LV,mixc} from '../config/levels.js';
import {VZ,F,W,H} from './camera.js';
import {box3D,forSegs,fq,wq,P,label} from './draw.js';
import {goalOf} from '../sim/state.js';
export function paintSkytree(){
 const styled=stylePause(); ctx.fillStyle='#bde4f4';ctx.fillRect(-W,-H,3*W,3*H); const h=LV.half;
 ctx.fillStyle='#7898ad';for(let j=0;j<12;j++){const y=H*(.32+(j%3)*.018);ctx.fillRect(W*(.68+j*.03),y,W*.025,H*.18);}
 forSegs(6,100,(k,za,zb,a,b)=>{
  fq(-h,h,0,a,b,mixc(hex('#e3e9e9'),a));
  ctx.globalAlpha=.3;wq(h,0,3.8,a,b,mixc(hex('#a7d7e6'),a));ctx.globalAlpha=1;wq(-h,0,1.1,a,b,mixc(hex('#adbcc5'),a));for(const x of [-h,h])box3D(x-.06,x+.06,0,3.8,za,za+.1,hex('#607e8c'));for(let j=0;j<4;j++)box3D(h+2+j*3,h+4+j*3,-12,-4-(k+j)%4,za,za+3,hex('#799aad'));
 });
 const d=goalOf()-VZ;if(d>1&&d<70){const p=P(0,3.5,d);label(LV.goalText,p[0],p[1],Math.min(30,F/d*.7),'#234d60');}
 styleResume(styled);
}
