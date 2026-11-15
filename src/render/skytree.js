// Skytree Sky Walk, the sky deck: a glass gallery high over Tokyo at dusk. On the right the whole city lies far below, with Fuji on
// the horizon and the tower's white lattice outside the glass; on the left a wall of lit exhibits. Tokyo's neon family.
import { ctx } from '../dom.js';
import { stylePause, styleResume } from './style.js';
import { hex } from '../config/colour.js';
import { LV } from '../config/levels.js';
import { CX, H, HOR, VX, VZ, W } from './camera.js';
import { P, box3D, forSegs, fq, wq } from './draw.js';
import { hsh, wallText, wqA } from './scenery.js';
import { S, goalOf } from '../sim/state.js';
import { backdrop, col, goalGate, line3, nearFade, span, stars } from './stagekit.js';

const EXHIBITS = [['634 m', '#ff5fc4'], ['東京', '#5ffbf1'], ['SKYTREE', '#fff06a'], ['TEMBO', '#c08bff']];
const DROP = 90, BLOCK = 50;   // how far below the deck the streets are, and the size of a city block

// Mount Fuji on the horizon, seen through the glass on the right.
function fuji() {
  const x = CX + W * 0.27 - VX * 1.5, w = W * 0.2, top = HOR - H * 0.062, cap = top + H * 0.02;
  ctx.fillStyle = '#3a2466';
  ctx.beginPath(); ctx.moveTo(x - w, HOR); ctx.lineTo(x - w * 0.16, top); ctx.lineTo(x + w * 0.16, top); ctx.lineTo(x + w, HOR); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd9e0';
  ctx.beginPath(); ctx.moveTo(x - w * 0.16, top); ctx.lineTo(x + w * 0.16, top); ctx.lineTo(x + w * 0.4, cap); ctx.lineTo(x + w * 0.2, cap - H * 0.006); ctx.lineTo(x, cap); ctx.lineTo(x - w * 0.2, cap - H * 0.006); ctx.lineTo(x - w * 0.4, cap); ctx.closePath(); ctx.fill();
}

// The city far below the right-hand glass: a grid of lit streets running to the horizon, and the lights of its buildings.
function city(h) {
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,186,110,0.5)'; ctx.beginPath();
  const z0 = Math.ceil((VZ + 70) / BLOCK) * BLOCK;
  for (let z = z0; z < VZ + 1500; z += BLOCK) { const a = P(h + 12, -DROP, z - VZ), b = P(950, -DROP, z - VZ); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
  for (let x = h + 12; x < 950; x += BLOCK) { const a = P(x, -DROP, 70), b = P(x, -DROP, 1500); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
  ctx.stroke();
  for (let z = z0; z < VZ + 760; z += BLOCK) for (let i = 0; i < 12; i++) {
    const zi = z / BLOCK, r = hsh(zi, i);
    if (r < 0.35) continue;
    const q = P(h + 12 + (i + 0.2 + 0.6 * hsh(zi, i + 40)) * BLOCK, -DROP, z - VZ + BLOCK * (0.2 + 0.6 * hsh(zi, i + 80))), s = z - VZ < 300 ? 3 : 2;
    ctx.fillStyle = r > 0.86 ? '#ff5fc4' : r > 0.7 ? '#5ffbf1' : '#ffd98a';
    ctx.fillRect(q[0], q[1], s, s);
  }
}

export function paintSkytree() {
  const was = stylePause(), h = LV.half;
  backdrop([[0, '#0b0f2e'], [0.5, '#2a1a5e'], [0.8, '#a8357d'], [0.93, '#ff7a59'], [1, '#ffc46b']], '#120e2e');
  stars(40, 7, HOR * 0.55, VX * 2);
  fuji();
  city(h);
  // the tower's lattice: white tubes crossing outside the glass
  for (let z = Math.floor((VZ + 96) / 12) * 12; z > VZ - 12; z -= 12) {
    const d0 = z - VZ, d1 = d0 + 12;
    if (d0 < 1.5) continue;
    line3(h + 2.6, -8, d0, h + 2.6, 13, d1, col('#d9defa', d0), 0.5);
    line3(h + 2.6, 13, d0, h + 2.6, -8, d1, col('#b9c0ee', d0), 0.5);
  }
  forSegs(6, 100, (k, za, zb, a, b) => {
    fq(-h, h, 0, a, b, col(k % 2 ? '#2d3166' : '#292c5c', a));
    for (const x of [-h + 0.18, h - 0.3]) fq(x, x + 0.12, 0.004, a, b, col('#5ffbf1', a));   // guide lights along both edges
    // left: a wall of lit exhibits
    wq(-h, 0, 4.2, a, b, col('#1a1c46', a));
    const ex = EXHIBITS[(k % 4 + 4) % 4];
    span(za + 0.5, zb - 0.5, (p, q) => {
      wq(-h + 0.01, 1.0, 2.9, p, q, col('#262a66', p));
      for (const y of [1.0, 2.84]) wq(-h + 0.02, y, y + 0.06, p, q, col(ex[1], p));
    });
    wallText(ex[0], -h + 0.04, 1.95, za + 3, 0.75, ex[1], -1);
    liftDoors(h, za, zb);
    // right: floor-to-ceiling glass with a handrail
    wqA(h, 0, 4.2, a, b, col('#7fd8ff', a), 0.1);
    for (const [y0, y1] of [[0, 0.12], [1.05, 1.13], [4.05, 4.2]]) wq(h, y0, y1, a, b, col('#e9ecff', a));
    box3D(h - 0.05, h + 0.05, 0, 4.2, za - 0.05, za + 0.05, hex('#e9ecff'));
    const f = nearFade(za - VZ, 5, 5);   // a rib of the glass roof, gone before it passes overhead
    if (f > 0) { ctx.globalAlpha = f; box3D(-h, h, 4.2, 4.32, za - 0.06, za + 0.06, hex('#c9cdfa')); ctx.globalAlpha = 1; }
  });
  goalGate(goalOf(), h, 4.2, '#e9ecff', '#262a66', LV.goalText, '#5ffbf1', box3D);
  styleResume(was);
}

// Lift arrivals (sim/people.js, event 'lift'): a lit lift door in the exhibit wall where each passenger comes out. The doors stand
// open, warm light inside, from just before someone steps out until they are clear; otherwise shut, with a lit frame. Drawing only.
// Drawn with the wall segment the door is in, so nearer scenery still covers it.
function liftDoors(h, za, zb) {
  for (const l of (S && S.lifts) || []) {
    if (l.z < za || l.z >= zb || l.z - VZ < 1.5 || l.z - VZ > 90) continue;
    const open = S.time > l.out - 1.2 && S.time < l.out + 1.5;
    span(Math.max(za, l.z - 0.75), Math.min(zb, l.z + 0.75), (p, q) => {
      wq(-h + 0.03, 0, 2.5, p, q, col('#5ffbf1', p));                           // the lit frame
      wq(-h + 0.04, 0, 2.38, p + 0.08, q - 0.08, col(open ? '#ffe7a8' : '#c9cdfa', p));
    });
    if (!open) span(l.z - 0.02, l.z + 0.02, (p, q) => wq(-h + 0.05, 0, 2.38, p, q, col('#7a7fb8', p)));   // where the two doors meet
    span(l.z - 0.3, l.z + 0.3, (p, q) => wq(-h + 0.04, 2.6, 2.8, p, q, col(open ? '#fff06a' : '#262a66', p)));   // the arrival light
  }
}
