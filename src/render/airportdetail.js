import { INK, hex, scl } from '../config/colour.js';
import { LV, fogA, mixc } from '../config/levels.js';
import { CEIL } from '../config/tuning.js';
import { TAU, clamp, mod } from '../config/util.js';
import { ctx } from '../dom.js';
import { F, HOR, VX, VZ } from './camera.js';
import { P, box3D, cq, label, poly, sub, wq } from './draw.js';
import { FLOOR_MIN, hsh, makeLod, padd, pfill, pfq, pwq, rgba, subWall, wallMin, wallText } from './scenery.js';
import { S, calm } from '../sim/state.js';



/* ---------- Terminal B: lived-in scenery ----------
   Decoration only (see scenery.js). airportSegment() runs at the end of each 3 m segment of paintAirport (far to near);
   airportExtras() is called by the apron for each gate. */

const lod = makeLod(), R = lod.R;
const NAVY = hex('#14233b'), AMBER = '#ffcf1f';
const SHOPS = ['COFFEE', 'DUTY FREE', 'BOOKS', 'TECH', 'SNACKS', 'FLOWERS', 'SUSHI', 'NEWS', 'GIFTS', 'PHARMACY', 'PRETZELS', 'TRAVEL'];
const GOODS = ['#d9473f', '#f2c94c', '#2f80ed', '#27ae60', '#f4f1ea', '#e58b2b', '#9b51e0'];
const FLIGHTS = ['UA 241', 'JL 007', 'BA 117', 'LH 400', 'AF 22', 'EK 215', 'QF 12', 'DL 88'];
const DESTS = ['TOKYO', 'LONDON', 'PARIS', 'DUBAI', 'ROME', 'LIMA', 'SYDNEY', 'OSLO'];
const STATUS = ['ON TIME', 'BOARDING', 'DELAYED', 'FINAL CALL'];

// the departures board hanging over the hall; the rows change every few seconds
function board(k, d) {
  const n = Math.floor(k / 10), slot = Math.floor((S.clock || 0) / 6);
  ctx.globalAlpha = clamp((d - 6) / 5, 0, 1) * fogA(d);
  cq(-2.4, 2.4, 2.75, 4.05, d, mixc(hex('#0d1626'), d));
  for (const hx of [-1.9, 1.9]) cq(hx - 0.04, hx + 0.04, 4.05, CEIL, d, mixc(NAVY, d));
  const px = 0.19 * F / d;
  if (px >= 7) {
    const top = P(0, 3.78, d), step = 0.27 * F / d;
    label('FLIGHT   TO   GATE   STATUS', top[0], top[1], px * 0.8, '#ffffff');
    for (let r = 0; r < 3; r++) {
      const i = Math.floor(hsh(n * 7 + r, slot) * 8), gate = 'B' + (1 + Math.floor(hsh(n + r, slot + 5) * 20));
      label(FLIGHTS[i] + '  ' + DESTS[(i + r) % 8] + '  ' + gate + '  ' + STATUS[Math.floor(hsh(i, slot + r) * 4)], top[0], top[1] + step * (r + 1), px, AMBER);
    }
  }
  ctx.globalAlpha = 1;
}

