import { AWN, SHIRTS, SKINS, hex, scl } from '../config/colour.js';
import { LV, fogA, mixc } from '../config/levels.js';
import { TAU, clamp, mod } from '../config/util.js';
import { ctx } from '../dom.js';
import { F, H, HOR, VX, VY, VZ, W } from './camera.js';
import { P, ball, box3D, cq, fq, label, poly, sub, wq } from './draw.js';
import { disc, hsh, makeLod, padd, pfill, pwq, rgba, topOf, wallText, wqA } from './scenery.js';
import { inXing } from '../sim/people.js';
import { S, calm } from '../sim/state.js';



/* ---------- Fifth Avenue: lived-in scenery ----------
   Everything here is decoration. It reads only the camera and the clock, draws nothing the player can walk into, and never touches
   the simulation or its random numbers, so the crowd, collisions and daily seeds are exactly as before. Detail is dropped with
   distance so it costs next to nothing on a phone. Where it sits in the paint order: the world's segment loop calls nycSegment()
   at the end of each 3 m segment (far to near), nycSky() paints before it, nycAfterLoop() after it, nycSteam() after the cars. */

const WINDOW = hex('#2c3a4a'), STONE = hex('#d8d0c2'), IRON = hex('#232830'), LIT = hex('#f6cf7a'), BLIND = hex('#d9ceb6'), AC = hex('#aab2b9'), PLY = hex('#b38d5c');
const GRASS = hex('#4c8a45'), BRICK = hex('#8d4a3a'), WALK = hex('#cbc7c0');
const POSTERS = ['#e2574c', '#f2c94c', '#2f80ed', '#f4f1ea', '#27ae60', '#9b51e0'];
const GOODS = ['#d9473f', '#f2c94c', '#2f80ed', '#27ae60', '#f4f1ea', '#e58b2b'];
const SHOPS = [
  { n: 'DELI', c: hex('#1f7a45'), g: hex('#f3e2a6') }, { n: 'PIZZA', c: hex('#b6322a'), g: hex('#ffd9a0') },
  { n: 'CAFE', c: hex('#5b3a29'), g: hex('#ffe2b8') }, { n: 'PHARMACY', c: hex('#0f8a7e'), g: hex('#eaf8f6') },
  { n: 'BAGELS', c: hex('#c98a1a'), g: hex('#ffe9b0') }, { n: 'BOOKS', c: hex('#2b4a8b'), g: hex('#ffe6b0') },
  { n: 'DINER', c: hex('#a3232f'), g: hex('#fff1c9') }, { n: 'SUSHI', c: hex('#2b2f3a'), g: hex('#ffd6d6') }
];
const lod = makeLod(), R = lod.R;
const FAR_X = -17;   // the wall across the avenue (matches world.js)

/* ---------- facades (both sides of the avenue) ---------- */
// windows: some lit, some with blinds half drawn, some with an air conditioner or a flower box, and a sill under each.
function windows(side, X, za, zb, da, hB, k, base) {
  if (da > R(base ? 44 : 50)) return;
  const [a, b] = sub(za + 0.6, zb - 0.6); if (b <= 0.2) return;
  const dir = -side, top = Math.min(hB - 1.5, base ? 20 : 26, topOf(a)), zc = (za + zb) / 2, near = da < R(28);
  const rows = []; for (let y = 4.6, r = 0; y < top; y += 3.4, r++) rows.push([y, hsh(k, r + 11)]);
  if (!rows.length) return;
  if (base) { ctx.beginPath(); for (const [y] of rows) pwq(X, y, y + 1.9, a, b); pfill(mixc(WINDOW, a), 1); }
  ctx.beginPath(); let any = false; for (const [y, v] of rows) if (v < 0.16) { pwq(X, y + 0.1, y + 1.8, a, b); any = true; } if (any) pfill(mixc(LIT, a), 0.6);
  ctx.beginPath(); any = false; for (const [y, v] of rows) if (v >= 0.16 && v < 0.32) { pwq(X, y + 0.95, y + 1.9, a, b); any = true; } if (any) pfill(mixc(BLIND, a), 0.9);
  if (!near) return;
  ctx.beginPath(); for (const [y] of rows) pwq(X, y - 0.14, y + 0.02, Math.max(0.2, a - 0.12), b + 0.12); pfill(mixc(STONE, a), 1);   // sills
  if (da < R(20)) for (const [y, v] of rows) {
    if (v > 0.42 && v < 0.5) box3D(Math.min(X, X + dir * 0.55), Math.max(X, X + dir * 0.55), y + 0.12, y + 0.72, zc - 0.5, zc + 0.5, AC);
    else if (v > 0.5 && v < 0.57 && side > 0) { box3D(X - 0.3, X, y - 0.28, y - 0.02, za + 0.7, zb - 0.7, hex('#7a5a3c')); box3D(X - 0.3, X, y - 0.02, y + 0.2, za + 0.75, zb - 0.75, GRASS); }
  }
}

