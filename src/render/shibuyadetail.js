import { NEON, hex, scl } from '../config/colour.js';
import { LV, fogA, mixc } from '../config/levels.js';
import { TAU, clamp, mod } from '../config/util.js';
import { ctx } from '../dom.js';
import { F, H, HOR, VX, VZ, W } from './camera.js';
import { P, cq, fq, label, poly, sub, wq } from './draw.js';
import { hsh, makeLod, padd, pfill, pfq, pwq, rgba } from './scenery.js';
import { S, calm } from '../sim/state.js';



/* ---------- Shibuya at night: lived-in scenery ----------
   Decoration only (see scenery.js). shibuyaSegment() runs at the end of each 3 m segment of paintShibuya (far to near),
   shibuyaSky() before the loop, shibuyaAfterLoop() after it. The half-width of the crossing is 15 m to the building walls;
   the walkable part is 11 m, so everything here at x beyond 11 m is out of reach. */

const lod = makeLod(), R = lod.R;
const HW = 15;
const SIGNS = ['居酒屋', 'ラーメン', 'カラオケ', '焼肉', '寿司', 'ゲーム', '薬', '麺'];
const SCREEN = ['#ff3d9a', '#20e3ff', '#7c4dff', '#ff9f1c', '#2ee6a6', '#ff4d4d'];
const t = () => S.clock || 0;

/* ---------- the walls ---------- */
// a big video screen on some buildings: the picture changes every couple of seconds, bars bounce to the "music"
function screen(k, za, zb, da, side, bi) {
  const [a, b] = sub(za + 0.2, zb - 0.2); if (b <= 0.2 || a > R(80)) return;
  const x = side * HW, y0 = 15.5, y1 = 24.5, slot = Math.floor(t() / 2.4), c = hex(SCREEN[Math.floor(hsh(bi * 3 + (side > 0 ? 1 : 0), slot) * SCREEN.length)]);
  ctx.globalAlpha = 0.32 * fogA(a); wq(x, y0 - 0.9, y1 + 0.9, Math.max(0.2, a - 0.3), b + 0.3, mixc(c, a * 0.5)); ctx.globalAlpha = 1;   // the glow round it
  wq(x, y0 - 0.2, y1 + 0.2, a, b, mixc(hex('#0b0a14'), a));                                                                              // frame
  wq(x, y0, y1, a, b, mixc(scl(c, 0.55), a * 0.5));                                                                                      // picture
  const bars = 3, tt = calm ? 0 : t();
  ctx.beginPath();
  for (let i = 0; i < bars; i++) {
    const z0 = za + 0.45 + i * 0.85, h = 1.5 + (0.5 + 0.5 * Math.sin(tt * 3.1 + bi * 1.7 + i * 2.3 + za)) * 5.5, [ba, bb] = sub(z0, z0 + 0.55);
    if (bb > 0.2) pwq(x, y0 + 0.5, y0 + 0.5 + h, ba, bb);
  }
  pfill(mixc(scl(c, 1.4), a * 0.5), 0.9);
  const sy = y0 + ((tt * 3.2 + bi) % 9); ctx.beginPath(); pwq(x, sy, Math.min(sy + 0.35, y1), a, b); pfill('#ffffff', 0.12);                // a slow scan line
}

// a sign sticking out over the street: stacked characters, glowing; and strings of red lanterns
function bladeSign(k, za, da, side, bi) {
  if (da < 6 || da > R(46)) return;
  const x0 = side * (HW - 1.15), x1 = side * (HW - 0.15), lo = Math.min(x0, x1), hi = Math.max(x0, x1);
  const c = hex(NEON[Math.floor(hsh(bi + side * 7, 3) * NEON.length)]), txt = SIGNS[Math.floor(hsh(bi + side * 7, 4) * SIGNS.length)], chars = Array.from(txt);
  const top = 4.2 + chars.length * 0.62, fa = clamp((da - 6) / 5, 0, 1) * fogA(da);
  ctx.globalAlpha = 0.3 * fa; cq(lo - 0.25, hi + 0.25, 3.6, top + 0.3, da, mixc(c, da * 0.5));
  ctx.globalAlpha = fa; cq(lo, hi, 3.85, top, da, mixc(hex('#120f20'), da)); cq(lo + 0.06, hi - 0.06, 3.9, top - 0.05, da, mixc(scl(c, 0.35), da * 0.5));
  cq((x0 + x1) / 2 - 0.03, (x0 + x1) / 2 + 0.03, top, top + 0.7, da, mixc(hex('#120f20'), da));
  const px = 0.5 * F / da;
  if (px >= 8) chars.forEach((ch, i) => { const q = P((x0 + x1) / 2, top - 0.42 - i * 0.62, da); label(ch, q[0], q[1], px, '#ffffff'); });
  ctx.globalAlpha = 1;
}

