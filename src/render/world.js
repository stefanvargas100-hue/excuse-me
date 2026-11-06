import { AWN, BLD, C, INK, NEON, NIGHTBLD, SHOPFRONTS, hex, scl } from '../config/colour.js';
import { LV, mixc } from '../config/levels.js';
import { CEIL } from '../config/tuning.js';
import { clamp, mod } from '../config/util.js';
import { ctx } from '../dom.js';
import { F, VZ } from './camera.js';
import { P, ball, box3D, cq, forSegs, fq, label, poly, sky, sub, wq } from './draw.js';
import { inXing } from '../sim/people.js';
import { S, goalOf } from '../sim/state.js';



function goalAirport(d) {
  const w = LV.half;
  cq(-w, w, 0, CEIL, d, mixc(C.navy, d));
  cq(-1.6, 1.6, 0, 2.7, d, mixc(C.glow, d));
  cq(-3.4, 3.4, 3.0, 4.1, d, mixc(C.sign, d));
  const c = P(0, 3.55, d);
  label(LV.goalText, c[0], c[1], 0.8 * F / d, INK);
  for (const sx of [-4.6, 4.6]) cq(sx - 0.9, sx + 0.9, 0.9, 1.1, d, mixc(C.sign, d));
}

export function paintAirport() {
  const Wl = LV.half;
  if (goalOf() - VZ < 84) goalAirport(goalOf() - VZ);
  forSegs(3, 82, (k, za, zb, da, db) => {
    const par = k & 1;
    fq(-Wl, Wl, CEIL, da, db, mixc(C.ceil, da));
    if (!par) {
      const [pa, pb] = sub(za + 0.5, zb - 0.5);
      if (pb > 0.2) for (const r of [[-1.3, 1.3], [-5.3, -3.3], [3.3, 5.3]]) fq(r[0], r[1], CEIL, pa, pb, mixc(C.panel, pa));
    }
    fq(-5, 5, 0, da, db, mixc(par ? C.tileA : C.tileB, da));
    fq(-Wl, -5, 0, da, db, mixc(par ? C.carA : C.carB, da));
    fq(5, Wl, 0, da, db, mixc(par ? C.carA : C.carB, da));
    if (!par) { const [a, b] = sub(za + 0.4, zb - 0.4); if (b > 0.2) fq(-0.07, 0.07, 0, a, b, mixc(C.sign, a)); }
    ctx.strokeStyle = 'rgba(15,27,45,0.10)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = -4; x <= 4; x += 2) { const a = P(x, 0, da), b = P(x, 0, db); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    ctx.stroke();
    for (const side of [-1, 1]) {
      const wx = side * Wl;
      wq(wx, 0, CEIL, da, db, mixc(C.wall, da));
      if (mod(k, 4) === 0) {
        const [pa, pb] = sub(za - 0.35, za + 0.35);
        if (pb > 0.2) wq(side * (Wl - 0.6), 0, CEIL, pa, pb, mixc(C.pillar, pa));
      } else {
        const [wa, wb] = sub(za + 0.2, zb - 0.2);
        if (wb > 0.2) {
          if (side < 0) wq(wx, 0.9, 3.8, wa, wb, mixc(C.glass, wa));
          else {
            wq(wx, 0.4, 2.7, wa, wb, mixc(C.shop, wa));
            wq(wx, 3.0, 3.9, wa, wb, mixc(SHOPFRONTS[mod(Math.floor(k / 4) + k, SHOPFRONTS.length)], wa));
          }
        }
      }
    }
    if (mod(k, 10) === 0 && za - VZ > 6) {
      const d = za - VZ;
      ctx.globalAlpha = clamp((d - 6) / 5, 0, 1);   // overhead signs fade out before they pass over the camera
      cq(-2.5, 2.5, 3.05, 3.95, d, mixc(C.sign, d));
      for (const hx of [-2, 2]) cq(hx - 0.04, hx + 0.04, 3.95, CEIL, d, mixc(C.navy, d));
      const c = P(0, 3.5, d);
      label('GATES B1 – B20', c[0], c[1] - 0.12 * F / d, 0.42 * F / d, INK);
      label('TERMINAL B', c[0], c[1] + 0.26 * F / d, 0.26 * F / d, INK);
      ctx.globalAlpha = 1;
    }
  });
}

