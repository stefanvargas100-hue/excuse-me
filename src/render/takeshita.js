// Harajuku shopping street: bright compact storefronts, hanging signs and a pedestrian arch.
import { hex } from '../config/colour.js';
import { LV, mixc } from '../config/levels.js';
import { F, VZ } from './camera.js';
import { box3D, forSegs, fq, label, P, sky, wq } from './draw.js';
import { goalOf } from '../sim/state.js';
const SHOPS = ['CREPES', '原宿', 'KAWAII', '竹下通り', 'TOKYO', 'FASHION'];
export function paintTakeshita() {
  sky('#b5dded');
  const h=LV.half;
  forSegs(5,100,(k,za,zb,a,b)=>{
    fq(-h,h,0,a,b,mixc(hex(k%2?'#cdb6b6':'#d9c4c1'),a));
    for(const x of [-h,h]) {
      const side=Math.sign(x), color=hex(k%3?'#e8a8c9':'#91c8c8');
      wq(x,0,5.5,a,b,mixc(color,a));
      wq(x-side*.01,0,2.5,a+.15,Math.max(a+.2,b-.15),mixc(hex('#544f70'),a));
      fq(Math.min(x,x-side*.6),Math.max(x,x-side*.6),2.5,a,b,mixc(hex(k%2?'#f6cde1':'#f7dc8a'),a));
      const d=za+2.5-VZ;
      if(d>2&&d<60){const q=P(x-side*.35,3.4,d);label(SHOPS[((k%6)+6)%6],q[0],q[1],Math.min(26,F/d*.45),'#723968');}
    }
    if(k%3===0&&a>3)for(const x of [-2,-1,0,1,2])box3D(x-.12,x+.12,4.2,4.5,za+.1,za+.3,hex(k%2?'#f6d483':'#f3abd2'));
  });
  for(const z of [22,goalOf()]){
    const d=z-VZ;if(d<1||d>100)continue;
    for(const x of [-h,h])box3D(x-.1,x+.1,0,4.6,z-.1,z+.1,hex('#3f9294'));
    box3D(-h,h,4.0,4.6,z-.1,z+.1,hex('#efe0f1'));
    const q=P(0,4.3,d);label(z===22?'TAKESHITA STREET · HARAJUKU':LV.goalText,q[0],q[1],Math.min(26,F/d*.55),'#75345d');
  }
}
