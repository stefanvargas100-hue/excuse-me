// Security Lanes, the checkpoint deck: a bright station deck under a glass roof, with a cratered moon hanging over it and
// windows on both sides looking out on the stars. The Airport's space family. Ropes, lane lights and scanner gates are drawn with the people.
import { ctx } from '../dom.js';
import { stylePause, styleResume } from './style.js';
import { hex } from '../config/colour.js';
import { TAU } from '../config/util.js';
import { LV } from '../config/levels.js';
import { CX, H, VX, W } from './camera.js';
import { box3D, forSegs, fq, wq } from './draw.js';
import { wallText, wqA } from './scenery.js';
import { goalOf } from '../sim/state.js';
import { col, goalGate, span, stars } from './stagekit.js';

const CRATERS = [[-0.35, -0.3, 0.16], [0.25, -0.45, 0.1], [0.4, 0.1, 0.2], [-0.1, 0.25, 0.12], [-0.55, 0.2, 0.08], [0.05, -0.1, 0.07], [0.3, 0.55, 0.09]];
function moon() {
  const x = CX + W * 0.2 - VX * 4, y = H * 0.11, r = W * 0.36;
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
  ctx.fillStyle = '#c3c8da'; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  ctx.fillStyle = '#8b90ab'; ctx.beginPath(); ctx.arc(x + r * 1.25, y + r * 0.3, r * 1.3, 0, TAU); ctx.fill();   // the shaded side, with a hard edge
  ctx.fillStyle = '#a4a9c2';
  for (const [cx, cy, cr] of CRATERS) { ctx.beginPath(); ctx.ellipse(x + cx * r, y + cy * r, cr * r, cr * r * 0.8, 0.3, 0, TAU); ctx.fill(); }
  ctx.restore();
}

export function paintSecurity() {
  const was = stylePause(), h = LV.half;
  ctx.fillStyle = '#060a1c'; ctx.fillRect(-W, -H, 3 * W, 3 * H);
  stars(80, 21, H * 0.6, VX * 3);
  moon();
  forSegs(6, 100, (k, za, zb, a, b) => {
    fq(-h, h, 0, a, b, col(k % 2 ? '#8a96ab' : '#808ca2', a));
    for (const side of [-1, 1]) {
      const x = side * h, in2 = side * 2.2;
      wq(x, 0, 1.2, a, b, col('#5f6f8f', a));
      wq(x, 0, 0.14, a, b, col('#ffb347', a));           // an amber line along the foot of the hull
      wqA(x, 1.2, 3.0, a, b, col('#9fdcff', a), 0.1);    // the window
      wq(x, 3.0, 4.4, a, b, col('#b4c0d4', a));
      box3D(x - 0.12, x + 0.12, 1.2, 3.0, za - 0.15, za + 0.15, hex('#c6d0e2'));
      wallText(k % 2 ? 'SECURITY' : 'NO LIQUIDS', x - side * 0.03, 3.7, za + 3, 0.62, k % 2 ? '#0b7f93' : '#b3541e', side);
      fq(Math.min(x, in2), Math.max(x, in2), 4.4, a, b, col('#a3aec4', a));   // the ceiling, either side of the glass roof
      span(za + 1, zb - 1, (p, q) => { if (p > 6) fq(side * 4.1 - 0.2, side * 4.1 + 0.2, 4.39, p, q, col('#f4faff', p)); });   // a light panel
    }
    box3D(-2.2, 2.2, 4.3, 4.46, za - 0.07, za + 0.07, hex('#c6d0e2'));   // a rib of the glass roof
  });
  goalGate(goalOf(), h, 4.2, '#c6d0e2', '#243353', LV.goalText, '#5ffbf1', box3D);
  styleResume(was);
}
