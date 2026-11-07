/* Feedback effects drawn on top of the game: footstep puffs and splashes, the multiplier glow, the screen shake and broken chain
   when a chain ends, and confetti when you win. Render only: the particles live here, not in the simulation, and nothing uses
   Math.random (the simulation may draw from it), so drawing never changes a run. */
import { MULT_COLS, hex } from '../config/colour.js';
import { LV } from '../config/levels.js';
import { TAU } from '../config/util.js';
import { ctx } from '../dom.js';
import { F, H, VZ, W } from './camera.js';
import { W3 } from './draw.js';
import { hsh } from './scenery.js';
import { variantOf } from './weather.js';
import { S, calm, state } from '../sim/state.js';

const puffs = [], lastStep = new WeakMap(), MAX = 48;
let run = null, seq = 0;

// a foot lands: a little puff of dust, or a splash on a wet street
function stepFor(p, speed, burst) {
  const n = Math.floor(p.phase / Math.PI);
  const was = lastStep.get(p); lastStep.set(p, n);
  if (was === undefined || was === n || speed < 2.4) return;
  const side = n % 2 ? 1 : -1, rx = p.fz, rz = -p.fx;
  if (puffs.length >= MAX) puffs.shift();
  puffs.push({ x: p.x + rx * side * 0.1 - p.fx * 0.18, z: p.z + rz * side * 0.1 - p.fz * 0.18, t: S.clock, k: seq++, big: burst ? 1.6 : 1 });
}

export function fxGround() {
  if (S !== run) { run = S; puffs.length = 0; }
  if (calm || !S.me) return;
  const rain = variantOf() === 'rain';
  if (S.live) {
    stepFor(S.me, S.speed, S.burstT > 0);
    if (S.race) for (const b of S.race.bots) if (b.z - VZ < 30 && !b.done) stepFor(b, b.speed || 0, b.burstT > 0);
  }
  const life = rain ? 0.55 : 0.45;
  for (let i = puffs.length - 1; i >= 0; i--) {
    const q = puffs[i], age = S.clock - q.t;
    if (age > life || age < 0 || q.z - VZ < 0.8) { puffs.splice(i, 1); continue; }
    const f = age / life, c = W3(q.x, 0.02, q.z), s = F / c[2] * q.big;   // pixels per metre at that spot
    if (rain) {   // a ring that spreads, and two drops thrown up
      ctx.strokeStyle = 'rgba(210,225,255,' + (0.55 * (1 - f)).toFixed(3) + ')'; ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath(); ctx.ellipse(c[0], c[1], s * (0.05 + 0.16 * f), s * (0.02 + 0.05 * f), 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(210,225,255,' + (0.7 * (1 - f)).toFixed(3) + ')';
      for (const d of [-1, 1]) { const hop = Math.sin(Math.PI * f) * s * 0.12; ctx.fillRect(c[0] + d * s * (0.04 + 0.1 * f), c[1] - hop, Math.max(1, s * 0.012), Math.max(1, s * 0.018)); }
    } else {      // dust: two soft puffs drifting apart and fading
      const col = LV.id === 'airport' ? '200,206,216' : LV.night ? '120,110,150' : '190,182,170';
      ctx.fillStyle = 'rgba(' + col + ',' + (0.42 * (1 - f)).toFixed(3) + ')';
      for (const d of [-1, 1]) { const r = s * (0.05 + 0.09 * f); ctx.beginPath(); ctx.ellipse(c[0] + d * s * 0.08 * f, c[1] - s * 0.03 * f, r, r * 0.6, 0, 0, TAU); ctx.fill(); }
    }
  }
}

// The multiplier shows under your feet too: a coloured glow that grows with it.
export function multGlow(bx, fy, s, ry) {
  const m = Math.min(8, 1 + Math.floor((S.chain || 0) / 3));
  if (m < 2 || !S.live) return;
  const c = hex(MULT_COLS[m - 1]), pulse = calm ? 1 : 0.85 + 0.15 * Math.sin(S.clock * 6);
  ctx.fillStyle = 'rgba(' + c.join(',') + ',' + (0.12 + 0.03 * m).toFixed(2) + ')';
  ctx.beginPath(); ctx.ellipse(bx, fy, (0.5 + 0.03 * m) * s * pulse, (0.5 + 0.03 * m) * s * pulse * ry, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgb(' + c.join(',') + ')'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(bx, fy, 0.5 * s * pulse, 0.5 * s * pulse * ry, 0, 0, TAU); ctx.stroke();
}

// A short shake when a chain breaks, you get bumped in a race, or you walk into someone. Off with calm visuals.
export function shakeOffset() {
  if (calm) return null;
  const hitT = state === 'over' && S.overT < 0.35 && !S.timeout ? (0.35 - S.overT) / 0.35 : 0, amt = Math.max(S.breakFlash / 0.35, hitT);
  if (amt <= 0.01) return null;
  const u = Math.min(W, H) / 390, a = 7 * u * amt, t = (typeof performance !== 'undefined' ? performance.now() : 0) / 1000;
  return [Math.sin(t * 91) * a, Math.cos(t * 77) * a * 0.6];
}

// When a chain ends its links snap and fly off from you.
export function chainShards() {
  if (calm || S.breakFlash <= 0 || !S.me) return;
  const f = 1 - S.breakFlash / 0.35, c = W3(S.me.x, 1.1, S.me.z), u = Math.min(W, H) / 390;
  ctx.save(); ctx.globalAlpha = Math.max(0, 1 - f); ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * TAU + hsh(i, 61), d = (30 + 90 * f) * u * (0.7 + 0.5 * hsh(i, 62)), x = c[0] + Math.cos(a) * d, y = c[1] + Math.sin(a) * d + 60 * u * f * f, r = 5 * u;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a + f * 6); ctx.beginPath(); ctx.ellipse(0, 0, r * 1.6, r, 0, 0.5, TAU - 0.5); ctx.strokeStyle = '#3a2a4d'; ctx.lineWidth = 4.6 * u; ctx.stroke(); ctx.strokeStyle = '#d5dae3'; ctx.lineWidth = 2.4 * u; ctx.stroke(); ctx.restore();   // an open chain link
  }
  ctx.restore();
}

// Confetti for a win, falling for a few seconds. Positions come from a hash and the time since the finish.
export function confetti() {
  const won = state === 'won' && (!S.race || S.race.place === 1);
  if (!won || calm) return;
  const t = S.overT || 0;
  if (t > 7) return;
  const u = Math.min(W, H) / 390, cols = ['#ffcf1f', '#ff7eb6', '#7cc4ff', '#5ee6a8', '#ff9f43', '#c792ff'];
  for (let i = 0; i < 90; i++) {
    const start = hsh(i, 71) * 1.2, age = t - start;
    if (age < 0) continue;
    const y = -20 + age * (120 + 90 * hsh(i, 72)) * u, x = hsh(i, 73) * W + Math.sin(age * (2 + 2 * hsh(i, 74)) + i) * 24 * u;
    if (y > H + 20) continue;
    const sp = age * (4 + 6 * hsh(i, 75)), w = 7 * u, h = 4 * u * Math.abs(Math.cos(sp));
    ctx.fillStyle = cols[i % cols.length]; ctx.save(); ctx.translate(x, y); ctx.rotate(sp * 0.4); ctx.fillRect(-w / 2, -h / 2, w, Math.max(1, h)); ctx.restore();
  }
}
