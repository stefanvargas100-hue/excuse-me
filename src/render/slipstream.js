import { LV } from '../config/levels.js';
import { stripHasZ, stripLane } from '../config/strips.js';
import { clamp } from '../config/util.js';
import { ctx } from '../dom.js';
import { F, VZ } from './camera.js';
import { W3 } from './draw.js';
import { draftCharge } from '../sim/race.js';
import { S, state } from '../sim/state.js';

/* ---------- slipstream: wind lines that build around you while you draft, like Mario Kart ---------- */
// Faint lines stream off the person ahead and past you. The longer you hold it and the closer you are, the more
// lines there are and the bigger they get, until the wind wraps around you and the boost fires.
// Bots get the same wind, so you can see a rival charging up on your tail.
const BURST_LEN = 0.45;    // seconds for the ring that marks the boost firing
const FADE_LEN = 0.7;      // the wind dies away over the last of the boost
const frac = v => v - Math.floor(v);

function windFor(r, x0, z0, scale) {
  const on = r.draftT > 0, charge = draftCharge(r);
  if (!on && charge < 0.03) return;
  const power = on ? clamp(r.draftT / FADE_LEN, 0, 1) : charge * (0.55 + 0.45 * r.draftNear);
  // while charging the wind comes off whoever is in front; during the boost it surrounds the runner
  const fromX = on ? x0 : r.draftX, fromZ = on ? z0 + 6 : r.draftZ, toZ = z0 - 1.2;
  const count = Math.round((5 + 25 * power) * scale), radius = 0.28 + 0.62 * power, flow = 0.5 + 0.7 * power, len = 0.5 + 2.4 * power;
  for (let i = 0; i < count; i++) {
    const u = frac(S.clock * flow + i * 0.381), ang = i * 2.399, wob = 0.8 + 0.2 * Math.sin(i * 1.7);
    const z = fromZ + (toZ - fromZ) * u, cx = fromX + (x0 - fromX) * u;
    const x = cx + Math.cos(ang) * radius * wob, y = Math.max(0.06, 0.95 + Math.sin(ang) * radius * wob * 1.1);
    const z2 = z - len;
    if (z2 - VZ < 1.4) continue;
    const a = W3(x, y, z), b = W3(x, y, z2), fadeIn = Math.sin(Math.PI * u) * clamp((z2 - VZ - 1) / 1.4, 0, 1);
    ctx.globalAlpha = clamp(fadeIn * (0.3 + 0.7 * power), 0, 1);
    // a thin lens shape: pointed at both ends, like a line of moving air
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, half = Math.min(3.2, (0.006 + 0.016 * power) * F / b[2]);
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, nx = -dy / d * half, ny = dx / d * half;
    ctx.fillStyle = i % 3 === 0 ? '#ffffff' : '#7fd0ff';
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(mx + nx, my + ny); ctx.lineTo(b[0], b[1]); ctx.lineTo(mx - nx, my - ny); ctx.closePath(); ctx.fill();
  }
}

export function drawSlipstream() {
  if (!S.race || state !== 'play') return;
  for (const b of S.race.bots) if (!b.done && b.z - VZ > 2 && b.z - VZ < 45) windFor(b, b.x, b.z, 0.5);
  windFor(S, S.px, S.pz, 1);
  const age = S.draftT > 0 ? S.draftFull - S.draftT : 99;
  if (age < BURST_LEN) {   // the moment it fires: a ring of wind bursts outward from you
    const t = age / BURST_LEN, c = W3(S.px, 0.95, S.pz), s = F / c[2];
    ctx.globalAlpha = 1 - t; ctx.strokeStyle = '#7fd0ff'; ctx.lineWidth = Math.max(2, 0.09 * s * (1 - t));
    ctx.beginPath(); ctx.ellipse(c[0], c[1], (0.4 + 1.6 * t) * s, (0.5 + 1.5 * t) * s, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// Fast strips: painted chevrons on the floor that run ahead of you, drawn under the people.
export function drawStrips() {
  const L = S.race ? stripLane(LV.id) : null;
  if (!L) return;
  const mid = (L.x0 + L.x1) / 2, step = 1.6, first = Math.floor((VZ + 1.5) / step) * step;
  ctx.fillStyle = L.col;
  for (let z = first; z < VZ + 42; z += step) {
    if (!stripHasZ(L, z)) continue;
    ctx.globalAlpha = clamp((VZ + 42 - z) / 14, 0, 0.75);
    const p = [W3(L.x0, 0.01, z), W3(mid, 0.01, z + 0.55), W3(L.x1, 0.01, z), W3(L.x1, 0.01, z + 0.35), W3(mid, 0.01, z + 0.9), W3(L.x0, 0.01, z + 0.35)];
    ctx.beginPath(); p.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
