import { sameRoute } from '../config/side-routes.js';
import { LV } from '../config/levels.js';
import { BELT_BACK, BELT_SPEED, beltInfo, stripHasZ, stripLane } from '../config/strips.js';
import { clamp } from '../config/util.js';
import { ctx } from '../dom.js';
import { F, VZ } from './camera.js';
import { W3, fq, wq } from './draw.js';
import { draftCharge } from '../sim/race.js';
import { PU_TYPES } from '../sim/powerups.js';
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
  for (const b of S.race.bots) if (sameRoute(S,b) && !b.done && b.z - VZ > 2 && b.z - VZ < 45) windFor(b, b.x, b.z, 0.5);
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

/* ---------- airport moving walkway: two belts side by side, drawn flat on the floor under the people ---------- */
const VIEW = 46;
export function drawBelts() {
  const B = S.race ? beltInfo(LV.id) : null;
  if (!B) return;
  const k0 = Math.max(0, Math.floor((VZ - B.start - B.len) / B.every));
  for (let k = k0; B.start + k * B.every < VZ + VIEW; k++) {
    const s0 = B.start + k * B.every, s1 = s0 + B.len, a = Math.max(s0, VZ + 0.4), b = Math.min(s1, VZ + VIEW);
    if (b <= a) continue;
    belt(B.fwd, 1, a, b); belt(B.rev, -1, a, b);
    // floor rails under the glass on both outer edges, and a low rail on the open divider
    for (const x of [B.fwd[0], B.fwd[1], B.rev[1]]) { ctx.globalAlpha = 1; fq(x - 0.07, x + 0.07, 0.03, a - VZ, b - VZ, '#aab3bf'); }
    // yellow comb plates where you step on and off
    for (const [z0, z1] of [[s0 - 0.5, s0], [s1, s1 + 0.5]]) { const za = Math.max(z0, VZ + 0.4), zb = Math.min(z1, VZ + VIEW); if (zb > za) { ctx.globalAlpha = 1; fq(B.rev[0], B.fwd[1], 0.025, za - VZ, zb - VZ, '#e8b931'); } }
  }
  ctx.globalAlpha = 1;
}

function belt(range, dir, a, b) {
  const x0 = range[0], x1 = range[1], mid = (x0 + x1) / 2, fade = z => clamp((VZ + VIEW - z) / 14, 0, 1);
  // rubber, in slices so the far end fades into the haze
  for (let z = a; z < b; z += 3) { const e = Math.min(b, z + 3); ctx.globalAlpha = fade((z + e) / 2); fq(x0, x1, 0.015, z - VZ, e - VZ, dir > 0 ? '#323a46' : '#413b48'); }
  // grooves that slide along the belt's way
  const sp = dir > 0 ? BELT_SPEED : -BELT_BACK, off = ((S.clock * sp) % 0.6 + 0.6) % 0.6;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (let z = Math.ceil((a - off) / 0.6) * 0.6 + off; z < b - 0.07; z += 0.6) { if (z < a) continue; ctx.globalAlpha = fade(z); fq(x0 + 0.05, x1 - 0.05, 0.017, z - VZ, z + 0.07 - VZ, 'rgba(255,255,255,0.13)'); }
  // arrows showing which way it goes: teal for yours, orange for the one coming back
  ctx.fillStyle = dir > 0 ? '#2ec4b6' : '#ff8a5c';
  const step = 3, aoff = ((S.clock * sp) % step + step) % step, xi0 = x0 + 0.3, xi1 = x1 - 0.3, xm = mid;
  for (let z = Math.ceil((a - aoff) / step) * step + aoff; z < b - 0.9; z += step) {
    if (z < a) continue;
    ctx.globalAlpha = fade(z) * 0.8;
    const p = dir > 0
      ? [W3(xi0, 0.02, z), W3(xm, 0.02, z + 0.6), W3(xi1, 0.02, z), W3(xi1, 0.02, z + 0.3), W3(xm, 0.02, z + 0.9), W3(xi0, 0.02, z + 0.3)]
      : [W3(xi0, 0.02, z + 0.9), W3(xm, 0.02, z + 0.3), W3(xi1, 0.02, z + 0.9), W3(xi1, 0.02, z + 0.6), W3(xm, 0.02, z), W3(xi0, 0.02, z + 0.6)];
    ctx.beginPath(); p.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.fill();
  }
}