function shopWall(k, za, zb, da, Wl) {
  const [wa, wb] = subWall(Wl, za + 0.2, zb - 0.2);
  if (wb <= 0.2 || wa > R(46)) return;
  const bay = Math.floor(k / 4), name = SHOPS[Math.floor(hsh(bay * 3 + (k & 3), 4) * SHOPS.length)];
  // lit lamp strip, shelves of stock and a counter inside the glass
  ctx.beginPath(); pwq(Wl, 2.5, 2.66, wa, wb); pfill(mixc(hex('#ffffff'), wa), 0.85);
  if (da < R(36)) {
    for (let r = 0; r < 2; r++) {
      const n = 3 + Math.floor(hsh(k, r + 30) * 3), y = 1.2 + r * 0.7;
      for (let i = 0; i < n; i++) { const a0 = za + 0.4 + i * (zb - za - 0.8) / n, [a, b] = subWall(Wl, a0, a0 + (zb - za - 0.8) / n - 0.12); if (b > 0.2) { ctx.beginPath(); pwq(Wl, y, y + 0.45, a, b); pfill(mixc(hex(GOODS[Math.floor(hsh(k, r * 9 + i) * GOODS.length)]), a), 0.85); } }
    }
    ctx.beginPath(); pwq(Wl, 0.4, 0.95, wa, wb); pfill(mixc(hex('#6b4f3a'), wa), 0.8);
    if (mod(k, 4) === 2) { const [a, b] = subWall(Wl, za + 0.9, zb - 0.9); if (b > 0.2) { ctx.beginPath(); pwq(Wl, 0.4, 2.45, a, b); pfill(mixc(hex('#fff4d0'), a), 0.9); } }   // an open doorway
  }
  wallText(name, Wl, 3.45, (za + zb) / 2, 0.42, '#14233b', 1);
}

function windowWall(k, za, zb, da, Wl) {
  const [wa, wb] = subWall(Wl, za + 0.2, zb - 0.2);
  if (wb <= 0.2 || wa > R(46)) return;
  const x = -Wl;
  // frame: a post in the middle and a rail across, and a bright streak of glare
  ctx.beginPath(); pwq(x, 0.9, 3.8, wa, wa + 0.06); pwq(x, 0.9, 3.8, wb - 0.06, wb); pwq(x, 2.3, 2.38, wa, wb);
  const zm = (za + zb) / 2, [ma, mb] = subWall(Wl, zm - 0.04, zm + 0.04); if (mb > 0.2) pwq(x, 0.9, 3.8, ma, mb);
  pfill(mixc(NAVY, wa), 0.55);
  if (da < R(36)) {
    ctx.beginPath(); padd([[x, 0.95, Math.max(0.2, wa + 0.1)], [x, 0.95, Math.max(0.2, wa + 0.55)], [x, 3.75, Math.max(0.2, wb - 0.3)], [x, 3.75, Math.max(0.2, wb - 0.75)]]); pfill('#ffffff', 0.13);
  }
}

function pillar(k, za, Wl) {
  const [pa, pb] = subWall(Wl - 0.6, za - 0.35, za + 0.35);
  if (pb <= 0.2 || pa > R(40)) return;
  for (const side of [-1, 1]) {
    const x = side * (Wl - 0.6), j = Math.floor(k / 4) + (side > 0 ? 1 : 0);
    ctx.beginPath(); pwq(x, 0, 0.18, pa, pb); pfill(mixc(hex('#7f8a96'), pa), 1);                                // base
    if (hsh(j, 12) < 0.6) { wq(x, 1.45, 2.05, pa + 0.05, pb - 0.05, mixc(hex('#2f80ed'), pa)); wq(x, 1.55, 1.6, pa + 0.1, pb - 0.1, mixc(hex('#ffffff'), pa)); }   // information plaque
    else { wq(x, 0.85, 1.4, pa + 0.1, pb - 0.1, mixc(hex('#c0392b'), pa)); }                                    // fire extinguisher
    if (j % 3 === 0) wq(x, 3.5, 3.85, pa, pb, mixc(hex('#1d9a5b'), pa));                                        // exit sign
  }
}