function lanterns(k, za, zb, da, side) {
  if (da > R(34)) return;
  const x = side * (HW - 0.35), g = 0.28;
  ctx.beginPath(); const pts = [];
  for (let i = 0; i < 4; i++) { const z = za + 0.35 + i * 0.75, d = z - VZ; if (d < 0.8) continue; const q = P(x, 3.1 - Math.sin(i / 3 * Math.PI) * 0.1, d), r = g * F / d; ctx.moveTo(q[0] + r * 0.8, q[1]); ctx.ellipse(q[0], q[1], r * 0.8, r, 0, 0, TAU); pts.push([q[0], q[1], r]); }
  ctx.fillStyle = mixc(hex('#e8392e'), da * 0.5); ctx.fill();
  ctx.fillStyle = 'rgba(255,170,90,' + (0.28 * fogA(da)).toFixed(2) + ')'; ctx.beginPath(); for (const [qx, qy, r] of pts) { ctx.moveTo(qx + r * 1.8, qy); ctx.arc(qx, qy, r * 1.8, 0, TAU); } ctx.fill();
}

function wallSeg(k, za, zb, da, db, side) {
  const [wa, wb] = sub(za + 0.3, zb - 0.3);
  if (wb <= 0.2) return;
  const bi = Math.floor(za / 12), x = side * HW, neon = mod((k >> 1) + (side > 0 ? 1 : 0), 3) === 0;
  if (wa < R(40)) {                                                                                   // menus and posters in the lit shopfront
    ctx.beginPath(); for (let r = 0; r < 2; r++) { const n = 2 + Math.floor(hsh(k, r + side * 9) * 2); for (let i = 0; i < n; i++) { const a0 = za + 0.5 + i * (zb - za - 1) / n, [a, b] = sub(a0, a0 + (zb - za - 1) / n - 0.15); if (b > 0.2) pwq(x, 0.8 + r * 0.9, 1.4 + r * 0.9, a, b); } }
    pfill(mixc(hex('#e8392e'), wa * 0.7), 0.55);
    ctx.beginPath(); pwq(x, 3.1, 3.25, wa, wb); pfill(mixc(hex('#fff4d0'), wa * 0.6), 0.8);     // lit canopy edge
  }
  if (hsh(bi, 40 + side) < 0.32 && !neon) screen(k, za, zb, da, side, bi);
  if (neon && !calm && hsh(k, Math.floor(t() * 5)) < 0.03) { wq(x, 6, 14, wa, wb, 'rgba(10,8,20,0.55)'); }   // a tube flickers
  if (mod(k, 4) === 1 && hsh(bi, 41 + side) < 0.55) bladeSign(k, za, da, side, bi);
  if (hsh(bi, 42 + side) < 0.35 && mod(k, 4) !== 3) lanterns(k, za, zb, da, side);
}