// fire escapes: platforms with a rail, stairs zig-zagging between them (they hang above head height). One path, one fill.
function fireEscape(side, X, za, zb, hB, sIdx) {
  const dir = -side, xo = X + dir * 0.95, xs = X + dir * 0.5, x0 = Math.min(X, xo), x1 = Math.max(X, xo);
  const [a, b] = sub(za + 0.1, zb - 0.1), n = Math.min(Math.floor((hB - 6) / 3.4), 4), lim = topOf(a);
  ctx.beginPath();
  for (let f = 0; f <= n; f++) {
    const y = 4.45 + f * 3.4; if (y > lim) break;
    padd([[x0, y, a], [x1, y, a], [x1, y, b], [x0, y, b]]);
    pwq(xo, y + 0.8, y + 0.9, a, b);
    if (f < n && sIdx === 1 + (f & 1)) { const lo = f & 1 ? b : a, hi = f & 1 ? a : b; padd([[xs, y + 0.05, lo], [xs, y + 0.22, lo], [xs, y + 3.62, hi], [xs, y + 3.45, hi]]); }
  }
  pfill(mixc(IRON, a), 1);
}

// a water tank on the roof, the one thing a New York skyline always has
function roofTank(side, X, za, zb, hB) {
  const dir = -side, x0 = X + dir * 3.0, x1 = X + dir * 5.2, zc = (za + zb) / 2;
  if (zc - VZ < 16 || zc - VZ > R(46) || hB + 5 > topOf(zc - VZ)) return;
  const lo = Math.min(x0, x1), hi = Math.max(x0, x1), wood = hex('#6b4a30');
  box3D(lo, hi, hB, hB + 0.8, zc - 1.0, zc + 1.0, hex('#3a3f48'));
  box3D(lo, hi, hB + 0.8, hB + 3.4, zc - 1.1, zc + 1.1, wood);
  box3D(lo - 0.1, hi + 0.1, hB + 3.4, hB + 3.7, zc - 1.2, zc + 1.2, hex('#4a4038'));
  box3D(lo + 0.9, lo + 1.3, hB + 3.7, hB + 5.0, zc - 0.2, zc + 0.2, hex('#5b6470'));
}

// a band along the roofline (and one over the shopfronts) so buildings have an edge
function cornices(side, X, za, zb, da, hB) {
  const [a, b] = sub(za, zb);
  if (hB < topOf(a)) wq(X, hB - 0.9, hB, a, b, mixc(STONE, a));
  if (da < R(38) && side > 0) wq(X, 4.4, 4.62, a, b, mixc(STONE, a));
}

