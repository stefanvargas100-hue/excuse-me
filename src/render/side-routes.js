import { sideRoutes } from '../config/side-routes.js';
import { S } from '../sim/state.js';
import { LV } from '../config/levels.js';
import { ctx } from '../dom.js';
import { F, VZ, W, HOR } from './camera.js';
import { fq, wq, P, label } from './draw.js';
// An isolated floor view keeps racers and obstacles on the same route visually together.
export function drawSideRoutes() {
  if (!S.race) return;
  for (const r of sideRoutes(LV.id)) {
    if (S.route === r.id) {
      for(let d=80;d>1;d-=2) { fq(-LV.half,LV.half,0,d,d+2,d%4?'#bbb4a1':'#aaa38e'); wq(-LV.half,0,2,d,d+2,'#596a63'); wq(LV.half,0,1,d,d+2,'#4e6258'); }
      ctx.fillStyle='#1b302b';ctx.fillRect(0,0,W,HOR*.6);
      label(r.name+' · REJOIN AT '+r.exit+' m',W/2,35,18,'#fff3bc');
    }
    const d=r.entrance-VZ;
    if (!S.route && d>1&&d<65) {
      for(let i=0;i<10;i++) fq(r.shape.entryX-.65,r.shape.entryX+.65,i*.06,d+i*.5,d+(i+1)*.5,i%2?'#eee0a8':'#7b796d');
      const q=P(r.shape.entryX,2,d);label(r.name+' ?',q[0],q[1],Math.min(24,F/d*.4),'#ffe08a');
    }
  }
}