/* ---------- the ground ---------- */
function groundSeg(k, za, zb, da, db) {
  if (da > R(56)) return;
  const fa = fogA(da);
  // yellow tactile paving along each kerb of the crossing, so the edge of the walkable street reads
  for (const side of [-1, 1]) {
    const x0 = side * 11.62, x1 = side * 12.22;
    ctx.beginPath(); pfq(Math.min(x0, x1), Math.max(x0, x1), 0.025, da, db); pfill('#e8c43a', 0.5 * fa);
    if (da < R(26)) {
      ctx.strokeStyle = 'rgba(120,90,10,' + (0.45 * fa).toFixed(2) + ')'; ctx.lineWidth = 1; ctx.beginPath();
      for (let z = za + 0.2; z < zb; z += 0.45) { const d = z - VZ; if (d < 0.4) continue; const p1 = P(x0, 0.025, d), p2 = P(x1, 0.025, d); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); }
      ctx.stroke();
    }
    // bollards along the kerb
    if (mod(k, 2) === 0 && da < R(46)) {
      const d = za + 1.5 - VZ; if (d > 1) { const bx = side * 11.8; ctx.beginPath(); padd([[bx - 0.07, 0, d], [bx + 0.07, 0, d], [bx + 0.07, 0.85, d], [bx - 0.07, 0.85, d]]); pfill(mixc(hex('#4a4560'), d), 1); ctx.beginPath(); padd([[bx - 0.07, 0.72, d], [bx + 0.07, 0.72, d], [bx + 0.07, 0.86, d], [bx - 0.07, 0.86, d]]); pfill(mixc(hex('#ffe14d'), d * 0.5), 1); }
    }
  }
  // the neon bleeds onto the wet road in front of lit signs
  const m = mod(za, 45);
  for (const sd of [-1, 1]) {
    if (mod((k >> 1) + (sd > 0 ? 1 : 0), 3) !== 0) continue;
    const nc = hex(NEON[mod(k + (sd > 0 ? 2 : 0), NEON.length)]);
    ctx.beginPath(); pfq(Math.min(sd * 11.6, sd * 8.2), Math.max(sd * 11.6, sd * 8.2), 0.005, da, db); pfill(mixc(nc, da * 0.6), 0.1 * fa);
  }
  // puddles on the crossing: sky-pink and cyan, faint
  if (mod(k, 4) === 2 && m > 5) {
    const bi = Math.floor(za / 12);
    if (hsh(bi, 50) < 0.5) {
      const px = -9 + hsh(bi, 51) * 18, pz = za + 0.5 + hsh(bi, 52) * 2, rx = 0.8 + hsh(bi, 53) * 1.0, c = hex(hsh(bi, 54) < 0.5 ? '#ff3d9a' : '#20e3ff');
      const pts = []; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; pts.push([px + Math.cos(a) * rx, 0.007, Math.max(0.2, pz + Math.sin(a) * rx * 0.55 - VZ)]); }
      poly(pts, rgba(c, 0.06 * fa));
    }
  }
}

/* ---------- the call from world.js ---------- */
export function shibuyaSegment(k, za, zb, da, db) {
  lod.begin();
  groundSeg(k, za, zb, da, db);
  wallSeg(k, za, zb, da, db, -1); wallSeg(k, za, zb, da, db, 1);
  lod.end();
}

/* ---------- sky: stars, a moon, haze, far towers with blinking lights, a blimp ---------- */
export function shibuyaSky() {
  const tt = t(), u = Math.min(W, H) / 390, y0 = HOR - H * 0.45;
  const g = ctx.createLinearGradient(0, HOR - H * 0.2, 0, HOR); g.addColorStop(0, 'rgba(255,61,154,0)'); g.addColorStop(1, 'rgba(255,61,154,0.16)');
  ctx.fillStyle = g; ctx.fillRect(0, HOR - H * 0.2, W, H * 0.2);                                         // the city's glow
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 26; i++) {
    const sx = hsh(i, 1) * W, sy = y0 + hsh(i, 2) * H * 0.3, tw = calm ? 0.7 : 0.45 + 0.4 * Math.sin(tt * (1 + hsh(i, 3)) + i);
    ctx.globalAlpha = 0.5 * tw; ctx.fillRect(sx, sy, 1.5 * u, 1.5 * u);
  }
  ctx.globalAlpha = 1;
  const mx = W * 0.8 - VX * 2, my = y0 + H * 0.12;                                                       // a thin moon
  ctx.fillStyle = 'rgba(255,244,214,0.85)'; ctx.beginPath(); ctx.arc(mx, my, 13 * u, 0, TAU); ctx.fill();
  ctx.fillStyle = '#0e0b1f'; ctx.beginPath(); ctx.arc(mx + 6 * u, my - 2 * u, 12 * u, 0, TAU); ctx.fill();
  // far towers at the end of the street, with red aviation lights
  const cx = W / 2 - VX * 0.4;
  ctx.fillStyle = 'rgba(40,32,78,0.9)';
  for (const [dx, w, h] of [[-62, 24, 80], [-30, 18, 120], [8, 22, 96], [38, 16, 140], [66, 26, 70]]) { ctx.fillRect(cx + dx * u - w * u / 2, HOR - h * u, w * u, h * u); }
  ctx.fillStyle = 'rgba(247,200,115,0.55)';
  for (const [dx, w, h] of [[-62, 24, 80], [-30, 18, 120], [8, 22, 96], [38, 16, 140], [66, 26, 70]]) for (let r = 0; r < h / 12; r++) if (hsh(dx, r) < 0.4) ctx.fillRect(cx + dx * u - w * u / 2 + 3 * u + hsh(dx, r + 9) * (w - 8) * u, HOR - h * u + 6 * u + r * 12 * u, 2.4 * u, 2.4 * u);
  const blink = calm ? 1 : (Math.floor(tt * 1.3) % 2);
  ctx.fillStyle = 'rgba(255,60,60,' + (blink ? 0.95 : 0.2) + ')';
  for (const [dx, h] of [[-30, 120], [38, 140]]) { ctx.beginPath(); ctx.arc(cx + dx * u, HOR - h * u - 2 * u, 2.2 * u, 0, TAU); ctx.fill(); }
  // an ad blimp drifting across, its screen glowing
  const cyc = (tt / 80) % 1;
  if (cyc < 0.55) {
    const p = cyc / 0.55, bx = W + 60 - p * (W + 160), by = y0 + H * 0.18 + Math.sin(tt * 0.4) * 3 * u;
    ctx.fillStyle = '#3b3560'; ctx.beginPath(); ctx.ellipse(bx, by, 34 * u, 11 * u, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(bx + 30 * u, by); ctx.lineTo(bx + 44 * u, by - 10 * u); ctx.lineTo(bx + 44 * u, by + 10 * u); ctx.closePath(); ctx.fill();
    ctx.fillStyle = SCREEN[Math.floor(tt / 2.4) % SCREEN.length]; ctx.globalAlpha = 0.9; ctx.fillRect(bx - 18 * u, by - 4 * u, 34 * u, 8 * u); ctx.globalAlpha = 1;
  }
}