function rightFacade(k, za, zb, da, db, bi, sIdx, par) {
  const X = LV.half, hB = 16 + mod(bi * 37, 7) * 5, shop = SHOPS[Math.floor(hsh(bi, 1) * SHOPS.length)], hoard = mod(bi, 3) === 1;
  const [wa, wb] = sub(za + 0.25, zb - 0.25);
  if (da < 55) cornices(1, X, za, zb, da, hB);
  if (wb <= 0.2) return;
  if (da < R(40)) {
    wq(X, 0, 0.35, ...sub(za, zb), mixc(scl(STONE, 0.8), wa));                              // stone plinth
    if (hoard) {                                                                              // closed up: plywood hoarding, posters, a tag
      wq(X, 0.15, 3.0, wa, wb, mixc(PLY, wa));
      for (let i = 0; i < 3; i++) {
        const u = hsh(k, i + 40), y = 0.5 + hsh(k, i + 50) * 1.6, w = 0.35 + hsh(k, i + 60) * 0.5;
        const [pa, pb] = sub(za + 0.35 + u * 1.2, za + 0.35 + u * 1.2 + w);
        if (pb > 0.2) wq(X, y, y + 0.7 + hsh(k, i + 70) * 0.4, pa, pb, mixc(hex(POSTERS[Math.floor(hsh(k, i + 80) * POSTERS.length)]), pa));
      }
      if (hsh(bi, 5) < 0.6 && sIdx === 2) {
        const c = P(X, 0.5, wa), e = P(X, 0.7, wb); ctx.strokeStyle = 'rgba(30,20,60,0.55)'; ctx.lineWidth = Math.max(1, 0.1 * F / wa);
        ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.bezierCurveTo(c[0], c[1] - 0.8 * F / wa, e[0], e[1] + 0.9 * F / wb, e[0], e[1] - 0.2 * F / wb); ctx.stroke();
      }
    } else {
      wqA(X, 0.4, 2.75, wa, wb, mixc(shop.g, wa), 0.55);                                      // the shop is lit inside
      if (shop.n === 'DELI' || shop.n === 'BAGELS' || shop.n === 'BOOKS')
        for (let r = 0; r < 2; r++) wqA(X, 0.9 + r * 0.7, 1.35 + r * 0.7, ...sub(za + 0.45, zb - 0.45), mixc(hex(GOODS[Math.floor(hsh(k, r + 20) * GOODS.length)]), wa), 0.8);
      if (sIdx === 2) { const [da2, db2] = sub(za + 0.9, za + 1.9); if (db2 > 0.2) { wqA(X, 0.12, 2.6, da2, db2, mixc(IRON, da2), 0.75); wqA(X, 0.2, 2.5, da2 + 0.05, db2 - 0.05, mixc(shop.g, da2), 0.5); } }
      // sign board above the awning, with the shop's name painted along it
      wq(X, 3.55, 4.35, ...sub(za, zb), mixc(shop.c, wa));
      if (sIdx === 1) wallText(shop.n, X, 3.95, za + 1.5, 0.5, '#fff6dc', 1);
      // awning stripes and a valance on the awnings that exist
      if (mod(bi, 3) !== 1 && wa < R(38)) {
        const ac = hex(AWN[mod(bi, AWN.length)]), lite = scl(ac, 2.1);
        ctx.beginPath(); for (let s = 0; s < 3; s++) { const [sa, sb] = sub(za + 0.45 + s * 0.8, za + 0.8 + s * 0.8); if (sb > 0.2) padd([[X, 3.45, sa], [X - 1.1, 2.95, sa], [X - 1.1, 2.95, sb], [X, 3.45, sb]]); } pfill(mixc(lite, wa), 1);
        wq(X - 1.1, 2.72, 2.95, wa, wb, mixc(scl(ac, 0.8), wa));
      }
    }
  }
  windows(1, X, za, zb, da, hB, k, false);
  if (da < R(36) && hsh(bi, 2) < 0.4 && (sIdx === 1 || sIdx === 2)) fireEscape(1, X, za, zb, hB, sIdx);
  if (sIdx === 1 && hB > 24 && hsh(bi, 3) < 0.35) roofTank(1, X, za, zb, hB);
  // blade sign and flag on the corner pier of some buildings (they face the camera, high over the sidewalk)
  if (sIdx === 0 && da > 6 && da < R(44)) {
    ctx.globalAlpha = clamp((da - 6) / 5, 0, 1) * fogA(da);
    if (hsh(bi, 4) < 0.45 && !hoard) {
      const sx0 = X - 1.35, sx1 = X - 0.3;
      cq(sx0, sx1, 3.55, 4.4, da, mixc(shop.c, da)); cq(sx0 + 0.06, sx1 - 0.06, 3.61, 4.34, da, mixc(shop.g, da));
      cq(X - 1.4, X, 4.42, 4.48, da, mixc(IRON, da));
      const q = P((sx0 + sx1) / 2, 3.98, da); label(shop.n.length > 5 ? shop.n.slice(0, 5) : shop.n, q[0], q[1], 0.2 * F / da, '#2b1d14');
    } else if (hsh(bi, 6) < 0.35) {
      const wave = calm ? 0 : Math.sin((S.clock || 0) * 2.2 + bi) * 0.08;
      cq(X - 1.5, X, 7.3, 7.36, da, mixc(IRON, da));
      for (let s = 0; s < 4; s++) cq(X - 1.45 + wave, X - 0.35 + wave, 6.2 + s * 0.2, 6.4 + s * 0.2, da, mixc(s & 1 ? hex('#f4f1ea') : hex('#c0392b'), da));
      cq(X - 1.45 + wave, X - 0.95 + wave, 6.6, 7.0, da, mixc(hex('#2b4a8b'), da));
    }
    ctx.globalAlpha = 1;
  }
}

