import { R_BODY, R_PLAYER } from '../config/tuning.js';
import { TAU, clamp } from '../config/util.js';
import { ctx } from '../dom.js';
import { touches } from '../input/input.js';
import { DRAW_FAR } from '../config/levels.js';
import { F, H, UI, VZ, W } from './camera.js';
import { W3 } from './draw.js';
import { FONT } from './draw.js';
import { S, cues } from '../sim/state.js';
import { TUT } from '../sim/tutorial.js';



export let radarTop = 120;
   // bottom of the HUD, used to place banners
// (the rear radar was removed 2026-11-06: not useful any more)

export function zoneGuide() {
  const held = { L: false, R: false };
  for (const z of touches.values()) held[z] = true;
  for (const z of ['L', 'R']) {
    const w = W * 0.35, x0 = z === 'L' ? 0 : W - w;
    const g = ctx.createLinearGradient(z === 'L' ? 0 : W, 0, z === 'L' ? w : W - w, 0);
    const tz = S.tut ? TUT[S.tut.step].zone : null;
    const want = tz && (tz === z || tz === 'LR' || tz === 'both');
    const al = held[z] ? 0.32 : want ? 0.22 + 0.18 * Math.sin(S.clock * 6) : 0.10;
    g.addColorStop(0, (held[z] || want) ? 'rgba(255,107,157,' + al.toFixed(2) + ')' : 'rgba(255,255,255,0.10)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x0, H * 0.45, w, H * 0.55);
  }
}

export function drawPops() {
  let y = H * 0.86;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = S.pops.length - 1; i >= 0; i--) {
    const q = S.pops[i], a = clamp(1.3 - q.t, 0, 1), rise = q.t * 26;
    const pop = q.t < 0.12 ? 0.7 + q.t * 2.5 : 1;
    ctx.globalAlpha = a * 0.7;
    ctx.font = '700 ' + Math.round(q.size * 0.72 * pop * UI) + 'px ' + FONT;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(15,27,45,0.7)'; ctx.lineJoin = 'round';
    ctx.strokeText(q.text, W / 2, y - rise);
    ctx.fillStyle = q.color; ctx.fillText(q.text, W / 2, y - rise);
    y -= q.size * 0.8;
  }
  ctx.globalAlpha = 1;
}

// Weave rows: a green path through the gaps, so the pattern is readable from far away and you can plan a line through it.
export function drawFlows() {
  if (!S.flows.length) return;
  S.flows = S.flows.filter(f => f.rows.some(r => r.ref && !r.ref.dead && r.ref.z > S.pz - 1));
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const f of S.flows) {
    const pts = [];
    for (const r of f.rows) { if (!r.ref || r.ref.dead) continue; const z = r.ref.z; if (z < S.pz + 1 || z - VZ > DRAW_FAR - 4) continue; pts.push([r.gx, z]); }
    for (let i = 0; i < pts.length; i++) {
      const [gx, z] = pts[i], a = W3(gx, 0, z), d = a[2];
      const pulse = 0.78 + 0.18 * Math.sin(S.clock * 5 + i);
      ctx.globalAlpha = clamp(1.7 - d / 55, 0.55, 1) * pulse;
      if (i) { const p0 = W3(pts[i - 1][0], 0, pts[i - 1][1]); ctx.strokeStyle = '#5ee6a8'; ctx.lineWidth = Math.max(3, 38 / d); ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(a[0], a[1]); ctx.stroke(); }
      const q = [W3(gx - 0.9, 0, z - 0.7), W3(gx + 0.9, 0, z - 0.7), W3(gx + 0.9, 0, z + 0.7), W3(gx - 0.9, 0, z + 0.7)];
      ctx.fillStyle = '#5ee6a8'; ctx.beginPath(); q.forEach((p, k) => k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill();
      const t = W3(gx, 2.2, z), r = Math.max(7, 0.5 * F / d);
      ctx.fillStyle = '#5ee6a8'; ctx.strokeStyle = 'rgba(15,27,45,0.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(t[0] - r, t[1] - r * 0.8); ctx.lineTo(t[0] + r, t[1] - r * 0.8); ctx.lineTo(t[0], t[1] + r * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  ctx.restore();
}

export function setRadarTop(v) { radarTop = v; }
