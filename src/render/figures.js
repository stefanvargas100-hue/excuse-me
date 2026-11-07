import { INK, hex, shade } from '../config/colour.js';
import { FACE_DEFAULT } from '../config/faces.js';
import { DRAW_FAR, LV, fogA } from '../config/levels.js';
import { TAU, clamp, sgn } from '../config/util.js';
import { ctx } from '../dom.js';
import { CX, F, HOR, VX, VY, VZ, W } from './camera.js';
import { FONT, W3, ball, box3D, label } from './draw.js';
import { S, cues, showHB } from '../sim/state.js';



/* ---------- people rendering: a projected 3D skeleton with shaded, rounded limbs ---------- */
// Hand-drawn look: everything near the camera gets an ink outline, in the same ink as the menus.
const LINE = '#3a2a4d';

let TAP = null;   // [top, middle, bottom] thickness multipliers while drawing a limb
const LEG_TAP = [1.14, 0.9, 0.7], ARM_TAP = [1.12, 0.92, 0.76];
const tapAt = f => (f < 0.5 ? TAP[0] + (TAP[1] - TAP[0]) * f * 2 : TAP[1] + (TAP[2] - TAP[1]) * (f - 0.5) * 2);

// One tapered pass: each segment is a quad between two circles, so a limb narrows smoothly.
function taperPass(pts, w, grow, col, ox, oy, k) {
  ctx.fillStyle = col;
  const n = pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[i + 1], ra = (w * tapAt(i / n) * k + grow) / 2, rb = (w * tapAt((i + 1) / n) * k + grow) / 2;
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    ctx.beginPath();
    ctx.moveTo(a[0] + nx * ra + ox, a[1] + ny * ra + oy); ctx.lineTo(b[0] + nx * rb + ox, b[1] + ny * rb + oy);
    ctx.lineTo(b[0] - nx * rb + ox, b[1] - ny * rb + oy); ctx.lineTo(a[0] - nx * ra + ox, a[1] - ny * ra + oy); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(a[0] + ox, a[1] + oy, ra, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(b[0] + ox, b[1] + oy, rb, 0, TAU); ctx.fill();
  }
}

function capsule(pts, w, base, dark, light) {
  if (TAP && w > 3) {
    if (w > 3.5) taperPass(pts, w, Math.max(1.2, w * 0.26), LINE, 0, 0, 1);
    taperPass(pts, w, 0, dark, 0, 0, 1);
    taperPass(pts, w, 0, base, -w * 0.09, -w * 0.07, 0.7);
    if (light && w > 6) taperPass(pts, w, 0, light, -w * 0.2, -w * 0.16, 0.22);
    return;
  }
  const run = (ox, oy) => {
    ctx.beginPath(); ctx.moveTo(pts[0][0] + ox, pts[0][1] + oy);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] + ox, pts[i][1] + oy);
    ctx.stroke();
  };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (w > 3.5) { ctx.strokeStyle = LINE; ctx.lineWidth = w + Math.max(1.2, w * 0.26); run(0, 0); }
  ctx.strokeStyle = dark; ctx.lineWidth = w; run(0, 0);
  ctx.strokeStyle = base; ctx.lineWidth = w * 0.7; run(-w * 0.09, -w * 0.07);
  if (light && w > 6) { ctx.strokeStyle = light; ctx.lineWidth = w * 0.22; run(-w * 0.2, -w * 0.16); }
}

export function rrect(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }

function drawCase(p, s) {
  const cx0 = p.x + p.lug * 0.5, w = 0.36, dd = 0.22, h = 0.55;
  const x0 = cx0 - w / 2, x1 = cx0 + w / 2, zn = p.z - dd / 2, zf = p.z + dd / 2;
  const fill = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fill(); };
  const sx = cx0 > VX ? x0 : x1;
  fill([W3(sx, 0.03, zn), W3(sx, h, zn), W3(sx, h, zf), W3(sx, 0.03, zf)], p.lugD);
  fill([W3(x0, h, zn), W3(x1, h, zn), W3(x1, h, zf), W3(x0, h, zf)], p.lugL);
  fill([W3(x0, 0.03, zn), W3(x1, 0.03, zn), W3(x1, h, zn), W3(x0, h, zn)], p.lugCol);
  const hp = [W3(cx0 - 0.07, h, p.z), W3(cx0 - 0.07, 0.92, p.z), W3(cx0 + 0.07, 0.92, p.z), W3(cx0 + 0.07, h, p.z)];
  ctx.strokeStyle = '#4b5563'; ctx.lineWidth = Math.max(1, 0.025 * s);
  ctx.beginPath(); hp.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke();
  ctx.fillStyle = '#111827';
  for (const wx of [x0 + 0.05, x1 - 0.05]) { const q = W3(wx, 0.03, zn); ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(1, 0.035 * s), 0, TAU); ctx.fill(); }
  return W3(cx0, 0.92, p.z);
}