function farFacade(k, za, zb, da, db, bi, sIdx) {
  const X = FAR_X, hB = 18 + mod(bi * 53, 6) * 5;
  // the sidewalk across the avenue, with its own kerb
  fq(X, -14.45, 0.003, da, db, mixc(WALK, da));
  if (da < 55) cornices(-1, X, za, zb, da, hB);
  const [wa, wb] = sub(za + 0.25, zb - 0.25);
  if (wb > 0.2 && wa < R(46)) {
    const shop = SHOPS[Math.floor(hsh(bi, 21) * SHOPS.length)];
    wq(X, 0.2, 3.0, wa, wb, mixc(hex('#33475b'), wa));
    wqA(X, 0.5, 2.8, wa, wb, mixc(shop.g, wa), 0.5);
    wq(X, 3.3, 4.1, ...sub(za, zb), mixc(shop.c, wa));
    if (mod(bi, 3) !== 0) { const ac = hex(AWN[mod(bi + 1, AWN.length)]); poly([[X, 3.2, wa], [X + 1.1, 2.75, wa], [X + 1.1, 2.75, wb], [X, 3.2, wb]], mixc(ac, wa)); }
  }
  windows(-1, X, za, zb, da, hB, k + 977, true);
  if (da < R(36) && hsh(bi, 22) < 0.35 && (sIdx === 1 || sIdx === 2)) fireEscape(-1, X, za, zb, hB, sIdx);
  if (sIdx === 1 && hB > 28 && hsh(bi, 23) < 0.4) roofTank(-1, X, za, zb, hB);
}

