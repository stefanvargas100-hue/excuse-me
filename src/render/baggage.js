import {ctx} from '../dom.js';
import {stylePause,styleResume} from './style.js';
import {hex} from '../config/colour.js';
import {LV,mixc} from '../config/levels.js';
import {VZ,F,W,H} from './camera.js';
import {box3D,forSegs,fq,wq,P,label} from './draw.js';
import {goalOf} from '../sim/state.js';
const BAGS=['#c0392b','#2f80ed','#27ae60','#8e44ad','#f2994a','#2d3436'];
export function paintBaggage(){
 const styled=stylePause(); ctx.fillStyle='#d6e2ea';ctx.fillRect(-W,-H,3*W,3*H); const h=LV.half;
 forSegs(6,100,(k,za,zb,a,b)=>{
  fq(-h,h,0,a,b,mixc(hex(k%2?'#b9c2cb':'#c8d0d8'),a));
  wq(h,0,3.8,a,b,mixc(hex('#8fa4b6'),a));
  fq(-h-3.2,-h,.55,a,b,mixc(hex('#23272e'),a));
  box3D(-h-3.4,-h-3.2,0,.55,za,zb,hex('#59606b'));box3D(-h,-h+.2,0,.6,za,zb,hex('#59606b'));
  if(k%2===0)box3D(-h-1.7,-h-.9,.55,1.0,za+1.2,za+2.2,hex(BAGS[k%BAGS.length]));
  if(k%3===1)box3D(-h-2.4,-h-1.8,.55,.95,za+2.5,za+3.2,hex(BAGS[(k+2)%BAGS.length]));
  const d=za+3-VZ;if(d>2&&d<60){
   if(k%2===0){const p=P(-h-1.5,1.8,d);label('CAROUSEL '+(k/2%9+1|0),p[0],p[1],Math.min(24,F/d*.4),'#fff3ce');}
   else{box3D(h-.3,h-.1,1.5,2.7,za+1,za+4,hex('#10202e'));const p=P(h-.4,2.1,d);label('ARRIVALS',p[0],p[1],Math.min(22,F/d*.38),'#ffcf1f');}}
 });
 const d=goalOf()-VZ;if(d>1&&d<70){const p=P(0,3.5,d);label(LV.goalText,p[0],p[1],Math.min(30,F/d*.7),'#1d3557');}
 styleResume(styled);
}
