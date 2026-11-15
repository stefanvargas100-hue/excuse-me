// Baggage Claim, the cargo bay: carousels run down the left behind a yellow-and-navy hazard kerb, and through the bay windows beyond
// them cargo shuttles sit docked against the stars. The Airport's space family. The bags that spill across are drawn with the people.
import { ctx } from '../dom.js';
import { stylePause, styleResume } from './style.js';
import { hex } from '../config/colour.js';
import { LV } from '../config/levels.js';
import { CX, F, H, VX, VZ, W } from './camera.js';
import { P, box3D, cq, forSegs, fq, label, wq } from './draw.js';
import { wallText, wqA } from './scenery.js';
import { S, calm, goalOf } from '../sim/state.js';
import { col, goalGate, nearFade, span, stars } from './stagekit.js';

const BAGS = ['#ff5a47', '#3aa0ff', '#3ddc84', '#b06bff', '#ffb347', '#f4f6fb'];
const BELT = 3.2, BAY = 3.4;   // the carousel belt beside the walkway, and the bay wall behind it

// a freighter holding station over the glass roof: one long hull with a lit row of windows
function freighter() {
  const w = W * 0.66, t = H * 0.075, x = CX - VX * 4 - w * 0.5, y = H * 0.07;
  ctx.fillStyle = '#17223d'; ctx.fillRect(x + w - t * 0.2, y + t * 0.15, t * 0.5, t * 0.7);                               // engine bells
  ctx.fillStyle = '#5fd0ff'; ctx.fillRect(x + w + t * 0.3, y + t * 0.3, t * 0.35, t * 0.4);
  ctx.fillStyle = '#9aa7c2'; ctx.beginPath(); ctx.moveTo(x, y + t * 0.5); ctx.lineTo(x + t, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + t); ctx.lineTo(x + t, y + t); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6f7f9e'; ctx.fillRect(x + t, y + t * 0.68, w - t, t * 0.32);
  ctx.fillStyle = '#ff9a3c'; ctx.fillRect(x + t, y + t * 0.56, w - t, t * 0.12);
  ctx.fillStyle = '#ffe9a8'; for (let i = 0; i < 11; i++) ctx.fillRect(x + t * 1.3 + i * (w - t * 1.8) / 11, y + t * 0.22, (w - t * 1.8) / 11 * 0.55, t * 0.16);
}

// a cargo shuttle docked outside the bay windows, every 36 m
function shuttle(z, h) {
  if (z + 18 - VZ < 2 || z - VZ > 110) return;
  const x0 = -h - 12, x1 = -h - 6.5;
  box3D(x0, x1, 0.6, 3.4, z, z + 15, hex('#e6ebf5'));
  box3D(x1 - 0.02, x1 + 0.03, 1.7, 2.1, z, z + 15, hex('#ff9a3c'));           // the stripe down its side
  box3D(x1 - 0.02, x1 + 0.04, 2.4, 2.9, z + 11, z + 14, hex('#17223d'));      // cockpit glass
  box3D(x0 + 1.5, x1 - 1.5, 3.4, 5.2, z + 0.5, z + 3.5, hex('#c9d1e2'));      // tail fin
}

export function paintBaggage() {
  const was = stylePause(), h = LV.half, run = calm || !S ? 0 : (S.clock || 0) * 0.8;
  ctx.fillStyle = '#070b1d'; ctx.fillRect(-W, -H, 3 * W, 3 * H);
  stars(70, 33, H * 0.7, VX * 3);
  freighter();
  forSegs(6, 100, (k, za, zb, a, b) => {
    if (((k % 6) + 6) % 6 === 0) shuttle(za, h);
    fq(-h - BAY, -2.2, 4.6, a, b, col('#a3aec4', a)); fq(2.2, h, 4.6, a, b, col('#a3aec4', a));   // the ceiling, either side of the glass roof
    for (const x of [-4.4, 4.4]) span(za + 1, zb - 1, (p, q) => { if (p > 6) fq(x - 0.2, x + 0.2, 4.59, p, q, col('#f4faff', p)); });   // light panels
    box3D(-2.2, 2.2, 4.5, 4.66, za - 0.07, za + 0.07, hex('#c6d0e2'));   // a rib of the glass roof
    fq(-h, h, 0, a, b, col(k % 2 ? '#8c93a0' : '#838a98', a));
    // the bay wall behind the carousel: hull below and above a long window
    const xw = -h - BAY;
    wq(xw, 0, 1.3, a, b, col('#5f6f8f', a)); wqA(xw, 1.3, 3.2, a, b, col('#9fdcff', a), 0.1); wq(xw, 3.2, 4.6, a, b, col('#b4c0d4', a));
    box3D(xw - 0.14, xw + 0.14, 1.3, 3.2, za - 0.18, za + 0.18, hex('#c6d0e2'));
    // the carousel: a dark belt at knee height, its rim, and bags riding it toward you
    fq(-h - BELT, -h, 0.55, a, b, col('#232a3d', a));
    box3D(-h, -h + 0.2, 0, 0.6, za, zb, hex('#59647d'));
    for (let j = 0; j < 2; j++) {
      const bz = zb - ((j * 3.1 + k * 1.7 + run) % 6 + 6) % 6, w = 0.34 + 0.1 * ((k + j) % 3);
      if (bz - 0.5 > za) box3D(-h - 1.6 - w + j * 0.9, -h - 1.6 + w + j * 0.9, 0.55, 0.95 + 0.12 * j, bz - 0.5, bz, hex(BAGS[((k * 2 + j) % 6 + 6) % 6]));
    }
    // hazard kerb along the carousel side of the walkway: this is where the bags come from
    for (let j = 0; j < 4; j++) span(za + j * 1.5, za + j * 1.5 + 1.5, (p, q) => fq(-h + 0.2, -h + 0.5, 0.004, p, q, col(j % 2 ? '#ffc233' : '#1c2440', p)));
    // the right-hand wall: plain hull with arrivals boards
    wq(h, 0, 4.6, a, b, col('#b4c0d4', a)); wq(h, 0, 0.9, a, b, col('#5f6f8f', a));
    if (k % 2) { span(za + 1, zb - 1, (p, q) => wq(h - 0.01, 1.6, 2.9, p, q, col('#17223d', p))); wallText('ARRIVALS', h - 0.03, 2.25, za + 3, 0.6, '#ffc233', 1); }
    // the number of the carousel, hung over the belt
    const d = za + 3 - VZ, f = nearFade(d, 4, 3);
    if (k % 2 === 0 && d < 70 && f > 0) {
      ctx.globalAlpha = f;
      cq(-h - 2.9, -h - 0.5, 3.3, 4.1, d, col('#17223d', d));
      const q = P(-h - 1.7, 3.7, d); label('CAROUSEL ' + ((((k / 2) % 9) + 9) % 9 + 1), q[0], q[1], Math.min(22, F / d * 0.36), '#ffc233');
      ctx.globalAlpha = 1;
    }
  });
  goalGate(goalOf(), h, 4.2, '#c6d0e2', '#243353', LV.goalText, '#ffc233', box3D);
  styleResume(was);
}