/* ---------- ground: sidewalk wear, road wear ---------- */
function sidewalkSeg(k, za, zb, da, db) {
  const hw = LV.half, fa = fogA(da);
  // grime along the wall and the gutter, so the surface is not one flat tone
  ctx.beginPath(); padd([[hw - 0.35, 0.004, da], [hw, 0.004, da], [hw, 0.004, db], [hw - 0.35, 0.004, db]]); padd([[-4.4, 0.004, da], [-4.15, 0.004, da], [-4.15, 0.004, db], [-4.4, 0.004, db]]); pfill('#3a2f26', 0.1 * fa);
  fq(-5.1, -4.75, 0.004, da, db, mixc(hex('#34373d'), da));                              // gutter
  if (mod(k, 8) === 3 && da < R(46)) { fq(-5.05, -4.8, 0.007, da, db, mixc(hex('#16181c'), da)); fq(-5.05, -4.8, 0.007, Math.min(da + 0.4, db), Math.min(da + 0.55, db), mixc(hex('#60656d'), da)); }   // drain grate
  // per lot (12 m): a crack, gum, a stain, now and then a grate or a manhole. All faint, all flat.
  if (mod(k, 4) !== 0 || da > R(40)) return;
  const bi = Math.floor(za / 12), zz = za + hsh(bi, 70) * 8, d0 = Math.max(0.3, zz - VZ);
  ctx.strokeStyle = 'rgba(70,62,55,' + (0.32 * fa).toFixed(2) + ')'; ctx.lineWidth = Math.max(0.7, 0.025 * F / d0); ctx.beginPath();
  let cx = -3 + hsh(bi, 71) * 6.5, cz = zz;
  for (let i = 0; i < 4; i++) { const q = P(cx, 0, Math.max(0.3, cz - VZ)); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); cx += (hsh(bi, 72 + i) - 0.5) * 0.7; cz += 0.35 + hsh(bi, 76 + i) * 0.35; }
  ctx.stroke();
  const gx = -3 + hsh(bi, 80) * 7, gz = za + 0.5 + hsh(bi, 81) * 7;
  ctx.beginPath(); for (let i = 0; i < 4; i++) { const ex = gx + (hsh(bi, 82 + i) - 0.5) * 0.7, ez = gz + (hsh(bi, 86 + i) - 0.5) * 0.7; padd([[ex - 0.05, 0.006, Math.max(0.2, ez - 0.05 - VZ)], [ex + 0.05, 0.006, Math.max(0.2, ez - 0.05 - VZ)], [ex + 0.05, 0.006, Math.max(0.2, ez + 0.05 - VZ)], [ex - 0.05, 0.006, Math.max(0.2, ez + 0.05 - VZ)]]); } pfill('rgb(110,104,98)', 0.5 * fa);
  disc(-2.4 + hsh(bi, 90) * 5, za + 2 + hsh(bi, 91) * 6, 0.55 + hsh(bi, 92) * 0.4, rgba([95, 84, 72], 0.055 * fa), 14);   // a stain
  const t = hsh(bi, 93);
  if (t < 0.17) {                                                                           // a subway grate by the kerb
    const z0 = za + 3, [a, b] = sub(z0, z0 + 2.2); if (b > 0.2) {
      fq(-4.3, -3.2, 0.006, a, b, rgba([40, 42, 48], 0.55 * fa));
      ctx.strokeStyle = rgba([150, 155, 165], 0.4 * fa); ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 1; i < 6; i++) { const z = z0 + i * 0.36, p1 = P(-4.3, 0.006, Math.max(0.3, z - VZ)), p2 = P(-3.2, 0.006, Math.max(0.3, z - VZ)); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); }
      ctx.stroke();
    }
  } else if (t < 0.4) { const mx = -1.5 + hsh(bi, 94) * 4.5, mz = za + 3 + hsh(bi, 95) * 5; disc(mx, mz, 0.36, rgba([70, 66, 62], 0.5 * fa), 12); disc(mx, mz, 0.24, rgba([110, 104, 98], 0.3 * fa), 12); }
  else if (t < 0.55) { const fx = -2 + hsh(bi, 96) * 4, fz = za + 2 + hsh(bi, 97) * 6, r = hsh(bi, 98) * 3; poly([[fx, 0.006, Math.max(0.2, fz - VZ)], [fx + 0.3 * Math.cos(r), 0.006, Math.max(0.2, fz + 0.3 * Math.sin(r) - VZ)], [fx + 0.3 * Math.cos(r) - 0.2 * Math.sin(r), 0.006, Math.max(0.2, fz + 0.3 * Math.sin(r) + 0.2 * Math.cos(r) - VZ)], [fx - 0.2 * Math.sin(r), 0.006, Math.max(0.2, fz + 0.2 * Math.cos(r) - VZ)]], rgba([245, 240, 225], 0.55 * fa)); }   // a dropped flyer
}

function roadLot(za, bi) {
  // manhole covers along the lane gaps
  const l = Math.floor(za / 36), z = l * 36 + 6 + hsh(l, 30) * 20, x = hsh(l, 31) < 0.5 ? -7.9 : -10.9;
  if (z >= za && z < za + 3 && !inXing(z)) { disc(x, z, 0.42, mixc(hex('#2c2e34'), z - VZ)); disc(x, z, 0.3, mixc(hex('#4a4d55'), z - VZ)); }
}

/* ---------- the call from world.js: once per 3 m segment, far to near ---------- */
export function nycSegment(k, za, zb, da, db, xing) {
  lod.begin();
  const bi = Math.floor(za / 12), sIdx = mod(k, 4);
  farFacade(k, za, zb, da, db, bi, sIdx);
  if (!xing) { rightFacade(k, za, zb, da, db, bi, sIdx, k & 1); if (da < R(50)) sidewalkSeg(k, za, zb, da, db); }
  if (da < 60 && !xing) roadLot(za, bi);
  lod.end();
}