function floorSeg(k, za, zb, da, db, Wl, par) {
  da = Math.max(da, FLOOR_MIN); if (db <= da + 0.05 || da > R(50)) return;
  // the tiles shine under the ceiling lights; the carpet has a border and a woven accent
  if (!par) { ctx.beginPath(); pfq(-1.3, 1.3, 0.003, da, db); pfq(-4.9, -3.3, 0.003, da, db); pfq(3.3, 5.0, 0.003, da, db); pfill('#ffffff', 0.12 * fogA(da)); }
  ctx.beginPath(); pfq(-5.1, -5.0, 0.004, da, db); pfq(5.0, 5.1, 0.004, da, db); pfill('#f4f6f8', 0.55 * fogA(da));
  const acc = hex(par ? '#2f6f8f' : '#6b4e9a');
  ctx.beginPath(); pfq(-6.6, -5.6, 0.004, Math.max(0.2, da + 0.5), Math.max(0.3, db - 0.5)); pfq(5.6, 6.6, 0.004, Math.max(0.2, da + 0.5), Math.max(0.3, db - 0.5)); pfill(mixc(acc, da), 0.35);
  ctx.beginPath(); pfq(-Wl, -Wl + 0.18, 0.004, da, db); pfq(Wl - 0.18, Wl, 0.004, da, db); pfill(mixc(NAVY, da), 0.35);   // dark edge by the walls
}

// every 12 m: suitcase-wheel tracks, scuffs and a spill mark, a dropped boarding pass. Faint and flat.
function floorWear(k, za, da) {
  if (mod(k, 4) !== 1 || da > R(40) || za - VZ < FLOOR_MIN) return;
  const bi = Math.floor(za / 12), fa = fogA(da);
  ctx.strokeStyle = 'rgba(70,80,95,' + (0.14 * fa).toFixed(2) + ')'; ctx.lineWidth = Math.max(0.7, 0.03 * F / Math.max(1, da)); ctx.beginPath();
  for (let t = 0; t < 2; t++) {
    let cx = -4 + hsh(bi, 60 + t) * 8;
    for (let i = 0; i < 5; i++) { const q = P(cx, 0, Math.max(0.3, za - 3 + i * 2.2 - VZ)); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); cx += (hsh(bi, 64 + i + t * 5) - 0.5) * 0.5; }
  }
  ctx.stroke();
  const sx = -4 + hsh(bi, 70) * 8, sz = za + hsh(bi, 71) * 8;
  const pts = []; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, r = 0.4 + hsh(bi, 72 + i) * 0.35; pts.push([sx + Math.cos(a) * r, 0.005, Math.max(0.2, sz + Math.sin(a) * r - VZ)]); }
  poly(pts, rgba([110, 120, 135], 0.07 * fa));
  if (hsh(bi, 90) < 0.5) { const fx = -3 + hsh(bi, 91) * 6, fz = za + 1 + hsh(bi, 92) * 8; poly([[fx, 0.006, Math.max(0.2, fz - VZ)], [fx + 0.22, 0.006, Math.max(0.2, fz + 0.03 - VZ)], [fx + 0.2, 0.006, Math.max(0.2, fz + 0.32 - VZ)], [fx - 0.02, 0.006, Math.max(0.2, fz + 0.28 - VZ)]], rgba([250, 250, 245], 0.6 * fa)); }
}

function ceiling(k, za, zb, da, db, Wl, par) {
  da = Math.max(da, FLOOR_MIN); if (db <= da + 0.05 || da > R(60)) return;
  ctx.beginPath(); pfq(-Wl, -Wl + 0.45, CEIL, da, db); pfq(Wl - 0.45, Wl, CEIL, da, db); pfill(mixc(hex('#c9d2dc'), da), 1);   // cove along each wall
  if (par) {                                                                                                          // slot air diffusers
    const [a, b] = sub(za + 0.5, zb - 0.5);
    if (b > 0.2) { ctx.beginPath(); for (const x of [-2.6, 2.6]) { pfq(x - 0.9, x + 0.9, CEIL, a, b); } pfill(mixc(hex('#aab6c2'), a), 1); ctx.beginPath(); for (const x of [-2.6, 2.6]) for (let i = 1; i < 4; i++) { const zz = a + (b - a) * i / 4; pfq(x - 0.9, x + 0.9, CEIL, zz - 0.03, zz + 0.03); } pfill(mixc(hex('#7d8a98'), a), 1); }
  } else if (da < R(40)) {                                                                                            // spotlights between the light panels
    const [a, b] = sub(za + 1.2, za + 1.5);
    if (b > 0.2) { ctx.beginPath(); for (const x of [-3.9, -0.0, 3.9]) pfq(x - 0.12, x + 0.12, CEIL, a, b); pfill(mixc(hex('#fff7d6'), a), 1); }
  }
}