/* ---------- after the loop: utility poles and the tangle of cables, steam from the ramen shops ---------- */
function poles() {
  const every = 36, z0 = Math.floor((VZ - 4) / every) * every;
  ctx.strokeStyle = 'rgba(8,6,16,0.8)'; ctx.lineWidth = 1; ctx.beginPath();
  const cross = [];
  for (let z = z0 + every * 3; z >= z0; z -= every) {
    const d = z - VZ; if (d < 1.5 || d > R(70)) continue;
    for (const side of [-1, 1]) {
      const x = side * 12.6, c = mixc(hex('#2a2540'), d);
      cq(x - 0.11, x + 0.11, 0, 9.2, d, c);
      cq(x - 1.1, x + 1.1, 8.4, 8.6, d, c); cq(x - 0.8, x + 0.8, 7.6, 7.75, d, c);
    }
    cross.push(d);
  }
  // cables sag between pole tops, along the street and across it
  const sagLine = (x0, y0, d0, x1, y1, d1, sag) => {
    const a = P(x0, y0, d0), b = P(x1, y1, d1), m = P((x0 + x1) / 2, (y0 + y1) / 2 - sag, (d0 + d1) / 2);
    ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(m[0] * 2 - (a[0] + b[0]) / 2, m[1] * 2 - (a[1] + b[1]) / 2, b[0], b[1]);
  };
  for (let i = 0; i < cross.length; i++) {
    const d = cross[i];
    for (const [y, sag] of [[8.5, 1.1], [7.7, 0.8], [8.1, 1.5]]) sagLine(-12.6, y, d, 12.6, y, d, sag);
    if (i + 1 < cross.length) for (const side of [-1, 1]) for (const y of [8.5, 7.65]) sagLine(side * 12.6, y, d, side * 12.6, y, cross[i + 1], 0.7);
  }
  ctx.stroke();
  // a pedestrian signal head on the near pole of each pair, turning green and red in turn
  for (const d of cross) {
    if (d < 5) continue;
    for (const side of [-1, 1]) {
      const x = side * 12.6 - side * 0.35, green = Math.floor(t() / 6 + d) % 2 === 0;
      cq(x - 0.22, x + 0.22, 5.6, 6.5, d, mixc(hex('#16131f'), d));
      const q = P(x, 6.05, d), r = 0.14 * F / d; ctx.fillStyle = green ? '#3dff9a' : '#ff4d4d'; ctx.globalAlpha = 0.95 * fogA(d); ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
  }
}

function steam() {
  const tt = t();
  for (let l = Math.floor((VZ - 10) / 70); l <= Math.floor((VZ + 70) / 70); l++) {
    if (hsh(l, 60) > 0.6) continue;
    const z = l * 70 + 12 + hsh(l, 61) * 40, side = hsh(l, 62) < 0.5 ? -1 : 1, d = z - VZ;
    if (d < 4 || d > R(48)) continue;
    const x = side * 13.8, fa = fogA(d);
    for (let i = 0; i < 5; i++) {
      const age = ((tt * 0.3 + i / 5 + hsh(l, 63)) % 1), q = P(x - side * age * 0.8, 1.2 + age * 2.6, d), r = (0.2 + age * 0.7) * F / d;
      ctx.globalAlpha = 0.28 * (1 - age) * fa; ctx.fillStyle = '#ffd9c2'; ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

export function shibuyaAfterLoop() {
  lod.frame();
  poles(); steam();
}