/* ---------- sky ---------- */
export function nycSky() {
  const t = S.clock || 0, y0 = HOR - H * 0.42, span = H * 0.3;
  // a far tower on the horizon (Fifth Avenue does end at one), pale with haze
  const tx = W / 2 - VX * 0.4, ty = HOR, u = Math.min(W, H) / 390;
  ctx.fillStyle = 'rgba(176,192,208,0.55)';
  ctx.beginPath(); ctx.rect(tx - 15 * u, ty - 60 * u, 30 * u, 60 * u); ctx.rect(tx - 10 * u, ty - 92 * u, 20 * u, 32 * u); ctx.rect(tx - 6 * u, ty - 118 * u, 12 * u, 26 * u);
  ctx.moveTo(tx - 3 * u, ty - 118 * u); ctx.lineTo(tx, ty - 150 * u); ctx.lineTo(tx + 3 * u, ty - 118 * u); ctx.closePath(); ctx.fill();
  // clouds drifting slowly (they hold still when calm visuals are on)
  const drift = calm ? 0 : t;
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  for (let i = 0; i < 4; i++) {
    const cw = (70 + hsh(i, 5) * 60) * u, cx = ((hsh(i, 6) * (W + 240) + drift * (3 + i * 1.3) - VX * 3) % (W + 240) + (W + 240)) % (W + 240) - 120, cy = y0 + span * (0.1 + 0.8 * hsh(i, 7));
    ctx.beginPath(); ctx.ellipse(cx, cy, cw * 0.5, cw * 0.14, 0, 0, TAU); ctx.ellipse(cx - cw * 0.18, cy - cw * 0.08, cw * 0.28, cw * 0.14, 0, 0, TAU); ctx.ellipse(cx + cw * 0.14, cy - cw * 0.12, cw * 0.22, cw * 0.15, 0, 0, TAU); ctx.fill();
  }
  // a flock of pigeons crossing now and then
  if (!calm) {
    const cyc = (t / 38) % 1;
    if (cyc < 0.3) {
      const p = cyc / 0.3, fx = -40 + p * (W + 80), fy = y0 + span * 0.25;
      ctx.strokeStyle = 'rgba(60,66,80,0.7)'; ctx.lineWidth = 1.4 * u; ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const bx = fx - Math.abs(i - 3) * 11 * u - (i > 3 ? 4 : 0), by = fy + Math.abs(i - 3) * 5 * u + Math.sin(t * 2 + i) * 2, fl = Math.sin(t * 11 + i * 1.7) * 4 * u;
        ctx.moveTo(bx - 5 * u, by + fl * 0.6); ctx.quadraticCurveTo(bx - 2 * u, by - 3 * u - fl, bx, by); ctx.quadraticCurveTo(bx + 2 * u, by - 3 * u - fl, bx + 5 * u, by + fl * 0.6);
      }
      ctx.stroke();
    }
  }
}

/* ---------- after the segment loop: things on the far kerb, tyre tracks ---------- */
function farLamps() {
  const z0 = Math.floor(VZ / 28) * 28;
  for (let z = z0 + 112; z >= z0; z -= 28) {
    const d = z + 9 - VZ; if (d < 2 || d > 70) continue;
    const c = mixc(hex('#3a4a40'), d), x = -14.8;
    cq(x - 0.07, x + 0.07, 0, 4.4, d, c); cq(x, x + 1.0, 4.35, 4.48, d, c);
    const q = P(x + 1.0, 4.3, d); ball(q[0], q[1], 0.16 * F / d, '#fff3c4', '#ffffff', '#d8c58a');
  }
}