function drawDog(p, s) {
  const dx = p.x + p.dog * 0.55, dz = p.z + 0.15, c = hex(p.dogCol);
  const f = p.fz >= 0 ? 1 : -1, wag = Math.sin(p.phase * 2) * 0.05;
  box3D(dx - 0.12, dx + 0.12, 0.22, 0.46, dz - 0.3, dz + 0.3, c);
  const hd = W3(dx, 0.55, dz + f * 0.36), r = 0.11 * F / Math.max(0.3, hd[2]);
  const cs = 'rgb(' + c.join(',') + ')';
  ball(hd[0], hd[1], r, cs, shade('#' + c.map(v => (v | 0).toString(16).padStart(2, '0')).join(''), 1.2), shade('#' + c.map(v => (v | 0).toString(16).padStart(2, '0')).join(''), 0.6));
  ctx.strokeStyle = cs; ctx.lineWidth = Math.max(1, 0.05 * s); ctx.lineCap = 'round';
  for (const [lx, lz] of [[-0.08, -0.22], [0.08, -0.22], [-0.08, 0.22], [0.08, 0.22]]) {
    const a = W3(dx + lx, 0.24, dz + lz), b = W3(dx + lx, 0.02, dz + lz + Math.sin(p.phase + lz * 10) * 0.05);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  const ta = W3(dx, 0.44, dz - f * 0.3), tb = W3(dx + wag, 0.6, dz - f * 0.42);
  ctx.beginPath(); ctx.moveTo(ta[0], ta[1]); ctx.lineTo(tb[0], tb[1]); ctx.stroke();
  const hand = W3(p.x + p.dog * 0.24, 0.85, p.z);
  ctx.strokeStyle = '#c0392b'; ctx.lineWidth = Math.max(1, 0.012 * s);
  ctx.beginPath(); ctx.moveTo(hand[0], hand[1]); ctx.quadraticCurveTo((hand[0] + hd[0]) / 2, Math.max(hand[1], hd[1]) + 0.1 * s, hd[0], hd[1]); ctx.stroke();
}

// Eyes, nose and mouth. side = 0 looking at the camera; +1 or -1 = seen from the side, facing that way.
function drawFace(p, hx, hy, r, side) {
  const INKC = '#16191f', lw = Math.max(0.8, r * 0.075), eyes = p.eyes || FACE_DEFAULT.eyes, nose = p.nose || FACE_DEFAULT.nose, mouth = p.mouth || FACE_DEFAULT.mouth;
  const big = r > 5;   // tiny faces only get the simple shapes
  ctx.save(); ctx.translate(hx, hy); if (side) ctx.scale(side, 1);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.fillStyle = INKC; ctx.strokeStyle = INKC; ctx.lineWidth = lw;
  const eye = (x, y, k) => {
    const e = r * k;
    if (eyes === 'round' && big) {
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, e * 1.5, 0, TAU); ctx.fill(); ctx.lineWidth = lw * 0.7; ctx.stroke();
      ctx.fillStyle = INKC; ctx.beginPath(); ctx.arc(x + (side ? e * 0.35 : 0), y + e * 0.1, e * 0.8, 0, TAU); ctx.fill(); ctx.lineWidth = lw;
    } else if (eyes === 'happy' && big) { ctx.beginPath(); ctx.arc(x, y + e * 0.5, e * 1.1, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    else if (eyes === 'sleepy' && big) {
      ctx.beginPath(); ctx.arc(x, y - e * 0.1, e * 1.05, 0, Math.PI); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - e * 1.3, y - e * 0.1); ctx.lineTo(x + e * 1.3, y - e * 0.1); ctx.stroke();
    } else { ctx.beginPath(); ctx.arc(x, y, Math.max(0.9, e), 0, TAU); ctx.fill(); }
  };
  if (p.face === 'shades') {
    ctx.fillStyle = INKC;
    if (side) { rrect(r * 0.0, -r * 0.05, r * 0.66, r * 0.26, r * 0.1); ctx.fill(); }
    else { rrect(-r * 0.66, -r * 0.06, r * 1.32, r * 0.3, r * 0.12); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(-r * 0.5, -r * 0.01, r * 0.18, r * 0.06); ctx.fillRect(r * 0.18, -r * 0.01, r * 0.18, r * 0.06); }
  } else if (side) eye(r * 0.55, r * 0.05, 0.12);
  else { eye(-r * 0.36, r * 0.07, 0.12); eye(r * 0.36, r * 0.07, 0.12); }
  // nose
  ctx.fillStyle = p.skinD; ctx.strokeStyle = p.skinD;
  if (side) {
    ctx.fillStyle = p.skin;
    const nr = nose === 'big' ? 0.25 : nose === 'button' ? 0.15 : nose === 'pointy' ? 0.1 : 0.09;
    if (nose === 'pointy') { ctx.beginPath(); ctx.moveTo(r * 0.9, r * 0.05); ctx.lineTo(r * 1.32, r * 0.3); ctx.lineTo(r * 0.92, r * 0.36); ctx.closePath(); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(r * (0.97 + (nose === 'big' ? 0.08 : 0)), r * 0.22, r * nr, 0, TAU); ctx.fill(); }
  } else if (nose === 'button') { ctx.beginPath(); ctx.arc(0, r * 0.3, r * 0.08, 0, TAU); ctx.fill(); }
  else if (nose === 'big') { ctx.beginPath(); ctx.arc(0, r * 0.3, r * 0.15, 0, TAU); ctx.fill(); }
  else if (nose === 'pointy') { ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(r * 0.02, r * 0.06); ctx.lineTo(-r * 0.09, r * 0.34); ctx.lineTo(r * 0.05, r * 0.34); ctx.stroke(); }
  // mouth
  const mx = side ? r * 0.62 : 0, my = side ? r * 0.58 : r * 0.62, mw = side ? 0.16 : 0.28;
  ctx.fillStyle = INKC; ctx.strokeStyle = INKC; ctx.lineWidth = lw;
  if (mouth === 'smile') { ctx.beginPath(); ctx.arc(mx, my - r * 0.18, r * mw, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke(); }
  else if (mouth === 'grin') {
    ctx.beginPath(); ctx.arc(mx, my - r * 0.14, r * mw * 1.1, 0, Math.PI); ctx.closePath(); ctx.fillStyle = '#ffffff'; ctx.fill(); if (big) { ctx.lineWidth = lw * 0.8; ctx.stroke(); }
  } else if (mouth === 'flat') { ctx.beginPath(); ctx.moveTo(mx - r * mw * 0.7, my); ctx.lineTo(mx + r * mw * 0.7, my); ctx.stroke(); }
  else if (mouth === 'open') { ctx.beginPath(); ctx.ellipse(mx, my, r * mw * 0.4, r * mw * 0.55, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
}

// Body shapes, as fractions of the half-width of an average torso: shoulders, chest, waist, hips; plus limb thickness, neck, head size, hip joint spacing, sway.
const PROFILE = {
  m: { sh: 1.12, ch: 1.12, wa: 0.96, hip: 0.8, limb: 1.04, neck: 0.1, head: 1.02, hipJ: 0.095, hipSway: 0.03, shSway: 0.1 },
  f: { sh: 0.7, ch: 0.76, wa: 0.5, hip: 0.96, limb: 0.86, neck: 0.066, head: 0.95, hipJ: 0.105, hipSway: 0.11, shSway: 0.04 }
};

function drawNear(p, s) {
  const k = p.h / 1.75, fx = p.fx, fz = p.fz, rx = fz, rz = -fx;
  const sp = Math.hypot(p.vx, p.vz), wa = p.walkA === undefined ? (sp > 0.15 ? 1 : 0) : p.walkA, walk = wa * Math.min(1, 0.55 + sp * 0.15);
  const ph = p.phase, bulk = p.bulk || 1, fem = p.body === 'f';
  const wide = p.shirtType === 'power' ? 1.14 : p.shirtType === 'puffer' ? 1.16 : 1;   // big tops push the arms out so they do not vanish behind the body
  const P = fem ? PROFILE.f : PROFILE.m;
  const armOut = bulk * P.sh * wide;
  const lb = bulk * P.limb;   // limb thickness
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2]];
  const legs = [];
  let minA = 9;
  for (const side of [-1, 1]) {
    const lp = ph + (side > 0 ? Math.PI : 0);
    const a = Math.sin(lp) * 0.42 * walk;
    const bend = 0.06 + (0.1 + 0.6 * Math.max(0, Math.cos(lp))) * walk;
    const knee = [side * P.hipJ, Math.sin(a) * 0.45, 0.93 - Math.cos(a) * 0.45];
    const sa = a - bend;
    const ankle = [side * P.hipJ, knee[1] + Math.sin(sa) * 0.44, knee[2] - Math.cos(sa) * 0.44];
    minA = Math.min(minA, ankle[2]);
    legs.push({ side, knee, ankle, a });
  }
  const drop = minA - 0.08;   // planted foot stays on the floor, so the body bobs naturally
  const lean = p.lean || 0;   // leaning into a move, so players can read it coming
  const L = (lx, ly, u) => W3(p.x + (rx * lx + fx * ly) * k + lean * u * k, (u - drop) * k, p.z + (rz * lx + fz * ly) * k);
  const sk = s * k;
  const vxv = p.x - VX, vzv = Math.max(0.2, p.z - VZ), vl = Math.hypot(vxv, vzv);
  const across = Math.abs(rx * (vzv / vl) - rz * (vxv / vl));   // 1 = shoulders face the camera, 0 = side-on
  const facing = fx * (vxv / vl) + fz * (vzv / vl);            // >0 walking away from the camera
  const sideDir = sgn(fx * (vzv / vl) - fz * (vxv / vl));
  const items = [];
  for (const g of legs) {
    const hip = L(g.side * P.hipJ, 0, 0.93), kn = L(g.knee[0], g.knee[1], g.knee[2]), an = L(g.ankle[0], g.ankle[1], g.ankle[2]);
    const th = clamp(g.a, -0.5, 0.5) * 0.9;   // foot roll: toe up as the leg swings forward, toe down as it pushes off
    const toe = L(g.ankle[0], g.ankle[1] + 0.13 * Math.cos(th), g.ankle[2] - 0.03 + 0.13 * Math.sin(th));
    items.push({ d: hip[2], f: () => {
      TAP = LEG_TAP;
      const legW = 0.13 * sk * lb, pt = p.pantsType, line = (a, b, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, w * sk); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
      if (pt === 'pleats' || pt === 'pencil') capsule([hip, kn, an], 0.095 * sk * lb, p.skin, p.skinD, p.skinL);   // bare legs; the skirt is drawn with the body
      else if (pt === 'shorts') {
        const hem = mix(hip, kn, 0.8);
        capsule([hem, kn, an], 0.1 * sk * lb, p.skin, p.skinD, p.skinL);
        capsule([hip, hem], legW * 1.08, p.pants, p.pantsD, p.pantsL);
      } else if (pt === 'joggers' || pt === 'parachute') {
        capsule([hip, kn, an], legW * (pt === 'parachute' ? 1.28 : 0.92), p.pants, p.pantsD, p.pantsL);
        capsule([mix(an, kn, 0.12), an], legW * 0.8, p.pantsD, p.pantsD, null);
      } else if (pt === 'cargo') {
        capsule([hip, kn, an], legW * 1.14, p.pants, p.pantsD, p.pantsL);
        const q = mix(hip, kn, 0.6), pw = 0.09 * sk * lb;
        ctx.fillStyle = p.pantsD; rrect(q[0] - pw / 2, q[1] - pw * 0.6, pw, pw * 1.2, pw * 0.2); ctx.fill();
      } else if (pt === 'flares') {
        capsule([hip, kn, an], legW, p.pants, p.pantsD, p.pantsL);
        capsule([mix(kn, an, 0.55), an], legW * 1.5, p.pants, p.pantsD, null);
      } else if (pt === 'slacks') {
        capsule([hip, kn, an], legW * 0.95, p.pants, p.pantsD, p.pantsL);
        line(mix(hip, kn, 0.15), kn, p.pantsL, 0.018); line(kn, an, p.pantsL, 0.018);
      } else if (pt === 'track') {
        capsule([hip, kn, an], legW, p.pants, p.pantsD, p.pantsL);
        line(hip, kn, '#ffffff', 0.03); line(kn, an, '#ffffff', 0.03);
      } else if (pt === 'acid') {
        capsule([hip, kn, an], legW, p.pantsL, p.pants, '#ffffff');
        line(mix(hip, kn, 0.3), mix(hip, kn, 0.7), 'rgba(255,255,255,.55)', 0.05); line(mix(kn, an, 0.2), mix(kn, an, 0.6), 'rgba(255,255,255,.55)', 0.04);
      } else capsule([hip, kn, an], legW, p.pants, p.pantsD, p.pantsL);
      TAP = null;
      if (sk * legW > 0 && pt !== 'shorts' && pt !== 'pleats' && pt !== 'pencil' && legW > 4) {
        const lx = an[0] - hip[0], ly = an[1] - hip[1], ld = Math.hypot(lx, ly) || 1, lnx = -ly / ld, lny = lx / ld, kw = legW * 0.42, hm = mix(an, kn, 0.14);
        line([kn[0] - lnx * kw, kn[1] - lny * kw], [kn[0] + lnx * kw * 0.35, kn[1] + lny * kw * 0.35], p.pantsD, 0.018);
        line([hm[0] - lnx * kw * 0.8, hm[1] - lny * kw * 0.8], [hm[0] + lnx * kw * 0.8, hm[1] + lny * kw * 0.8], p.pantsD, 0.022);
      }
      const st = p.shoeType;
      if (st !== 'slides' && st !== 'heels' && st !== 'platforms' && st !== 'dad') {
        const lum = parseInt(p.shoe.slice(1, 3), 16) * 0.3 + parseInt(p.shoe.slice(3, 5), 16) * 0.59 + parseInt(p.shoe.slice(5, 7), 16) * 0.11;
        line([an[0], an[1] + 0.045 * sk], [toe[0], toe[1] + 0.045 * sk], lum > 150 ? '#9aa0ad' : '#f4f6f8', 0.035);
      }
      if (st === 'boots' || st === 'hightops') capsule([mix(an, kn, st === 'boots' ? 0.34 : 0.17), an, toe], 0.125 * sk, p.shoe, p.shoeD, p.shoeL);
      else if (st === 'slides') {
        capsule([an, toe], 0.07 * sk, p.skin, p.skinD, p.skinL);
        capsule([mix(an, toe, 0.3), mix(an, toe, 0.7)], 0.085 * sk, p.shoe, p.shoeD, p.shoeL);
      } else if (st === 'runners') {
        capsule([an, toe], 0.09 * sk, p.shoe, p.shoeD, p.shoeL);
        line(an, toe, p.shoeL, 0.024);
      } else if (st === 'platforms' || st === 'dad') {
        capsule([an, toe], 0.125 * sk, p.shoe, p.shoeD, p.shoeL);
        const lift = (st === 'platforms' ? 0.07 : 0.04) * sk;
        line([an[0], an[1] + lift], [toe[0], toe[1] + lift], '#f4f6f8', st === 'platforms' ? 0.09 : 0.05);
      } else if (st === 'oxfords' || st === 'loafers') {
        capsule([an, toe], 0.085 * sk, p.shoe, p.shoeD, p.shoeL);
      } else if (st === 'heels') {
        capsule([an, toe], 0.065 * sk, p.shoe, p.shoeD, p.shoeL);
        line(an, [an[0], an[1] + 0.09 * sk], p.shoeD, 0.022);
      } else capsule([an, toe], 0.1 * sk, p.shoe, p.shoeD, p.shoeL);
    } });
  }
  let handle = null;
  if (p.lug) items.push({ d: p.z - VZ, f: () => { handle = drawCase(p, s); } });
  if (p.dog) items.push({ d: p.z + 0.15 - VZ, f: () => drawDog(p, s) });
  if (p.boxes) {
    const bz = p.z + p.dirz * 0.6;
    items.push({ d: bz - VZ, f: () => {
      box3D(p.x - 0.26, p.x + 0.26, 0.05, 0.62, bz - 0.22, bz + 0.22, hex('#b08350'));
      box3D(p.x - 0.22, p.x + 0.22, 0.62, 1.12, bz - 0.2, bz + 0.2, hex('#c49563'));
      box3D(p.x - 0.18, p.x + 0.18, 1.12, 1.45, bz - 0.17, bz + 0.17, hex('#a8794a'));
    } });
  }
  const lugSide = p.lug ? (Math.sign(rx * p.lug) || p.lug) : 0;
  for (const side of [-1, 1]) {
    const ap = ph + (side > 0 ? 0 : Math.PI);
    let c = Math.sin(ap) * (p.fast ? 0.55 : 0.32) * walk, bend = p.fast ? 1.35 : 0.2 + 0.2 * walk, hx = 0.22 * armOut;
    if (p.react && p.react.up && p.react.t > 0 && p.react.t < 0.9) { c = 2.45; bend = 0.55; hx = 0.36; }   // hands up
    if (p.dance) { c = 1.7 + Math.sin(ph * 1.3 + side * 1.7) * 1.0; bend = 0.9; hx = 0.38; }
    if (p.phone && side > 0) { c = 0.35; bend = 1.7; hx = 0.1; }
    if (p.aim && side > 0) { c = 1.25; bend = 1.5; hx = 0.1; }   // lifting a phone for a photo: about to stop
    const el = [side * 0.23 * armOut, Math.sin(c) * 0.28, 1.42 - Math.cos(c) * 0.28];
    const fa = c + bend;
    const hd = [side * hx, el[1] + Math.sin(fa) * 0.26, el[2] - Math.cos(fa) * 0.26];
    const shp = L(side * 0.19 * armOut, 0.035 * Math.sin(ap) * walk, 1.42), elp = L(el[0], el[1], el[2]), hdp = L(hd[0], hd[1], hd[2]);
    const holds = side === lugSide;
    items.push({ d: shp[2] + 0.001, f: () => {
      let e2 = elp, h2 = hdp;
      if (holds && handle) { h2 = handle; e2 = [(shp[0] + handle[0]) / 2 + (handle[0] - shp[0]) * 0.1, (shp[1] + handle[1]) / 2, 0]; }
      TAP = ARM_TAP;
      const ty = p.shirtType, longSleeve = ['hoodie', 'jacket', 'velour', 'wind', 'varsity', 'power', 'puffer', 'suit'].includes(ty), armW = ty === 'puffer' ? 1.3 : 1;
      const sleeve = ty === 'varsity' ? '#f4f1ea' : p.shirt, sleeveD = ty === 'varsity' ? '#c9c4b6' : p.shirtD, sleeveL = ty === 'varsity' ? '#ffffff' : p.shirtL;
      if (ty === 'tank' || ty === 'dress') capsule([shp, e2], 0.085 * sk * lb, p.skin, p.skinD, p.skinL);
      else capsule([shp, e2], 0.095 * sk * lb * armW, sleeve, sleeveD, sleeveL);
      if (longSleeve) capsule([e2, h2], 0.082 * sk * lb * armW, sleeve, sleeveD, sleeveL);
      else capsule([e2, h2], 0.075 * sk * lb, p.skin, p.skinD, p.skinL);
      if (ty === 'jacket' || ty === 'wind') { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, 0.022 * sk); ctx.beginPath(); ctx.moveTo(shp[0], shp[1]); ctx.lineTo(e2[0], e2[1]); ctx.lineTo(h2[0], h2[1]); ctx.stroke(); }
      if (ty === 'power') { ctx.fillStyle = p.shirtL; ctx.beginPath(); ctx.arc(shp[0], shp[1], 0.075 * sk * lb, 0, TAU); ctx.fill(); }
      TAP = null;
      if (sk * 0.09 > 2.5) {
        const ax = h2[0] - shp[0], ay = h2[1] - shp[1], ad = Math.hypot(ax, ay) || 1, anx = -ay / ad, any = ax / ad, aw = 0.045 * sk * lb;
        ctx.strokeStyle = longSleeve ? sleeveD : p.skinD; ctx.lineWidth = Math.max(1, 0.016 * sk); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(e2[0] - anx * aw, e2[1] - any * aw); ctx.lineTo(e2[0] + anx * aw * 0.3, e2[1] + any * aw * 0.3); ctx.stroke();
      }
      const hr = 0.05 * sk;
      if (hr > 2.5) { ctx.fillStyle = LINE; ctx.beginPath(); ctx.arc(h2[0], h2[1], hr + Math.max(1, hr * 0.28), 0, TAU); ctx.fill(); }
      ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(h2[0], h2[1], hr, 0, TAU); ctx.fill();
      if (hr > 3.5) { ctx.fillStyle = p.skinD; ctx.beginPath(); ctx.arc(h2[0] + side * -hr * 0.55, h2[1] + hr * 0.3, hr * 0.42, 0, TAU); ctx.fill(); }
      if ((p.phone || p.aim) && side > 0) {
        ctx.fillStyle = '#111827'; ctx.fillRect(h2[0] - 0.04 * sk, h2[1] - 0.09 * sk, 0.08 * sk, 0.13 * sk);
        ctx.fillStyle = '#8ecbff'; ctx.fillRect(h2[0] - 0.03 * sk, h2[1] - 0.08 * sk, 0.06 * sk, 0.1 * sk);
      }
    } });
  }
  const chest = L(0, 0, 1.38), waist = L(0, 0, 0.98), neck = L(0, 0, 1.48), pelvis = L(0, 0, 0.82);
  const swayK = Math.sin(ph) * walk * across;   // shoulders and hips swing against each other while walking
  items.push({ d: chest[2], f: () => {
    const inkIt = lw => { if (hwC > 2) { const keep = ctx.strokeStyle; ctx.strokeStyle = LINE; ctx.lineWidth = lw + Math.max(1.2, hwC * 0.16); ctx.stroke(); ctx.strokeStyle = keep; ctx.lineWidth = lw; } };
    const sC = F / chest[2] * k, hb = (0.1 + 0.09 * across) * bulk * sC;
    const hwS = hb * P.sh * wide, hwC = hb * P.ch * wide, hwW = hb * P.wa * (1 + (wide - 1) * 0.5), hipW = hb * P.hip;
    const shY = neck[1] + (chest[1] - neck[1]) * 0.28, nkW = hwC * 0.5, mid = (chest[1] + waist[1]) / 2;
    const upX = -swayK * hb * P.shSway, loX = swayK * hb * P.hipSway, bow = fem ? -hwC * 0.06 : hwC * 0.04;
    ctx.save();
    // hips: the pants block is shaped to the body type (female: wide hips, narrow waist)
    ctx.save(); ctx.translate(loX, 0);
    ctx.fillStyle = p.pants; ctx.strokeStyle = p.pants; ctx.lineWidth = hwC * 0.3; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(waist[0] - hwW, waist[1]); ctx.lineTo(waist[0] + hwW, waist[1]);
    ctx.quadraticCurveTo(waist[0] + (hwW + hipW) * 0.56, (waist[1] + pelvis[1]) / 2, pelvis[0] + hipW, pelvis[1]); ctx.lineTo(pelvis[0] - hipW, pelvis[1]);
    ctx.quadraticCurveTo(waist[0] - (hwW + hipW) * 0.56, (waist[1] + pelvis[1]) / 2, waist[0] - hwW, waist[1]); ctx.closePath(); inkIt(hwC * 0.3); ctx.fill(); ctx.stroke();
    ctx.restore();
    // upper body: sloped shoulders, a chest that tapers to the waist
    ctx.translate(upX, 0);
    const g = ctx.createLinearGradient(chest[0] - hwS, 0, chest[0] + hwS, 0);
    g.addColorStop(0, p.shirtL); g.addColorStop(0.5, p.shirt); g.addColorStop(1, p.shirtD);
    ctx.fillStyle = g; ctx.strokeStyle = g; ctx.lineWidth = hwC * 0.4;
    ctx.beginPath(); ctx.moveTo(neck[0] - nkW, neck[1]); ctx.lineTo(neck[0] + nkW, neck[1]);
    ctx.lineTo(chest[0] + hwS, shY); ctx.lineTo(chest[0] + hwC, chest[1]);
    ctx.quadraticCurveTo(chest[0] + (hwC + hwW) * 0.5 + bow, mid + (waist[1] - mid) * 0.2, waist[0] + hwW, waist[1]); ctx.lineTo(waist[0] - hwW, waist[1]);
    ctx.quadraticCurveTo(chest[0] - (hwC + hwW) * 0.5 - bow, mid + (waist[1] - mid) * 0.2, chest[0] - hwC, chest[1]);
    ctx.lineTo(chest[0] - hwS, shY); ctx.closePath(); inkIt(hwC * 0.4); ctx.fill(); ctx.stroke();
    if (hwC > 4 && p.shirtType !== 'baby') {
      ctx.save(); ctx.clip();
      ctx.fillStyle = 'rgba(20,10,40,0.17)'; ctx.fillRect(chest[0] + hwC * 0.4, neck[1], hwC * 2, waist[1] - neck[1] + 2);
      ctx.fillStyle = 'rgba(20,10,40,0.14)'; ctx.fillRect(chest[0] - hwC * 2, waist[1] - hwC * 0.16, hwC * 4, hwC * 0.3);
      ctx.restore();
      ctx.strokeStyle = p.shirtD; ctx.lineWidth = Math.max(1, hwC * 0.06); ctx.lineCap = 'round';
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(waist[0] + sd * hwW * 0.5, waist[1] - hwC * 0.12); ctx.quadraticCurveTo(waist[0] + sd * hwW * 0.72, waist[1] - hwC * 0.3, waist[0] + sd * hwW * 0.9, waist[1] - hwC * 0.62); ctx.stroke(); }
      ctx.fillStyle = p.shirtD; ctx.beginPath(); ctx.ellipse(neck[0], neck[1] + hwC * 0.06, nkW * 0.9, hwC * 0.09, 0, 0, TAU); ctx.fill();
      if (facing < -0.2 && p.shirtType !== 'hoodie') { ctx.fillStyle = p.skin; ctx.beginPath(); ctx.ellipse(neck[0], neck[1] + hwC * 0.09, nkW * 0.68, hwC * 0.11, 0, 0, TAU); ctx.fill(); }
    }
    const ty = p.shirtType, band = (a, b, col) => { ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, hwC * 0.12); ctx.beginPath(); ctx.moveTo(a[0] - hwC * 0.95, a[1] + (b - a[1])); ctx.lineTo(a[0] + hwC * 0.95, a[1] + (b - a[1])); ctx.stroke(); };
    if (ty === 'baby') { ctx.fillStyle = p.skin; const c = mix(chest, waist, 0.55); ctx.strokeStyle = p.skin; ctx.lineWidth = hwC * 0.4; ctx.beginPath(); ctx.moveTo(c[0] - hwC * 0.88, c[1]); ctx.lineTo(c[0] + hwC * 0.88, c[1]); ctx.lineTo(waist[0] + hwW, waist[1]); ctx.lineTo(waist[0] - hwW, waist[1]); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    if (ty === 'wind') { const c = mix(neck, waist, 0.42); ctx.fillStyle = '#ffffff'; ctx.fillRect(c[0] - hwC * 1.02, c[1] - hwC * 0.22, hwC * 2.04, hwC * 0.44); }
    if (ty === 'puffer') for (const t of [0.28, 0.52, 0.76]) { const c = mix(neck, waist, t); band(c, c[1], p.shirtD); }
    if (ty === 'velour' || ty === 'varsity') { ctx.strokeStyle = ty === 'velour' ? p.shirtL : '#ffffff'; ctx.lineWidth = Math.max(1, hwC * 0.08); ctx.beginPath(); ctx.moveTo(neck[0], neck[1]); ctx.lineTo(waist[0], waist[1]); ctx.stroke(); }
    if ((ty === 'suit' || ty === 'power') && facing < 0) {   // shirt and tie, seen from the front
      const v = mix(neck, waist, 0.55);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(neck[0] - hwC * 0.42, neck[1]); ctx.lineTo(neck[0] + hwC * 0.42, neck[1]); ctx.lineTo(v[0], v[1]); ctx.closePath(); ctx.fill();
      if (ty === 'suit') { ctx.strokeStyle = '#b3243a'; ctx.lineWidth = Math.max(1, hwC * 0.14); ctx.beginPath(); ctx.moveTo(neck[0], neck[1]); ctx.lineTo(v[0], v[1]); ctx.stroke(); }
    }
    // skirts hang from the waist over whatever is underneath, so a dress goes with any bottoms
    const skirtOf = (bottom, topW, botW, col, colD) => { const b = L(0, 0, bottom); ctx.fillStyle = col; ctx.strokeStyle = LINE; ctx.lineWidth = Math.max(1.2, hwC * 0.12); const sway = Math.sin(ph) * walk * hwC * 0.14, dip = hwC * 0.22; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(waist[0] - hwC * topW, waist[1]); ctx.lineTo(waist[0] + hwC * topW, waist[1]); ctx.quadraticCurveTo(waist[0] + hwC * (topW + botW) * 0.56, (waist[1] + b[1]) / 2, b[0] + hwC * botW + sway, b[1]); ctx.quadraticCurveTo(b[0] + sway, b[1] + dip, b[0] - hwC * botW + sway, b[1]); ctx.quadraticCurveTo(waist[0] - hwC * (topW + botW) * 0.56, (waist[1] + b[1]) / 2, waist[0] - hwC * topW, waist[1]); ctx.closePath(); ctx.fill(); ctx.stroke(); };
    ctx.save(); ctx.translate(loX - upX, 0); const tw = hwW / hwC * 1.1;
    if (p.pantsType === 'pleats') { skirtOf(0.56, tw, 1.4, p.pants, p.pantsD); ctx.strokeStyle = p.pantsD; ctx.lineWidth = Math.max(1, hwC * 0.05); const b = L(0, 0, 0.56); for (const f of [-0.75, -0.25, 0.25, 0.75]) { ctx.beginPath(); ctx.moveTo(waist[0] + hwC * f * 0.8, waist[1]); ctx.lineTo(b[0] + hwC * f * 1.32, b[1]); ctx.stroke(); } }
    if (p.pantsType === 'pencil') skirtOf(0.5, tw, 0.84, p.pants, p.pantsD);
    if (ty === 'dress') skirtOf(0.5, tw, 1.45, p.shirt, p.shirtD);
    ctx.restore();
    if (ty === 'hoodie') { ctx.fillStyle = p.shirtD; ctx.beginPath(); ctx.ellipse(neck[0], neck[1] + hwC * 0.12, hwC * 0.62, hwC * 0.38, 0, 0, TAU); ctx.fill(); }
    if (ty === 'jacket') { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, hwC * 0.09); ctx.beginPath(); ctx.moveTo(neck[0], neck[1]); ctx.lineTo(waist[0], waist[1]); ctx.stroke(); }
    ctx.restore();
  } });
  const packDims = { pack: [1.2, 1, 1], jet: [1.2, 1, 1], sling: [1.2, 0.62, 0.62], fanny: [0.98, 0.72, 0.3], messenger: [1.02, 1.0, 0.52], boombox: [1.28, 1.05, 0.46] }[p.pack];
  if (packDims) {
    const bc = L(0, -0.19, packDims[0]), jet = p.pack === 'jet';
    items.push({ d: bc[2], f: () => {
      const sc = F / bc[2] * k, w = (0.16 + 0.16 * across) * sc * packDims[1], h = 0.42 * sc * packDims[2];
      if (jet && p.isMe && S.boostV > 0.25) {   // jetpack flames while bursting
        for (const fx2 of [-0.25, 0.25]) {
          const fl = h * (0.6 + 0.5 * Math.random()) * S.boostV, x0 = bc[0] + fx2 * w;
          const g2 = ctx.createLinearGradient(0, bc[1] + h / 2, 0, bc[1] + h / 2 + fl);
          g2.addColorStop(0, '#fff3b0'); g2.addColorStop(0.5, '#ff9f43'); g2.addColorStop(1, 'rgba(255,77,79,0)');
          ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(x0 - w * 0.13, bc[1] + h / 2); ctx.lineTo(x0 + w * 0.13, bc[1] + h / 2); ctx.lineTo(x0, bc[1] + h / 2 + fl); ctx.closePath(); ctx.fill();
        }
      }
      const g = ctx.createLinearGradient(bc[0] - w / 2, 0, bc[0] + w / 2, 0);
      g.addColorStop(0, jet ? '#f3f4f6' : p.gearL); g.addColorStop(1, jet ? '#6b7280' : p.gearD);
      ctx.fillStyle = g; rrect(bc[0] - w / 2, bc[1] - h / 2, w, h, Math.min(w, h) * 0.3); ctx.fill();
      if (w > 4) { ctx.strokeStyle = LINE; ctx.lineWidth = Math.max(1.2, w * 0.05); ctx.stroke(); }
      ctx.fillStyle = jet ? '#374151' : p.gearD;
      if (jet) { for (const fx2 of [-0.25, 0.25]) { rrect(bc[0] + fx2 * w - w * 0.13, bc[1] + h * 0.36, w * 0.26, h * 0.2, 2); ctx.fill(); } ctx.fillStyle = '#ff2d3a'; rrect(bc[0] - w * 0.2, bc[1] - h * 0.3, w * 0.4, h * 0.12, 2); ctx.fill(); }
      else if (p.pack === 'boombox') { ctx.fillStyle = '#16191f'; for (const f of [-0.27, 0.27]) { ctx.beginPath(); ctx.arc(bc[0] + f * w, bc[1], h * 0.34, 0, TAU); ctx.fill(); } ctx.fillStyle = '#f4f6f8'; ctx.fillRect(bc[0] - w * 0.08, bc[1] - h * 0.2, w * 0.16, h * 0.4); }
      else { rrect(bc[0] - w * 0.36, bc[1] + h * 0.04, w * 0.72, h * 0.32, Math.min(w, h) * 0.12); ctx.fill(); }
    } });
  }
  const pitch = p.phone ? 0.06 : 0;
  const head = L(0, 0.02 + pitch, 1.63 - pitch * 0.6 + 0.012 * Math.cos(ph * 2) * walk), neckTop = L(0, 0, 1.54), brimP = L(0, 0.22 + pitch, 1.69 - pitch * 0.6);
  const out = {};
  items.push({ d: head[2] - 0.002, f: () => {
    const r = 0.115 * P.head * F / head[2] * k, hx = head[0], hy = head[1];
    const longHair = p.hairStyle === 'long' && !p.bald;
    const brim = () => {
      ctx.fillStyle = p.gearD; ctx.beginPath();
      ctx.ellipse((hx + brimP[0]) / 2, (hy - r * 0.2 + brimP[1]) / 2, r * 0.9 + Math.abs(brimP[0] - hx) * 0.5, r * 0.24, 0, 0, TAU); ctx.fill();
    };
    capsule([neck, neckTop], P.neck * sk, p.skin, p.skinD, p.skinL);
    if (longHair && facing <= 0.35) { ctx.fillStyle = p.hair; ctx.beginPath(); ctx.ellipse(hx - (facing > -0.35 ? sideDir * r * 0.25 : 0), hy + r * 0.55, r * 1.05, r * 1.15, 0, 0, TAU); ctx.fill(); }
    if (p.hat === 'cap' && facing > 0.35) brim();
    ball(hx, hy, r, p.skin, p.skinL, p.skinD);
    if (r > 3) { ctx.strokeStyle = LINE; ctx.lineWidth = Math.max(1.2, r * 0.13); ctx.beginPath(); ctx.arc(hx, hy, r, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = p.hair;
    if (facing > 0.35) {
      if (!p.bald) {
        ctx.beginPath(); ctx.arc(hx, hy - r * 0.05, r * 1.01, 0, TAU); ctx.fill();
        if (longHair) { ctx.beginPath(); ctx.ellipse(hx, hy + r * 0.65, r * 0.98, r * 1.1, 0, 0, TAU); ctx.fill(); }
      }
    } else if (facing < -0.35) {
      if (!p.bald) { ctx.beginPath(); ctx.arc(hx, hy - r * 0.12, r * 1.0, Math.PI, TAU); ctx.closePath(); ctx.fill(); }
      drawFace(p, hx, hy, r, 0);
      if (p.rival) {
        ctx.strokeStyle = '#16191f'; ctx.lineWidth = Math.max(1, r * 0.12); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hx - r * 0.58, hy - r * 0.16); ctx.lineTo(hx - r * 0.15, hy - r * 0.02);
        ctx.moveTo(hx + r * 0.58, hy - r * 0.16); ctx.lineTo(hx + r * 0.15, hy - r * 0.02); ctx.stroke();
      }
    } else {
      if (!p.bald) {
        ctx.beginPath(); ctx.moveTo(hx, hy);
        if (sideDir > 0) ctx.arc(hx, hy - r * 0.04, r * 1.02, 0.55 * Math.PI, 1.85 * Math.PI);
        else ctx.arc(hx, hy - r * 0.04, r * 1.02, -0.85 * Math.PI, 0.45 * Math.PI);
        ctx.closePath(); ctx.fill();
      }
      drawFace(p, hx, hy, r, sideDir);
    }
    if (!p.bald && facing <= 0.35 && p.hat === 'none') {
      ctx.strokeStyle = p.hairL; ctx.lineWidth = Math.max(1, r * 0.12); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(hx, hy - r * 0.08, r * 0.78, 1.15 * Math.PI, 1.45 * Math.PI); ctx.stroke();
    }
    if (p.hairStyle === 'mohawk' && (p.hat === 'none' || p.hat === 'headphones')) {
      ctx.fillStyle = p.hair;
      if (Math.abs(facing) > 0.35) {
        ctx.beginPath(); ctx.moveTo(hx - r * 0.2, hy - r * 0.8);
        ctx.lineTo(hx - r * 0.12, hy - r * 1.5); ctx.lineTo(hx, hy - r * 1.05); ctx.lineTo(hx + r * 0.1, hy - r * 1.55); ctx.lineTo(hx + r * 0.2, hy - r * 0.8); ctx.closePath(); ctx.fill();
      } else {
        for (let i = 0; i < 5; i++) {
          const a = Math.PI * (1.12 + i * 0.19), ca = Math.cos(a) * -sideDir, sa = Math.sin(a);
          const bx0 = hx + ca * r * 0.92, by0 = hy + sa * r * 0.92;
          ctx.beginPath(); ctx.moveTo(bx0 - sa * r * 0.18, by0 + ca * r * 0.18 * 0); ctx.lineTo(hx + ca * r * 1.5, hy + sa * r * 1.5); ctx.lineTo(bx0 + r * 0.18 * Math.sign(ca || 1), by0); ctx.closePath(); ctx.fill();
        }
      }
    }
    if (p.hat === 'headphones') {
      ctx.strokeStyle = p.gear; ctx.lineWidth = Math.max(1.5, r * 0.18); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(hx, hy - r * 0.05, r * 1.1, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      ctx.fillStyle = p.gearD;
      if (Math.abs(facing) > 0.35) { for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(hx + sx * r * 1.0, hy + r * 0.05, r * 0.26, r * 0.4, 0, 0, TAU); ctx.fill(); } }
      else { ctx.beginPath(); ctx.ellipse(hx - sideDir * r * 0.1, hy + r * 0.05, r * 0.36, r * 0.44, 0, 0, TAU); ctx.fill(); }
    }
    if (p.hat === 'crown') {
      ctx.fillStyle = '#f2c200'; ctx.strokeStyle = '#a07800'; ctx.lineWidth = Math.max(1, r * 0.06);
      ctx.beginPath(); ctx.moveTo(hx - r * 0.7, hy - r * 0.7);
      ctx.lineTo(hx - r * 0.75, hy - r * 1.35); ctx.lineTo(hx - r * 0.38, hy - r * 1.0); ctx.lineTo(hx, hy - r * 1.45); ctx.lineTo(hx + r * 0.38, hy - r * 1.0); ctx.lineTo(hx + r * 0.75, hy - r * 1.35); ctx.lineTo(hx + r * 0.7, hy - r * 0.7);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e2574c'; ctx.beginPath(); ctx.arc(hx, hy - r * 0.86, r * 0.1, 0, TAU); ctx.fill();
    }
    if (p.hat === 'beret') { ctx.fillStyle = p.gear; ctx.beginPath(); ctx.ellipse(hx + r * 0.12, hy - r * 0.62, r * 1.08, r * 0.5, -0.12, 0, TAU); ctx.fill(); }
    if (p.hat === 'sweatband') { ctx.fillStyle = p.gear; ctx.fillRect(hx - r * 1.03, hy - r * 0.62, r * 2.06, r * 0.34); }
    if (p.hat === 'tiara') {
      ctx.fillStyle = '#e8e8f0'; ctx.strokeStyle = '#9aa0b5'; ctx.lineWidth = Math.max(1, r * 0.05);
      ctx.beginPath(); ctx.moveTo(hx - r * 0.6, hy - r * 0.78); ctx.lineTo(hx - r * 0.3, hy - r * 1.12); ctx.lineTo(hx - r * 0.12, hy - r * 0.95); ctx.lineTo(hx, hy - r * 1.32); ctx.lineTo(hx + r * 0.12, hy - r * 0.95); ctx.lineTo(hx + r * 0.3, hy - r * 1.12); ctx.lineTo(hx + r * 0.6, hy - r * 0.78); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    if (p.hat === 'bucket') {
      ctx.fillStyle = p.gearD; ctx.beginPath(); ctx.ellipse(hx, hy - r * 0.34, r * 1.42, r * 0.34, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = p.gear; ctx.beginPath(); ctx.arc(hx, hy - r * 0.34, r * 0.98, Math.PI, TAU); ctx.closePath(); ctx.fill();
    }
    if (p.hat === 'fedora') {
      ctx.fillStyle = p.gearD; ctx.beginPath(); ctx.ellipse(hx, hy - r * 0.5, r * 1.55, r * 0.3, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = p.gear; rrect(hx - r * 0.82, hy - r * 1.32, r * 1.64, r * 0.86, r * 0.3); ctx.fill();
      ctx.fillStyle = p.gearL; ctx.fillRect(hx - r * 0.82, hy - r * 0.72, r * 1.64, r * 0.2);
    }
    if (p.hat === 'visor') {
      ctx.fillStyle = p.gear; ctx.fillRect(hx - r * 1.03, hy - r * 0.68, r * 2.06, r * 0.3);
      if (facing <= 0.35) brim();
    }
    if (p.hat === 'beanie') {
      ctx.fillStyle = p.gear; ctx.beginPath(); ctx.arc(hx, hy - r * 0.12, r * 1.07, Math.PI, TAU); ctx.closePath(); ctx.fill();
      ctx.fillStyle = p.gearD; ctx.fillRect(hx - r * 1.07, hy - r * 0.3, r * 2.14, r * 0.26);
      ctx.fillStyle = p.gearL; ctx.beginPath(); ctx.arc(hx, hy - r * 1.18, r * 0.22, 0, TAU); ctx.fill();
    } else if (p.hat === 'cap') {
      ctx.fillStyle = p.gear; ctx.beginPath(); ctx.arc(hx, hy - r * 0.14, r * 1.05, Math.PI, TAU); ctx.closePath(); ctx.fill();
      if (facing <= 0.35) brim();
    }
    out.hx = hx; out.hy = hy; out.hr = r;
  } });
  items.sort((a, b) => b.d - a.d);
  for (const it of items) it.f();
  return out;
}

function drawFar(p, bx, fy, U) {
  const sw = Math.sin(p.phase), moving = Math.hypot(p.vx, p.vz) > 0.15;
  const lw = Math.max(1.2, 0.12 * U);
  ctx.lineCap = 'round';
  ctx.strokeStyle = p.pants; ctx.lineWidth = lw; ctx.beginPath();
  ctx.moveTo(bx, fy - 0.9 * U); ctx.lineTo(bx - 0.08 * U, fy - (moving ? Math.max(0, sw) * 0.1 * U : 0));
  ctx.moveTo(bx, fy - 0.9 * U); ctx.lineTo(bx + 0.08 * U, fy - (moving ? Math.max(0, -sw) * 0.1 * U : 0));
  ctx.stroke();
  ctx.strokeStyle = p.shirt; ctx.lineWidth = Math.max(2, 0.32 * U);
  ctx.beginPath(); ctx.moveTo(bx, fy - 0.98 * U); ctx.lineTo(bx, fy - 1.4 * U); ctx.stroke();
  if (p.lug) { ctx.fillStyle = p.lugCol; ctx.fillRect(bx + p.lug * 0.5 * U - 0.17 * U, fy - 0.55 * U, 0.34 * U, 0.55 * U); }
  const r = Math.max(1.2, 0.115 * U), hy = fy - 1.63 * U;
  ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(bx, hy, r, 0, TAU); ctx.fill();
  if (!p.bald) { ctx.fillStyle = p.hair; ctx.beginPath(); ctx.arc(bx, hy - r * 0.1, r, Math.PI, TAU); ctx.fill(); }
  return { hx: bx, hy, hr: r };
}

function drawProp(p, s, bx, fy) {
  const x = p.x, z = p.z;
  switch (p.prop) {
    case 'lamp': {
      const a = W3(x, 0, z), b = W3(x, 4.6, z), c = W3(x - 0.9, 4.75, z);
      capsule([a, W3(x, 0.5, z)], 0.26 * s, '#3a4a40', '#1f2a23', null);
      capsule([a, b], 0.15 * s, '#3a4a40', '#1f2a23', '#5d7366');
      capsule([b, c], 0.08 * s, '#3a4a40', '#1f2a23', null);
      ball(c[0], c[1], 0.16 * F / c[2], '#fff3c4', '#ffffff', '#d8c58a');
      break;
    }
    case 'signal': {
      const a = W3(x, 0, z), b = W3(x, 3.1, z);
      capsule([a, b], 0.13 * s, '#4b5563', '#1f2937', '#9ca3af');
      box3D(x - 0.2, x + 0.2, 2.45, 3.0, z - 0.16, z + 0.16, hex('#2b2b2b'));
      const q = W3(x, 2.72, z - 0.17), walk = p.xing && p.xing.walk;
      ctx.fillStyle = walk ? '#f4f6f8' : '#ff6a3d';
      ctx.beginPath(); ctx.arc(q[0], q[1], 0.11 * F / q[2], 0, TAU); ctx.fill();
      break;
    }
    case 'tree': {
      ctx.strokeStyle = 'rgba(30,30,30,0.6)'; ctx.lineWidth = Math.max(1, 0.04 * s);
      ctx.beginPath(); ctx.ellipse(bx, fy, 0.55 * s, 0.55 * s * Math.min(0.6, VY / (z - VZ)), 0, 0, TAU); ctx.stroke();
      const a = W3(x, 0, z), b = W3(x, 2.8, z);
      capsule([a, b], 0.22 * s, '#6b4a2b', '#3b2a1e', '#8a6a46');
      const c1 = W3(x, 3.7, z), c2 = W3(x + 0.6, 3.3, z + 0.3), c3 = W3(x - 0.5, 3.4, z - 0.3);
      ball(c2[0], c2[1], 1.0 * F / c2[2], '#3f7d3a', '#6fae5a', '#24502a');
      ball(c3[0], c3[1], 0.95 * F / c3[2], '#3f7d3a', '#6fae5a', '#24502a');
      ball(c1[0], c1[1], 1.2 * F / c1[2], '#4a8c42', '#7fc068', '#2a5c2f');
      break;
    }
    case 'trash': box3D(x - 0.28, x + 0.28, 0, 0.95, z - 0.28, z + 0.28, hex('#2f5d3a')); break;
    case 'hydrant': {
      const a = W3(x, 0, z), b = W3(x, 0.7, z);
      capsule([a, b], 0.28 * s, '#c0392b', '#7d1f16', '#ff7b6b');
      ball(b[0], b[1], 0.15 * s, '#d4a017', '#ffe08a', '#8a6a0c');
      break;
    }
    case 'cart': {
      box3D(x - 0.45, x + 0.45, 0.25, 1.1, z - 1.0, z + 1.0, hex('#c9ced6'));
      const a = W3(x, 1.1, z), b = W3(x, 2.25, z);
      capsule([a, b], 0.05 * s, '#6b7280', '#374151', null);
      ctx.fillStyle = '#2f80ed'; ctx.beginPath(); ctx.ellipse(b[0], b[1], 1.2 * F / b[2], 0.5 * F / b[2], 0, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = '#ffcf1f'; ctx.beginPath(); ctx.ellipse(b[0], b[1], 0.6 * F / b[2], 0.5 * F / b[2], 0, Math.PI, TAU); ctx.fill();
      const fq0 = W3(x, 0.7, z - 1.01); label('HOT DOGS', fq0[0], fq0[1], Math.round(0.2 * F / fq0[2]), '#c0392b');
      break;
    }
    case 'board': box3D(x - 0.3, x + 0.3, 0, 0.95, z - 0.12, z + 0.12, hex('#1f2937')); { const q = W3(x, 0.6, z - 0.13); label('SALE', q[0], q[1], Math.round(0.18 * F / q[2]), '#f4f6f8'); } break;
    case 'wetfloor': box3D(x - 0.25, x + 0.25, 0, 0.62, z - 0.12, z + 0.12, hex('#ffcf1f')); { const q = W3(x, 0.4, z - 0.13); label('WET', q[0], q[1], Math.round(0.14 * F / q[2]), INK); } break;
  }
}

export function drawPerson(p) {
  const dz = p.z - VZ;
  if (dz < 0.6 || dz > DRAW_FAR) return;
  const s = F / dz, k = p.h / 1.75, U = s * k;
  const bx = CX + (p.x - VX) * s;
  if (bx < -s * 3 || bx > W + s * 3) return;
  const fy = HOR + VY * s;
  // fog in the distance; fade people right in front of the camera so they never block your character
  // racers beside and behind you go see-through: they can't touch you, and they must never block your view
  const racerFade = p.racer ? clamp(0.3 + (p.z - S.pz + 1) * 0.35, 0.3, 1) * (p.isGhost ? 0.5 : 1) : 1;
  const ghost = (p.isMe ? S.ghostT : p.ghostT) > 0 ? 0.5 + 0.25 * Math.sin(S.clock * 30) : 1;   // race mode: blink during the rare safety slip-through
  ctx.globalAlpha = Math.min(fogA(dz), p.isMe ? 1 : clamp((dz - 0.6) / 1.6, 0.22, 1), clamp((DRAW_FAR - dz) / 8, 0, 1), p.fadeT === undefined ? 1 : p.fadeT / 0.9) * ghost * racerFade;
  if (p.prop !== 'spill') {
    ctx.fillStyle = LV.night ? 'rgba(0,0,0,0.35)' : 'rgba(15,27,45,0.18)';
    ctx.beginPath(); ctx.ellipse(bx, fy, 0.34 * s, 0.34 * s * Math.min(0.6, VY / dz), 0, 0, TAU); ctx.fill();
  }
  if (p.isMe) {
    ctx.strokeStyle = 'rgba(255,207,31,0.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(bx, fy, 0.42 * s, 0.42 * s * Math.min(0.6, VY / dz), 0, 0, TAU); ctx.stroke();
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  let hd = {};
  if (p.prop) drawProp(p, s, bx, fy);
  else hd = U * 1.75 < 34 ? drawFar(p, bx, fy, U) : drawNear(p, s);
  const hx = hd.hx !== undefined ? hd.hx : bx, hy = hd.hy !== undefined ? hd.hy : fy - 1.63 * U;
  if (p.racer && p.z > S.pz - 0.5) {   // a coloured arrow and name so the racers stand out from the crowd
    const ay = hy - 0.42 * U, aw = clamp(0.16 * U, 5, 11);
    ctx.fillStyle = p.color; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, 0.03 * U); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(hx, ay); ctx.lineTo(hx - aw, ay - aw * 1.3); ctx.lineTo(hx + aw, ay - aw * 1.3); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (U > 40) { ctx.font = '700 ' + clamp(Math.round(0.2 * U), 11, 16) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.lineWidth = 3; ctx.strokeText(p.name, hx, ay - aw * 1.5); ctx.fillStyle = '#ffffff'; ctx.fillText(p.name, hx, ay - aw * 1.5); }
  }
  if (p.isMe && S.live && S.energy !== undefined) {   // a small stamina bar floating above your head
    const e = clamp(S.energy / 100, 0, 1), bw = clamp(0.85 * U, 34, 110), bh = clamp(0.13 * U, 7, 16), by = hy - 0.3 * U - bh;
    const col = S.energy < 10 ? '#ff4d4f' : S.energy < 40 ? '#ffb02e' : '#2ec4b6';   // green: no penalty, amber: a little, red: you are out
    ctx.save(); ctx.globalAlpha = e > 0.995 ? 0.55 : 1;
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(hx - bw / 2, by, bw, bh);
    ctx.fillStyle = col; ctx.fillRect(hx - bw / 2, by, bw * e, bh);
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, 0.02 * U); ctx.strokeRect(hx - bw / 2, by, bw, bh);
    ctx.restore();
  }
  if (cues && (p.rival || p.fast) && !p.isMe && !p.racer) {
    const fs = clamp(Math.round(0.34 * U), 12, 30);
    ctx.font = '700 ' + fs + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.fillStyle = '#ffffff';
    const mark = p.rival ? '!' : '»'; ctx.strokeText(mark, hx, hy - 0.2 * U); ctx.fillText(mark, hx, hy - 0.2 * U);
  }
  if (p.tele) {
    const a = 0.55 + 0.45 * Math.sin(S.clock * 18), sz = 0.12 * U, cy = hy - 0.34 * U;
    ctx.globalAlpha = Math.min(1, fogA(dz) * a + 0.2);
    ctx.fillStyle = p.rival ? '#ff2d3a' : '#ffcf1f'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, 0.03 * U);
    for (let i = 0; i < 2; i++) {
      const ox = hx + p.swDir * (i * sz * 1.1 - sz * 0.4);
      ctx.beginPath(); ctx.moveTo(ox + p.swDir * sz, cy); ctx.lineTo(ox - p.swDir * sz * 0.2, cy - sz); ctx.lineTo(ox - p.swDir * sz * 0.2, cy + sz); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = fogA(dz);
  }
  if (p.flag) {
    const a = W3(p.x + 0.28, 1.0, p.z), b = W3(p.x + 0.28, 2.7, p.z);
    ctx.strokeStyle = '#374151'; ctx.lineWidth = Math.max(1, 0.03 * s);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    const w = Math.sin(S.clock * 6) * 0.06, f1 = W3(p.x + 0.28, 2.7, p.z), f2 = W3(p.x + 0.85, 2.55 + w, p.z), f3 = W3(p.x + 0.28, 2.35, p.z);
    ctx.fillStyle = p.flag; ctx.beginPath(); ctx.moveTo(f1[0], f1[1]); ctx.lineTo(f2[0], f2[1]); ctx.lineTo(f3[0], f3[1]); ctx.closePath(); ctx.fill();
  }
  if (p.react && p.react.t >= 0 && p.react.t < 1.25 && dz < 32) {
    const t = p.react.t, a = t < 0.1 ? t / 0.1 : t > 1.0 ? (1.25 - t) / 0.25 : 1;
    const fs = clamp(Math.round(0.16 * U), 12, 18);
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.font = '700 ' + fs + 'px ' + FONT;
    const mt = ctx.measureText(p.react.text), tw = (mt && mt.width) || fs * 4;
    const bw = tw + 14, bh = fs + 10, by = hy - 0.32 * U - bh - t * 6, bxx = clamp(hx - bw / 2, 4, W - bw - 4);
    ctx.fillStyle = p.rival ? '#ff2d3a' : '#ffffff';
    rrect(bxx, by, bw, bh, 8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx - 5, by + bh - 1); ctx.lineTo(hx + 5, by + bh - 1); ctx.lineTo(hx, by + bh + 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = p.rival ? '#ffffff' : INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.react.text, bxx + bw / 2, by + bh / 2 + 1);
    ctx.globalAlpha = fogA(dz);
  }
  if (p.hit) {
    ctx.strokeStyle = '#ff4d4f'; ctx.lineWidth = Math.max(3, 0.06 * U);
    ctx.beginPath(); ctx.ellipse(bx, fy - 0.85 * U, 0.55 * U, 1.0 * U, 0, 0, TAU); ctx.stroke();
  }
  if (showHB) {
    for (const c of p.circles) {
      const cd = Math.max(0.3, dz + (c.oz || 0)), ss = F / cd;
      const cxp = CX + (p.x + c.ox - VX) * ss, rx = c.r * ss, ry = rx * Math.min(0.6, VY / cd);
      ctx.fillStyle = p.isMe ? 'rgba(39,194,122,0.3)' : 'rgba(255,77,79,0.28)'; ctx.strokeStyle = p.isMe ? '#27c27a' : '#ff4d4f'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(cxp, HOR + VY * ss, rx, ry, 0, 0, TAU); ctx.fill(); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}
