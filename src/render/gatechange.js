// Gate Change Rush, the launch concourse: a long low-orbit concourse with the horizon of the home planet passing the windows. Gates and
// their rockets line the left, departure boards the right, and the gate numbers count up to the one you are running for.
// The Airport's space family.
import { ctx } from '../dom.js';
import { stylePause, styleResume } from './style.js';
import { hex } from '../config/colour.js';
import { TAU } from '../config/util.js';
import { LV } from '../config/levels.js';
import { CX, F, H, HOR, VX, VZ, W } from './camera.js';
import { P, box3D, cq, forSegs, fq, label, poly, wq } from './draw.js';
import { wallText, wqA } from './scenery.js';
import { goalOf } from '../sim/state.js';
import { col, goalGate, nearFade, orb, span, stars } from './stagekit.js';

const GATE_EVERY = 3;   // a gate every third 6 m bay
const lastGate = () => { const m = /(\d+)\s*$/.exec(LV.goalText || ''); return m ? +m[1] : 40; };
// The gate numbers count up along the concourse and reach the number of the goal at the finish.
const gateNumber = k => lastGate() - Math.max(0, Math.floor((Math.floor(LV.goal / 6) - 1 - k) / GATE_EVERY));

// the home planet, so close that only its curved horizon shows through the windows
function planet() {
  const x = CX - VX * 3, r = H * 1.5, y = HOR - H * 0.022 + r;
  ctx.fillStyle = '#2b7fd8'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#a8e4ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
  ctx.fillStyle = '#e9f6ff';
  for (const [dx, dy, w] of [[-0.42, 0.03, 0.2], [0.1, 0.018, 0.26], [0.5, 0.04, 0.16], [-0.12, 0.05, 0.12]]) { ctx.beginPath(); ctx.ellipse(x + dx * W, y - r + dy * H, w * W, H * 0.008, 0, 0, TAU); ctx.fill(); }
}

