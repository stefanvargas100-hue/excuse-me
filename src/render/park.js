// Central Park scenery. All positions are fixed or hashed; rendering never consumes simulation randomness.
import { hex } from '../config/colour.js';
import { LV, halfAt, mixc } from '../config/levels.js';
import { TAU } from '../config/util.js';
import { ctx } from '../dom.js';
import { F, HOR, VZ, W } from './camera.js';
import { P, box3D, cq, forSegs, fq, label, poly, sky, wq } from './draw.js';
import { hsh } from './scenery.js';
import { variantOf } from './weather.js';
import { goalOf } from '../sim/state.js';

function crown(x, y, z, r, color) {
  if (z - VZ < 0.8) return;
  const pts = [];
  for (let i=0;i<12;i++) { const t=i/12*TAU; pts.push([x+Math.cos(t)*r,y+Math.sin(t)*r*0.65,z-VZ]); }
  poly(pts, color);
}

export function paintPark() {
  const autumn = variantOf() === 'autumn';
  sky('#95c5e0');
  // Midtown silhouettes beyond the canopy.
  for (let i=0;i<18;i++) {
    const x=W*(i/18), height=12+hsh(i,90)*54;
    ctx.fillStyle='#9db5b6'; ctx.fillRect(x,HOR-height,W/24,height);
  }
  const finish=goalOf()-VZ;
  if (finish < 110 && finish > 0.3) {
    for(let i=0;i<5;i++) cq(-15,15,i*0.28,(i+1)*0.28,finish+i*0.65,mixc(hex('#b7a58a'),finish));
    cq(-16,16,1.4,5,finish+4,mixc(hex('#d4c3a5'),finish));
    for(let x=-14;x<=14;x+=4) { cq(x-0.65,x+0.65,1.4,4.6,finish+3.9,mixc(hex('#897c66'),finish)); }
    const q=P(0,5.8,finish+4); label(LV.goalText,q[0],q[1],0.65*F/finish,'#46563e');
  }
  forSegs(4,100,(k,za,zb,a,b)=>{
    const bridge=za>=232 && za<284, ha=halfAt(za), hb=halfAt(zb);
    fq(-45,45,-0.04,a,b,mixc(hex(autumn?'#929a47':'#73a55b'),a));
    if(bridge) fq(-45,45,-0.035,a,b,mixc(hex('#769fa0'),a));
    poly([[-ha,0,a],[ha,0,a],[hb,0,b],[-hb,0,b]],mixc(hex(bridge?'#b6b0a1':k%2?'#c3b9a5':'#c9bfad'),a));
    for(const side of [-1,1]) {
      if(bridge){
        poly([[side*ha,0,a],[side*ha,1.05,a],[side*hb,1.05,b],[side*hb,0,b]],mixc(hex('#b0a591'),a));
        poly([[side*ha,1.05,a],[side*(ha+0.25),1.05,a],[side*(hb+0.25),1.05,b],[side*hb,1.05,b]],mixc(hex('#d6cbb7'),a));
        if(za-VZ>0.3) box3D(side*ha-0.18,side*ha+0.18,0,1.35,za,za+0.4,hex('#c5bba7'));
      } else fq(side<0?-6.2:6,side<0?-6:6.2,0.01,a,b,mixc(hex('#a69c85'),a));
      if(k%3===0 && !bridge) {
        const x=side*8.5,z=za+2;
        box3D(x-0.28,x+0.28,0,7,z-0.3,z+0.3,hex('#70634c'));
        const leaf=mixc(hex(autumn?['#c57a35','#d99a3c','#aa5532'][k%3]:'#527b42'),a);
        crown(x,8.8,z,4.8,leaf); crown(x-side*3,10.2,z,4.4,leaf);
        crown(x-side*5.1,11.3,z,3.4,mixc(hex(autumn?'#dda34e':'#6f914f'),a));
      }
    }
    if(autumn && a<45) for(let i=0;i<3;i++) {
      const x=(hsh(k*5+i,1)-0.5)*11,z=za+hsh(k*5+i,2)*4-VZ;
      if(z>0.3) fq(x,x+0.12,0.012,z,z+0.18,mixc(hex(i%2?'#b3662c':'#dbaa45'),z));
    }
    if(k%2===0 && a<60) { const q=P(0,0.01,a); ctx.fillStyle=mixc(hex('#aea995'),a); ctx.fillRect(q[0]-3*F/a,q[1],6*F/a,Math.max(1,0.015*F/a)); }
  });
}