function goalNYC(d) {
  cq(-17, 17, 0, 34, d, mixc(hex('#857868'), d));
  for (let y = 4.5; y < 30; y += 3.4) for (let x = -15; x < 15; x += 2.6) cq(x, x + 1.3, y, y + 1.9, d, mixc(C.win, d));
  cq(-1.7, 1.7, 0, 2.5, d, mixc(hex('#121417'), d));
  cq(-2.8, 2.8, 2.6, 3.4, d, mixc(hex('#0f5132'), d));
  const c = P(0, 3.0, d);
  label(LV.goalText, c[0], c[1], 0.55 * F / d, '#ffffff');
  for (const sx of [-2.3, 2.3]) {
    const q = P(sx, 2.2, d), r = 0.22 * F / d;
    ball(q[0], q[1], r, '#2ecc71', '#b6ffd5', '#137a43');
    cq(sx - 0.05, sx + 0.05, 0, 2.0, d, mixc(hex('#1f3d2b'), d));
  }
}

export function paintNYC() {
  sky('#7fb0dd');
  const hw = LV.half;
  if (goalOf() - VZ < 86) goalNYC(goalOf() - VZ);
  forSegs(3, 85, (k, za, zb, da, db) => {
    const par = k & 1, xing = inXing(za + 0.1), bi = Math.floor(za / 12);
    wq(-17, 0, 18 + mod(bi * 53, 6) * 5, da, db, mixc(scl(hex(BLD[mod(bi + 3, BLD.length)]), 0.85), da));
    fq(-17, -4.75, 0, da, db, mixc(par ? C.asA : C.asB, da));
    if (!par) { const [a, b] = sub(za + 0.6, zb - 0.6); if (b > 0.2) { fq(-8.0, -7.85, 0.003, a, b, mixc(C.white, a)); fq(-11.0, -10.85, 0.003, a, b, mixc(C.white, a)); } }
    fq(-14.0, -13.85, 0.003, da, db, mixc(C.yline, da));
    if (xing) {
      fq(-4.75, 17, 0, da, db, mixc(par ? C.asA : C.asB, da));
      for (let x = -3.9; x < 3.9; x += 1.2) fq(x, x + 0.6, 0.004, da, db, mixc(C.white, da));
      wq(17, 0, 24, da, db, mixc(hex('#9a8f80'), da));
    } else {
      fq(-4.75, -4.4, 0.01, da, db, mixc(C.curb, da));
      fq(-4.4, hw, 0, da, db, mixc(par ? C.walkA : C.walkB, da));
      if (za - VZ > 0.2) {
        ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1; ctx.beginPath();
        const a = P(-4.4, 0, za - VZ), b = P(hw, 0, za - VZ); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
      const col = hex(BLD[mod(bi, BLD.length)]), hB = 16 + mod(bi * 37, 7) * 5;
      wq(hw, 0, hB, da, db, mixc(col, da));
      if (inXing(za - 1)) cq(hw, 17, 0, hB, da, mixc(scl(col, 0.85), da));   // corner building facing us across the side street
      const [wa, wb] = sub(za + 0.25, zb - 0.25);
      if (wb > 0.2) {
        wq(hw, 0.15, 3.0, wa, wb, mixc(C.glassDark, wa));
        if (mod(bi, 3) !== 1) poly([[hw, 3.45, wa], [hw - 1.1, 2.95, wa], [hw - 1.1, 2.95, wb], [hw, 3.45, wb]], mixc(scl(hex(AWN[mod(bi, AWN.length)]), par ? 1 : 1.25), wa));
        if (wa < 55) { const [a, b] = sub(za + 0.6, zb - 0.6); if (b > 0.2) for (let y = 4.6; y < hB - 1.5 && y < 26; y += 3.4) wq(hw, y, y + 1.9, a, b, mixc(C.win, a)); }
      }
    }
  });
}

function goalShibuya(d) {
  cq(-15, 15, 0, 28, d, mixc(hex('#221d38'), d));
  cq(-6, 6, 7, 13, d, mixc(hex(NEON[0]), d * 0.5));
  cq(-3, 3, 0, 3, d, mixc(C.glow, d));
  cq(-4.2, 4.2, 3.3, 4.6, d, mixc(hex('#1d8f4e'), d));
  const c = P(0, 3.95, d);
  label(LV.goalText, c[0], c[1], 0.8 * F / d, '#ffffff');
}

export function paintShibuya() {
  sky('#0e0b1f');
  if (goalOf() - VZ < 86) goalShibuya(goalOf() - VZ);
  const hw = 15;
  forSegs(3, 85, (k, za, zb, da, db) => {
    const par = k & 1, m = mod(za, 45);
    fq(-hw, hw, 0, da, db, mixc(par ? C.nightA : C.nightB, da));
    if (m >= 6 && m < 33) for (let x = -10.2; x < 10.2; x += 1.25) fq(x, x + 0.65, 0.004, da, db, mixc(C.zebra, da));
    if (m === 36 || m === 39) for (let zz = za; zz < zb; zz += 1.2) { const [a, b] = sub(zz, zz + 0.6); if (b > 0.2) fq(-hw, hw, 0.004, a, b, mixc(C.zebra, a)); }
    for (const sd of [-1, 1]) {
      fq(sd * 11.6, sd * hw, 0.02, da, db, mixc(C.nightWalk, da));
      wq(sd * hw, 0, 30, da, db, mixc(hex(NIGHTBLD[mod((k >> 2) + (sd > 0 ? 1 : 0), NIGHTBLD.length)]), da));
      const [wa, wb] = sub(za + 0.3, zb - 0.3);
      if (wb > 0.2) {
        wq(sd * hw, 0.2, 3.2, wa, wb, mixc(C.shopNight, wa * 0.7));
        if (mod((k >> 1) + (sd > 0 ? 1 : 0), 3) === 0) {
          const nc = hex(NEON[mod(k + (sd > 0 ? 2 : 0), NEON.length)]);
          ctx.globalAlpha = 0.35; wq(sd * hw, 5.4, 14.6, Math.max(0.2, wa - 0.3), wb + 0.3, mixc(nc, wa * 0.5)); ctx.globalAlpha = 1;
          wq(sd * hw, 6, 14, wa, wb, mixc(nc, wa * 0.5));
        } else if (wa < 60) {
          const [a, b] = sub(za + 0.7, zb - 0.7);
          if (b > 0.2) for (let y = 5; y < 26; y += 3) wq(sd * hw, y, y + 1.2, a, b, mixc(C.litWin, a * 0.7));
        }
      }
    }
  });
}

export function drawCars() {
  const list = S.cars.slice().sort((a, b) => b.z - a.z);
  for (const c of list) {
    const d = c.z - VZ;
    if (d < 1 || d > 92) continue;
    const x = c.x, z = c.z;
    fq(x - 1.0, x + 1.0, 0.01, Math.max(0.2, z - 2.4 - VZ), z + 2.4 - VZ, 'rgba(0,0,0,0.25)');
    box3D(x - 0.95, x + 0.95, 0.22, 1.0, z - 2.3, z + 2.3, c.col);
    box3D(x - 0.8, x + 0.8, 1.0, 1.5, z - 1.0, z + 1.1, scl(hex('#2a3644'), 1));
    if (c.taxi) box3D(x - 0.25, x + 0.25, 1.5, 1.68, z - 0.15, z + 0.15, hex('#f4f1ea'));
    const fd = z - 2.3 - VZ;
    if (fd > 0.4) {
      const col = c.front ? '#fff4c8' : '#e3342f';
      for (const lx of [-0.68, 0.48]) cq(x + lx, x + lx + 0.2, 0.62, 0.78, fd - 0.01, col);
    }
  }
}