// a rocket that has just left its gate, climbing away over the glass roof
function departing() {
  const u = W * 0.045;
  ctx.save(); ctx.translate(CX + W * 0.1 - VX * 4, H * 0.1); ctx.rotate(-0.55);
  ctx.fillStyle = '#ffc233'; ctx.beginPath(); ctx.moveTo(-u * 0.55, u * 1.6); ctx.lineTo(0, u * 3.6); ctx.lineTo(u * 0.55, u * 1.6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ff5a47';
  ctx.beginPath(); ctx.moveTo(-u * 1.4, u * 1.7); ctx.lineTo(-u * 0.7, u * 0.2); ctx.lineTo(-u * 0.7, u * 1.7); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(u * 1.4, u * 1.7); ctx.lineTo(u * 0.7, u * 0.2); ctx.lineTo(u * 0.7, u * 1.7); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-u * 0.7, -u * 1.6); ctx.lineTo(0, -u * 3); ctx.lineTo(u * 0.7, -u * 1.6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#eef2fb'; ctx.fillRect(-u * 0.7, -u * 1.6, u * 1.4, u * 3.3);
  ctx.fillStyle = '#17223d'; ctx.beginPath(); ctx.arc(0, -u * 0.5, u * 0.36, 0, TAU); ctx.fill();
  ctx.fillStyle = '#5fd0ff'; ctx.beginPath(); ctx.arc(0, -u * 0.5, u * 0.25, 0, TAU); ctx.fill();
  ctx.restore();
}

// a rocket standing at its gate outside the left windows: white body, red nose and fins, one round window
function rocket(z, h) {
  const d = z - VZ; if (d < 3 || d > 100) return;
  const x = -h - 7;
  poly([[x - 2.1, -2, d], [x - 1.0, 1.5, d], [x - 1.0, -2, d]], col('#ff5a47', d), true);
  poly([[x + 2.1, -2, d], [x + 1.0, 1.5, d], [x + 1.0, -2, d]], col('#ff5a47', d), true);
  cq(x - 1.1, x + 1.1, -2, 5.6, d, col('#eef2fb', d));
  cq(x - 1.1, x + 1.1, 3.6, 4.0, d, col('#ff5a47', d));
  poly([[x - 1.1, 5.6, d], [x, 8.4, d], [x + 1.1, 5.6, d]], col('#ff5a47', d), true);
  orb(x, 2.6, d, 0.5, 0.5, col('#17223d', d)); orb(x, 2.6, d, 0.36, 0.36, col('#5fd0ff', d));
}

export function paintGateChange() {
  const was = stylePause(), h = LV.half;
  ctx.fillStyle = '#060a1c'; ctx.fillRect(-W, -H, 3 * W, 3 * H);
  stars(80, 55, HOR * 0.9, VX * 3);
  planet();
  departing();
  forSegs(6, 100, (k, za, zb, a, b) => {
    const g = ((k % GATE_EVERY) + GATE_EVERY) % GATE_EVERY;
    if (g === 1) rocket(za + 3, h);
    fq(-h, -2.2, 4.6, a, b, col('#a3aec4', a)); fq(2.2, h, 4.6, a, b, col('#a3aec4', a));   // the ceiling, either side of the glass roof
    for (const x of [-4.1, 4.1]) span(za + 1, zb - 1, (p, q) => { if (p > 6) fq(x - 0.2, x + 0.2, 4.59, p, q, col('#f4faff', p)); });   // light panels
    box3D(-2.2, 2.2, 4.5, 4.66, za - 0.07, za + 0.07, hex('#c6d0e2'));   // a rib of the glass roof
    fq(-h, h, 0, a, b, col(k % 2 ? '#8a94aa' : '#818ba2', a));
    fq(-0.07, 0.07, 0.01, a, b, col('#f0c63c', a));   // the guide line down the middle
    for (const side of [-1, 1]) {
      const x = side * h;
      wq(x, 0, 1.0, a, b, col('#5f6f8f', a)); wqA(x, 1.0, 3.4, a, b, col('#9fdcff', a), 0.1); wq(x, 3.4, 4.6, a, b, col('#b4c0d4', a));
      box3D(x - 0.12, x + 0.12, 1.0, 3.4, za - 0.15, za + 0.15, hex('#c6d0e2'));
    }
    if (g === 0) {   // a gate: its door, a lit frame and its number
      span(za + 1.5, za + 4.5, (p, q) => { wq(-h + 0.01, 0, 2.7, p, q, col('#17223d', p)); wq(-h + 0.02, 2.6, 2.7, p, q, col('#19d3e6', p)); });
      span(za + 0.8, za + 5.2, (p, q) => wq(-h + 0.01, 2.8, 3.4, p, q, col('#17223d', p)));
      wallText('GATE C' + gateNumber(k), -h + 0.03, 3.1, za + 3, 0.42, '#ffc233', -1);
    }
    if (g === 2) {   // a departures board: rows of flights, the delayed one in pink
      span(za + 1, zb - 1, (p, q) => {
        wq(h - 0.01, 1.3, 3.3, p, q, col('#17223d', p));
        for (let j = 0; j < 4; j++) { const q1 = q - 0.3 - (j % 2) * 0.8; if (q1 > p + 0.4) wq(h - 0.02, 1.55 + j * 0.3, 1.67 + j * 0.3, p + 0.3, q1, col(j === 1 ? '#ff5fb0' : '#4be38a', p)); }
      });
      wallText('DEPARTURES', h - 0.03, 3.0, za + 3, 0.34, '#ffc233', 1);
    }
    // overhead: the way to the gate everyone is running for
    const d = za - VZ, f = nearFade(d, 5, 4);
    if (((k % 6) + 6) % 6 === 3 && d < 80 && f > 0) {
      ctx.globalAlpha = f;
      cq(-1.5, 1.5, 3.7, 4.4, d, col('#17223d', d));
      const q = P(0, 4.05, d); label(LV.goalText + ' ↑', q[0], q[1], Math.min(22, F / d * 0.4), '#ffc233');
      ctx.globalAlpha = 1;
    }
  });
  goalGate(goalOf(), h, 4.2, '#c6d0e2', '#243353', LV.goalText, '#ffc233', box3D);
  styleResume(was);
}