export function airportSegment(k, za, zb, da, db) {
  lod.begin();
  const Wl = LV.half, par = k & 1, isPillar = mod(k, 4) === 0;
  ceiling(k, za, zb, da, db, Wl, par);
  floorSeg(k, za, zb, da, db, Wl, par);
  floorWear(k, za, da);
  if (isPillar) { if (da < R(40)) pillar(k, za, Wl); }
  else { shopWall(k, za, zb, da, Wl); windowWall(k, za, zb, da, Wl); }
  // skirting along both walls
  if (da < R(46) && db > wallMin(Wl) + 0.05) { const w0 = Math.max(da, wallMin(Wl)); ctx.beginPath(); pwq(-Wl, 0, 0.16, w0, db); pwq(Wl, 0, 0.16, w0, db); pfill(mixc(NAVY, w0), 0.45); }
  if (mod(k, 10) === 5 && za - VZ > 6) board(k, za - VZ);
  lod.end();
}
export function airportAfterLoop() { lod.frame(); }

/* ---------- on the apron outside the windows (called per gate by apron.js, already clipped to the window openings) ---------- */
export function airportExtras(g, z, hasPlane) {
  const d = z - VZ; if (d > R(110)) return;
  // cones and a ground-crew worker round the nose, a fuel truck at some gates
  const orange = hex('#f26a1b');
  if (hasPlane) {
    for (const [x, dz] of [[-9, -5], [-9, 5], [-6.5, 0]]) box3D(x - 0.2, x + 0.2, 0, 0.7, z + dz - 0.2, z + dz + 0.2, orange);
    const wk = ((S.clock || 0) * 0.5 + g * 3) % 8, wz = z + 3 + Math.sin(wk) * 2;
    box3D(-8.4, -8.0, 0.15, 1.65, wz - 0.18, wz + 0.18, hex('#d8ff2a'));
    box3D(-8.35, -8.05, 1.65, 1.9, wz - 0.12, wz + 0.12, hex('#f1c7a5'));
  }
  if (g % 3 === 0 && hasPlane) {
    const tz = z - 14;
    box3D(-27, -22, 0.4, 2.6, tz - 1.4, tz + 3.0, hex('#f4f6f8'));
    box3D(-27.05, -21.95, 1.4, 1.7, tz - 1.45, tz + 3.05, hex('#d63a2f'));
    box3D(-27, -22, 0.4, 2.2, tz - 3.0, tz - 1.45, hex('#2f80ed'));
    box3D(-24.6, -24.4, 2.6, 3.0, tz + 0.5, tz + 0.9, hex('#6b7280'));
  }
}

// the sky over the apron: a jet climbing away and its contrail, and a second one lining up far off. Screen space, so it only needs the horizon.
export function airportSky(W, H) {
  const t = S.clock || 0, cyc = (t / 55) % 1;
  if (cyc > 0.62) return;
  const p = cyc / 0.62, x = -80 + p * (W + 160), y = HOR - H * 0.22 - p * H * 0.1, u = Math.min(W, H) / 390;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2 * u; ctx.beginPath(); ctx.moveTo(x - 90 * u, y + 7 * u); ctx.lineTo(x - 8 * u, y + 1 * u); ctx.stroke();
  ctx.fillStyle = '#f4f6f8'; ctx.beginPath(); ctx.ellipse(x, y, 17 * u, 3.2 * u, -0.12, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 3 * u, y); ctx.lineTo(x - 11 * u, y + 11 * u); ctx.lineTo(x - 7 * u, y + 11 * u); ctx.lineTo(x + 3 * u, y + 1 * u); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 14 * u, y - 1 * u); ctx.lineTo(x - 19 * u, y - 7 * u); ctx.lineTo(x - 16 * u, y - 7 * u); ctx.lineTo(x - 11 * u, y - 1 * u); ctx.fill();
}
