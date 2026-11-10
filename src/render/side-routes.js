import { sideRoutes } from '../config/side-routes.js';
import { S } from '../sim/state.js';
import { LV } from '../config/levels.js';
import { ctx } from '../dom.js';
import { F, VZ, W, H } from './camera.js';
import { stylePause, styleResume } from './style.js';
import { fq, wq, P, label } from './draw.js';
// Paper-backed wayfinding stays below the top-right pause/combo stickers.
function routeSign(text, y) {
  const styled = stylePause(); ctx.save();
  ctx.fillStyle = '#fff4ec'; ctx.strokeStyle = '#3a2a4d'; ctx.lineWidth = 2;
  ctx.fillRect(14, y - 15, W - 28, 30); ctx.strokeRect(14, y - 15, W - 28, 30);
  label(text, W / 2, y, Math.min(16, (W - 48) / (text.length * .6)), '#3a2a4d');
  ctx.restore(); styleResume(styled);
}
// An isolated floor view keeps racers and obstacles on the same route visually together.
export function drawSideRoutes() {
  if (!S.race) return;
  for (const r of sideRoutes(LV.id)) {
    if (S.route === r.id) {
      const upper = r.level === 'up';
      ctx.fillStyle = upper ? '#263b36' : '#b5c6d5'; ctx.fillRect(0, 0, W, H);
      for (let d = 80; d > 0; d -= 2) {
        const a = Math.max(.2, d - 2), b = d;
        fq(-LV.half, LV.half, 0, a, b, d % 4 ? '#bbb4a1' : '#b5ae9b');
        wq(-LV.half, 0, upper ? 4.4 : 5.5, a, b, upper ? '#82958b' : '#b78f9f');
        wq(LV.half, 0, upper ? 4.4 : 5.5, a, b, upper ? '#6b8177' : '#917a99');
        for (const x of [-LV.half, LV.half]) {
          wq(x, 1.1, 1.25, a, b, upper ? '#e9dcae' : '#f2c5d8');
          if (d < 40) wq(x, .1, 4, a, Math.min(a + .025, b), upper ? '#556c62' : '#735e7d');
        }
      }
      routeSign(r.name+' · REJOIN AT '+r.exit+' m', 82);
    }
    const d=r.entrance-VZ;
    if (!S.route && d>1&&d<65) {
      if (r.entrance - S.pz < 30) routeSign(r.name+' · RIGHT '+(r.level === 'up' ? 'STAIRS' : 'ALLEY')+' · '+r.difficulty.toUpperCase(), 82);
      for(let i=0;i<10;i++) fq(r.shape.entryX-.65,r.shape.entryX+.65,r.level === 'up' ? i*.06 : .01,d+i*.5,d+(i+1)*.5,i%2?'#eee0a8':'#7b796d');
      const q=P(r.shape.entryX,2,d);label(r.name,q[0],q[1],Math.min(24,F/d*.4),'#ffe08a');
    }
  }
}