// people on the pavement across the avenue: small, unhurried, and nothing you can hit
const FAR_FOLK = 9;
function farFolk() {
  const t = S.clock || 0, ring = 190, base = VZ - 20, list = [];
  for (let i = 0; i < FAR_FOLK; i++) {
    const dir = i & 1 ? 1 : -1, sp = 1.0 + hsh(i, 40) * 0.7, z = base + mod(hsh(i, 41) * ring + dir * sp * t - base, ring), d = z - VZ;
    if (d < 4 || d > 64) continue;
    list.push({ i, dir, z, d, x: -15.5 + hsh(i, 42) * 0.7 });
  }
  list.sort((a, b) => b.d - a.d);
  for (const f of list) {
    const s = F / f.d, [bx, by] = P(f.x, 0, f.d), sw = calm ? 0 : Math.sin(t * 6 + f.i * 2) * 0.16, fa = fogA(f.d);
    ctx.globalAlpha = fa;
    const shirt = mixc(hex(SHIRTS[Math.floor(hsh(f.i, 43) * SHIRTS.length)]), f.d), pants = mixc(hex('#2b303b'), f.d);
    ctx.fillStyle = pants; ctx.fillRect(bx - 0.17 * s + sw * s * 0.5, by - 0.85 * s, 0.14 * s, 0.85 * s); ctx.fillRect(bx + 0.03 * s - sw * s * 0.5, by - 0.85 * s, 0.14 * s, 0.85 * s);
    ctx.fillStyle = shirt; ctx.fillRect(bx - 0.22 * s, by - 1.45 * s, 0.44 * s, 0.65 * s);
    ctx.fillStyle = mixc(hex(SKINS[Math.floor(hsh(f.i, 44) * SKINS.length)]), f.d); ctx.beginPath(); ctx.arc(bx, by - 1.62 * s, 0.14 * s, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export function nycAfterLoop() {
  lod.frame();
  // two tyre tracks in every lane and a worn centre, one shape each, faded with distance by a single gradient
  const g = ctx.createLinearGradient(0, HOR, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.11)');
  for (const lx of [-6.4, -9.4, -12.4]) for (const s of [-0.8, 0.8]) poly([[lx + s - 0.25, 0.003, 0.6], [lx + s + 0.25, 0.003, 0.6], [lx + s + 0.25, 0.003, 85], [lx + s - 0.25, 0.003, 85]], g);
  farLamps();
  farFolk();
}

/* ---------- steam from the street, over the traffic ---------- */
export function nycSteam() {
  const t = S.clock || 0;
  for (let l = Math.floor((VZ - 10) / 120); l <= Math.floor((VZ + 90) / 120); l++) {
    if (hsh(l, 50) > 0.7) continue;
    const z = l * 120 + 30 + hsh(l, 51) * 60, x = hsh(l, 52) < 0.5 ? -7.9 : -10.9, d = z - VZ;
    if (d < 4 || d > 66 || inXing(z)) continue;
    // an orange and white stack by the lane, and the plume above it
    const base = P(x, 0, d), top = P(x, 1.5, d), w = 0.3 * F / d;
    ctx.fillStyle = mixc(hex('#e8620f'), d); ctx.beginPath(); ctx.moveTo(base[0] - w, base[1]); ctx.lineTo(base[0] + w, base[1]); ctx.lineTo(top[0] + w * 0.4, top[1]); ctx.lineTo(top[0] - w * 0.4, top[1]); ctx.closePath(); ctx.fill();
    ctx.fillStyle = mixc(hex('#f4f1ea'), d); ctx.beginPath(); ctx.moveTo(base[0] - w * 0.78, base[1] - 0.6 * F / d); ctx.lineTo(base[0] + w * 0.78, base[1] - 0.6 * F / d); ctx.lineTo(base[0] + w * 0.6, base[1] - 0.8 * F / d); ctx.lineTo(base[0] - w * 0.6, base[1] - 0.8 * F / d); ctx.closePath(); ctx.fill();
    const fa = fogA(d);
    for (let i = 0; i < 7; i++) {
      const age = ((t * 0.28 + i / 7 + hsh(l, 53)) % 1), q = P(x + age * 1.4, 1.4 + age * 7, d), r = (0.35 + age * 1.5) * F / d;
      ctx.globalAlpha = 0.5 * (1 - age) * (age < 0.1 ? age * 10 : 1) * fa; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
