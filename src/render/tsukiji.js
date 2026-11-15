// Tsukiji Outer Market, the lantern market: a narrow alley at night between lit stalls, under striped awnings and rows of paper lanterns.
// Tokyo's neon family. The walkway is the wet concrete between the two painted kerb lines; everything else stands beyond them.
import { ctx } from '../dom.js';
import { stylePause, styleResume } from './style.js';
import { hex, scl } from '../config/colour.js';
import { LV, mixc } from '../config/levels.js';
import { TAU } from '../config/util.js';
import { CX, H, HOR, VX, VZ, W } from './camera.js';
import { box3D, forSegs, fq, poly, wq } from './draw.js';
import { wallText } from './scenery.js';
import { goalOf } from '../sim/state.js';
import { col, goalGate, line3, nearFade, orb, span, stars } from './stagekit.js';

// what each stall sells: its sign, the two colours of its awning, and the goods on its counter
const STALLS = [
  ['まぐろ', '#e5484d', '#f6e7c1', ['#e5484d', '#c2364a', '#f29a9a']],
  ['すし', '#27407a', '#f6e7c1', ['#f6e7c1', '#ff8a5c', '#e5484d']],
  ['たまご', '#f2b233', '#f6e7c1', ['#ffd166', '#f2b233', '#ffe9a8']],
  ['えび', '#e5484d', '#27407a', ['#ff8a5c', '#ffb199', '#f6e7c1']],
  ['お茶', '#2e7d5b', '#f6e7c1', ['#2e7d5b', '#8fd1a9', '#f6e7c1']],
  ['かに', '#c2364a', '#f6e7c1', ['#e5484d', '#ff8a5c', '#c2364a']]
];
const SEG = 4, DEEP = 1.9;   // one stall per 4 m, set back 1.9 m from the kerb

export function paintTsukiji() {
  const was = stylePause(), h = LV.half;
  ctx.fillStyle = '#0a1424'; ctx.fillRect(-W, -H, 3 * W, 3 * H);
  stars(26, 61, HOR * 0.5, VX * 2);
  ctx.fillStyle = '#f6e7c1'; ctx.beginPath(); ctx.arc(CX - W * 0.24 - VX * 3, H * 0.1, W * 0.05, 0, TAU); ctx.fill();   // a full moon over the roofs
  forSegs(SEG, 100, (k, za, zb, a, b) => {
    fq(-h, h, 0, a, b, col(k % 2 ? '#25394b' : '#203345', a));
    for (const side of [-1, 1]) {
      const st = STALLS[((k + (side > 0 ? 3 : 0)) % 6 + 6) % 6], x = side * h, xb = side * (h + DEEP), X = u => x + side * u;
      const lo = (p, q) => Math.min(p, q), hi = (p, q) => Math.max(p, q);
      fq(lo(x, xb), hi(x, xb), 0, a, b, col('#16222f', a));
      fq(lo(x, X(0.12)), hi(x, X(0.12)), 0.005, a, b, col('#e9d9a6', a));   // the kerb line: the edge of the walkway
      // the shophouse behind: dark upper floors with a few lit windows, and the stall's lit opening
      wq(xb, 0, 10, a, b, col('#111d2c', a));
      span(za + 0.3, zb - 0.3, (p, q) => {
        wq(xb - side * 0.01, 0.8, 2.6, p, q, col('#f2b45a', p));
        for (const y of [1.36, 1.96]) wq(xb - side * 0.02, y, y + 0.07, p, q, col('#8a5a2b', p));
      });
      for (let j = 0; j < 4; j++) span(za + 0.6 + (j % 2) * 1.8, za + 1.6 + (j % 2) * 1.8, (p, q) => wq(xb - side * 0.01, 4.7 + (j >> 1) * 2.2, 5.7 + (j >> 1) * 2.2, p, q, col((k * 3 + j * 2 + (side > 0 ? 1 : 0)) % 4 ? '#1c2b40' : '#ffd98a', p)));
      // the sign over the awning
      span(za + 0.5, zb - 0.5, (p, q) => wq(xb - side * 0.02, 3.35, 4.15, p, q, col('#f6e7c1', p)));
      wallText(st[0], xb - side * 0.04, 3.75, za + SEG / 2, 0.55, '#1b2433', side);
      // the counter: crates of ice, and what the stall sells laid out on top
      box3D(lo(X(0.3), X(1.1)), hi(X(0.3), X(1.1)), 0, 0.8, za + 0.35, zb - 0.35, hex('#dfeaf2'));
      for (let j = 0; j < 3; j++) box3D(lo(X(0.42), X(0.98)), hi(X(0.42), X(0.98)), 0.8, 0.94, za + 0.55 + j * 1.05, za + 1.35 + j * 1.05, hex(st[3][j]));
      box3D(X(0) - 0.06, X(0) + 0.06, 0, 2.62, za - 0.06, za + 0.06, hex('#3b2a26'));   // awning post
      // the awning: four stripes sloping down from the wall to just past the kerb, all above head height
      for (let j = 0; j < 4; j++) span(za + j, za + j + 1, (p, q) => poly([[xb, 3.2, p], [X(-0.35), 2.62, p], [X(-0.35), 2.62, q], [xb, 3.2, q]], col(st[j % 2 ? 2 : 1], p), true));
      wq(X(-0.35), 2.34, 2.62, a, b, mixc(scl(hex(st[1]), 0.78), a));
    }
    // a row of paper lanterns strung across the alley every other stall
    const d = za - VZ, f = nearFade(d);
    if (k % 2 === 0 && d < 84 && f > 0) {
      ctx.globalAlpha = f;
      line3(-h - 0.4, 3.78, d, h + 0.4, 3.78, d, col('#0b121d', d), 0.03);
      for (const lx of [-3, -1.5, 0, 1.5, 3]) {
        orb(lx, 3.42, d, 0.2, 0.28, col('#ff5a47', d));
        orb(lx, 3.42, d, 0.2, 0.07, col('#ffe2a0', d));
        orb(lx, 3.71, d, 0.09, 0.04, col('#1b1410', d)); orb(lx, 3.13, d, 0.09, 0.04, col('#1b1410', d));
      }
      ctx.globalAlpha = 1;
    }
  });
  goalGate(goalOf(), h, 4.4, '#c2364a', '#f6e7c1', LV.goalText, '#7a1f2b', box3D);
  styleResume(was);
}