// Glass railings along both outer edges of every walkway stretch, cut into 2 m panels that are sorted in with the people so
// someone standing in front of the glass is drawn over it and someone behind it is drawn under it.
export function glassPanels() {
  const B = S.race ? beltInfo(LV.id) : null, out = [];
  if (!B) return out;
  const k0 = Math.max(0, Math.floor((VZ - B.start - B.len) / B.every));
  for (let k = k0; B.start + k * B.every < VZ + VIEW; k++) {
    const s0 = B.start + k * B.every, s1 = s0 + B.len;
    for (let z0 = s0; z0 < s1; z0 += 2) {
      const z1 = Math.min(z0 + 2, s1);
      if (z1 < VZ + 0.3 || z0 > VZ + VIEW) continue;
      for (const x of [B.fwd[0], B.rev[1]]) out.push({ glass: true, z: (z0 + z1) / 2, z0, z1, x });
    }
  }
  return out;
}

export function drawGlass(w) {
  const a = Math.max(w.z0 - VZ, 0.25), b = w.z1 - VZ;
  if (b <= a) return;
  ctx.save(); ctx.globalAlpha = clamp((VZ + VIEW - w.z) / 14, 0, 1);
  wq(w.x, 0.1, 1.05, a, b, 'rgba(170,215,235,0.28)');   // the glass
  wq(w.x, 0, 0.1, a, b, '#4b5563');                      // steel skirt
  wq(w.x, 1.05, 1.13, a, b, '#6b7683');                  // handrail
  if (w.z0 - VZ >= 0.25) wq(w.x, 0, 1.13, a, a + 0.07, '#6b7683');   // post
  ctx.restore();
}

// Race power-ups: a bobbing hand-drawn token over the floor. Each kind has its own silhouette so it reads at a glance:
// boost is a lightning bolt, stamina is a round drop-style badge with a plus, clear path is a diamond with a sparkle.
// Taken ones are gone for everyone.
function puShape(type, x, y, r) {
  ctx.beginPath();
  if (type === 'boost') {   // lightning bolt
    const P = [[0.15, -1.15], [-0.75, 0.15], [-0.05, 0.15], [-0.3, 1.15], [0.8, -0.3], [0.1, -0.3], [0.5, -1.15]];
    P.forEach((q, i) => (i ? ctx.lineTo(x + q[0] * r, y + q[1] * r) : ctx.moveTo(x + q[0] * r, y + q[1] * r)));
    ctx.closePath();
  } else if (type === 'clear') {   // diamond
    ctx.moveTo(x, y - 1.2 * r); ctx.lineTo(x + 1.0 * r, y); ctx.lineTo(x, y + 1.2 * r); ctx.lineTo(x - 1.0 * r, y); ctx.closePath();
  } else ctx.arc(x, y, r, 0, Math.PI * 2);   // refill: round, like the stamina bar's own colour
}
export function drawPowerups() {
  if (!S.race || !S.race.pickups || state !== 'play') return;
  for (const pk of S.race.pickups) {
    if (pk.taken || pk.z - VZ < 1.4 || pk.z - VZ > 45) continue;
    const bob = 0.75 + 0.12 * Math.sin(S.clock * 3 + pk.z), c = W3(pk.x, bob, pk.z), s = F / c[2], r = 0.36 * s;
    const col = PU_TYPES[pk.type].col, fade = clamp((pk.z - VZ - 1.4) / 1.5, 0, 1);
    ctx.globalAlpha = fade;
    const g = W3(pk.x, 0, pk.z);   // soft shadow on the floor
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(g[0], g[1], r * 0.8, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = col; ctx.strokeStyle = '#2b2118'; ctx.lineWidth = Math.max(1.5, r * 0.16); ctx.lineJoin = 'round';
    puShape(pk.type, c[0], c[1], r); ctx.fill(); ctx.stroke();
    if (pk.type !== 'boost') {   // glyph on the round and diamond ones; the bolt is its own symbol
      ctx.fillStyle = '#fffbea'; ctx.font = '700 ' + Math.round(r * 1.2) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(pk.type === 'refill' ? '+' : '✦', c[0], c[1] + r * 0.05);
    }
  }
  ctx.globalAlpha = 1;
}
