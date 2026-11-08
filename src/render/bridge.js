// A stylised pedestrian course. All scenery is fixed or hashed, never simulation randomness.
import { hex } from '../config/colour.js';
import { LV, halfAt, mixc } from '../config/levels.js';
import { ctx } from '../dom.js';
import { F, HOR, VZ, W } from './camera.js';
import { P, box3D, cq, forSegs, fq, label, poly, sky } from './draw.js';
import { hsh } from './scenery.js';
import { goalOf } from '../sim/state.js';

function tower(z) {
  if(z+10-VZ<0.3 || z-VZ>115)return;
  const stone=hex('#b6a68c');
  for(const side of [-1,1])box3D(side<0?-8:3.1,side<0?-3.1:8,0,24,z,z+10,stone);
  box3D(-8,8,20,25,z,z+10,stone);
  // Pointed portal above the clear 6.2 m pedestrian opening.
  if(z-VZ>0.3){for(const side of [-1,1])poly([[side*3.1,9,z-VZ],[side*3.1,20,z-VZ],[0,20,z-VZ],[0,16,z-VZ]],mixc(stone,z-VZ));}
  for(const x of [-7,-4.2,4.2,7])box3D(x-0.22,x+0.22,24,26,z,z+1,hex('#d2c1a2'));
}
export function paintBridge(){
  sky('#94bbd3');
  for(let i=0;i<22;i++){const x=i/22*W,h=10+hsh(i,83)*65;ctx.fillStyle='#96acb8';ctx.fillRect(x,HOR-h,W/27,h);}
  const d=goalOf()-VZ;
  if(d>0.3&&d<100){cq(-5,5,3.8,4.7,d,mixc(hex('#334b5a'),d));const q=P(0,4.25,d);label(LV.goalText,q[0],q[1],0.6*F/d,'#fff4d4');}
  forSegs(4,110,(k,za,zb,a,b)=>{
    fq(-120,120,-3,a,b,mixc(hex('#6d9fae'),a));
    const ha=halfAt(za),hb=halfAt(zb);
    poly([[-ha,0,a],[ha,0,a],[hb,0,b],[-hb,0,b]],mixc(hex(k%2?'#ae9271':'#b79c7c'),a));
    if(a<65)fq(-ha,ha,0.006,a,Math.min(a+0.04,b),mixc(hex('#826e57'),a));
    for(const side of [-1,1]){
      poly([[side*ha,0,a],[side*ha,1.25,a],[side*hb,1.25,b],[side*hb,0,b]],mixc(hex('#697a7b'),a));
      if(a<65)box3D(side*ha-0.06,side*ha+0.06,0,1.5,za,za+0.12,hex('#42565b'));
      // Main suspension cable rises to the two towers; vertical hangers stay outside the walking surface.
      const height=z=>{const t=Math.min(Math.abs(z-190),Math.abs(z-410));return 5+18*Math.pow(Math.max(0,1-t/110),2);};
      const ya=height(za),yb=height(zb),x=side*7;
      poly([[x,ya,a],[x,ya+0.18,a],[x,yb+0.18,b],[x,yb,b]],mixc(hex('#4c6269'),a));
      if(za-VZ>0.3)box3D(x-0.035,x+0.035,0,ya,za,za+0.07,hex('#6b7b7d'));
    }


  });
  tower(410); tower(190);
}
