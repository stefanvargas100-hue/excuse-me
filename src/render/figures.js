import { INK, hex, shade } from '../config/colour.js';
import { FACE_DEFAULT } from '../config/faces.js';
import { DRAW_FAR, LV, fogA } from '../config/levels.js';
import { TAU, clamp, sgn } from '../config/util.js';
import { ctx } from '../dom.js';
import { CX, F, HOR, VX, VY, VZ, W } from './camera.js';
import { FONT, W3, ball, box3D, label } from './draw.js';
import { S, calm, cues, showHB } from '../sim/state.js';
import { variantOf } from './weather.js';
import { multGlow } from './fx.js';



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

function drawDog(p, s, heldBy) {
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
  const hand = heldBy || W3(p.x + p.dog * 0.24, 0.85, p.z);
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
  m: { sh: 1.12, ch: 1.12, wa: 0.9, hip: 0.8, limb: 1.04, neck: 0.1, head: 1.02, hipJ: 0.095, hipSway: 0.03, shSway: 0.1, neckUp: 0, kneeIn: 1, ankIn: 1 },
  f: { sh: 0.7, ch: 0.76, wa: 0.46, hip: 0.9, limb: 0.86, neck: 0.056, head: 0.95, hipJ: 0.105, hipSway: 0.11, shSway: 0.04, neckUp: 0.05, kneeIn: 0.8, ankIn: 0.68 }
};

// Rain on the stage: about a third of the crowd has an umbrella up. Picked from the person's own numbers, so it changes nothing in the run.
const umbrellaFor = p => variantOf() === 'rain' && p.ph !== undefined && !p.isMe && !p.racer && !p.prop && !p.lug && !p.boxes && !p.dance && !p.phone && (p.ph * 7) % 1 < 0.35;
function umbrellaShape(cx, by, rx, ry, col, colD, detail) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx - rx, by); ctx.quadraticCurveTo(cx - rx * 0.9, by - ry * 1.3, cx, by - ry); ctx.quadraticCurveTo(cx + rx * 0.9, by - ry * 1.3, cx + rx, by);
  if (detail) for (let i = 1; i >= -2; i--) ctx.quadraticCurveTo(cx + (i + 0.5) * rx * 0.5, by - ry * 0.22, cx + i * rx * 0.5, by);   // scalloped rim
  ctx.closePath(); ctx.fill();
  if (detail) { ctx.strokeStyle = LINE; ctx.lineWidth = Math.max(1, rx * 0.05); ctx.stroke(); ctx.strokeStyle = colD; ctx.lineWidth = Math.max(1, rx * 0.03); ctx.beginPath(); ctx.moveTo(cx, by - ry); ctx.lineTo(cx - rx * 0.5, by); ctx.moveTo(cx, by - ry); ctx.lineTo(cx + rx * 0.5, by); ctx.stroke(); }
}

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
    const knee = [side * P.hipJ * P.kneeIn, Math.sin(a) * 0.45, 0.93 - Math.cos(a) * 0.45];
    const sa = a - bend;
    const ankle = [side * P.hipJ * P.ankIn, knee[1] + Math.sin(sa) * 0.44, knee[2] - Math.cos(sa) * 0.44];
    minA = Math.min(minA, ankle[2]);
    legs.push({ side, knee, ankle, a });
  }
  const hopT = !calm && p.react && p.react.up && p.react.t >= 0 && p.react.t < 0.3 ? Math.sin(Math.PI * p.react.t / 0.3) * 0.07 : 0;   // a little startled hop when brushed past
  const drop = minA - 0.08 - hopT;   // planted foot stays on the floor, so the body bobs naturally
  // posture: lean into a dash, tip forward when bursting or hurrying, rock back after a bump, and a small squash as a dash lands
  const dashT = p.isMe ? (S ? S.dashT : 0) : p.dashT || 0, dashDir = p.isMe ? (S ? S.dashDir : 0) : p.dashDir || 0, burstT = p.isMe ? (S ? S.burstT : 0) : p.burstT || 0, bumpedT = p.isMe ? (S ? S.bumpT : 0) : p.bumpT || 0;
  const lean = (p.lean || 0) + (dashT > 0 ? dashDir * 0.13 : 0), pitchF = bumpedT > 0 ? -0.07 : burstT > 0 ? 0.1 : p.fast && !p.isMe ? 0.05 : 0;
  const vs = dashT > 0 && dashT < 0.1 && !calm ? 1 - 0.07 * Math.sin(Math.PI * (1 - dashT / 0.1)) : 1;
  const L = (lx, ly, u) => W3(p.x + (rx * lx + fx * (ly + pitchF * u)) * k + lean * u * k, (u - drop) * k * vs, p.z + (rz * lx + fz * (ly + pitchF * u)) * k);
  const sk = s * k;
  const vxv = p.x - VX, vzv = Math.max(0.2, p.z - VZ), vl = Math.hypot(vxv, vzv);
  const across = Math.abs(rx * (vzv / vl) - rz * (vxv / vl));   // 1 = shoulders face the camera, 0 = side-on
  const facing = fx * (vxv / vl) + fz * (vzv / vl);            // >0 walking away from the camera
  const sideDir = sgn(fx * (vzv / vl) - fz * (vxv / vl));
  const items = [];
  const chestD = L(0, 0, 1.38)[2];   // legs are drawn before the body unless you see them side-on, so the top of a leg never shows through the torso
  for (const g of legs) {
    const hip = L(g.side * P.hipJ, 0, 0.9), kn = L(g.knee[0], g.knee[1], g.knee[2]), an = L(g.ankle[0], g.ankle[1], g.ankle[2]);
    const th = clamp(g.a, -0.5, 0.5) * 0.9;   // foot roll: toe up as the leg swings forward, toe down as it pushes off
    const toe = L(g.ankle[0], g.ankle[1] + 0.13 * Math.cos(th), g.ankle[2] - 0.03 + 0.13 * Math.sin(th));
    items.push({ d: (across > 0.35 || p.shirtType === 'dress' || p.pantsType === 'pleats' || p.pantsType === 'pencil') ? Math.max(hip[2], chestD) + 0.05 : hip[2], f: () => {
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
        capsule([hip, kn], legW, p.pants, p.pantsD, p.pantsL);
        const keepTap = TAP; TAP = [0.9, 1, 1.65];
        capsule([kn, mix(kn, an, 0.5), an], legW, p.pants, p.pantsD, p.pantsL);
        TAP = keepTap;
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
        ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = '#f4f6f8';
        const dx = toe[0] - an[0], dy = toe[1] - an[1], len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len * (dx < 0 ? -1 : 1), ny = Math.abs(dx) / len;
        ctx.lineWidth = (st === 'platforms' ? 0.045 : 0.03) * sk;
        ctx.beginPath(); ctx.moveTo(an[0] + nx * lift * 0.5, an[1] + ny * lift * 0.5); ctx.lineTo(toe[0] + nx * lift * 0.5, toe[1] + ny * lift * 0.5); ctx.stroke(); ctx.restore();
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
  if (p.dog) items.push({ d: p.z + 0.15 - VZ, f: () => drawDog(p, s, leadHand) });
  if (p.boxes) {
    const bz = p.z + p.dirz * 0.6;
    items.push({ d: bz - VZ, f: () => {
      box3D(p.x - 0.26, p.x + 0.26, 0.05, 0.62, bz - 0.22, bz + 0.22, hex('#b08350'));
      box3D(p.x - 0.22, p.x + 0.22, 0.62, 1.12, bz - 0.2, bz + 0.2, hex('#c49563'));
      box3D(p.x - 0.18, p.x + 0.18, 1.12, 1.45, bz - 0.17, bz + 0.17, hex('#a8794a'));
    } });
  }
  const clk = S ? S.clock : 0;
  const cele = (p.racer && p.done) || (p.isMe && S && S.race && S.race.finished) || p.pose === 'win';   // crossed the line: arms up
  const talkOn = !calm && p.ph !== undefined && !p.pose && !p.phone && !p.aim && !p.dance && !p.isMe && !p.prop && !cele && Math.sin(clk * 0.9 + (p.ph || 0) * 3.1) > 0.15;
  const talkSide = p.chat || ((p.ph || 0) > 3.14 ? 1 : -1), talk = talkOn && (walk < 0.05 || !!p.chat);   // standing, or walking with a friend: one hand gestures now and then
  const umb = umbrellaFor(p), holdSide = p.phone ? -1 : (p.ph || 0) > 3.14 ? -1 : 1, carrying = umb || p.carry;
  const dogSide = p.dog ? (Math.sign(rx * p.dog) || p.dog) : 0;
  let leadHand = null, umbHand = null;
  const lugSide = p.lug ? (Math.sign(rx * p.lug) || p.lug) : 0;
  for (const side of [-1, 1]) {
    const ap = ph + (side > 0 ? 0 : Math.PI);
    // like the legs: one arm forward while the other is back, with the elbow bending as it comes forward
    const sw = Math.sin(ap);
    let c = sw * (p.fast ? 0.62 : 0.5) * walk, bend = p.fast ? 1.35 : 0.16 + (0.1 + 0.34 * Math.max(0, Math.cos(ap))) * walk, hx = 0.235 * armOut;
    if (p.react && p.react.up && p.react.t > 0 && p.react.t < 0.9) { c = 2.45; bend = 0.55; hx = 0.36; }   // hands up
    if (p.dance) { c = 1.7 + Math.sin(ph * 1.3 + side * 1.7) * 1.0; bend = 0.9; hx = 0.38; }
    if (cele) { c = 2.5 + (calm ? 0 : Math.sin(S.clock * 9 + side * 1.6) * 0.35); bend = 0.45; hx = 0.34; }
    else if (talk && side === talkSide) { c = 1.15 + Math.sin(clk * 5 + (p.ph || 0) * 2) * 0.4; bend = 1.2; hx = 0.18; }
    if (p.phone && side > 0) { c = 0.35; bend = 1.7; hx = 0.1; }
    if (p.aim && side > 0) { c = 1.25; bend = 1.5; hx = 0.1; }   // lifting a phone for a photo: about to stop
    if (p.pose === 'wave' && side > 0) { c = 2.75 + Math.sin(ph * 1.6) * 0.3; bend = 0.25; hx = 0.34; }   // podium: second place waves
    if (p.pose === 'clap') { const cl = Math.abs(Math.sin(ph * 1.5)); c = 1.15; bend = 1.45; hx = 0.03 + 0.05 * cl; }   // third place claps
    if (p.dog && side === dogSide && !cele) { c = 0.28 + sw * 0.05 * walk; bend = 0.32; hx = 0.3 * armOut; }   // holding the lead out to the side
    const carryHere = carrying && side === holdSide && !cele && !(p.react && p.react.up);
    if (carryHere) {
      if (umb) { c = 0.75; bend = 1.85; hx = 0.1; }
      else if (p.carry === 'coffee') { c = 0.42 + sw * 0.05 * walk; bend = 1.4; hx = 0.16; }
      else { c = sw * 0.1 * walk; bend = 0.08; hx = 0.25 * armOut; }
    }
    const el = [side * 0.245 * armOut, Math.sin(c) * 0.3, 1.42 - Math.cos(c) * 0.3];
    const fa = c + bend;
    const hd = [side * hx, el[1] + Math.sin(fa) * 0.27, el[2] - Math.cos(fa) * 0.27];
    const shp = L(side * 0.19 * armOut, 0.035 * Math.sin(ap) * walk, 1.42), elp = L(el[0], el[1], el[2]), hdp = L(hd[0], hd[1], hd[2]);
    const holds = side === lugSide;
    if (p.dog && side === dogSide) leadHand = hdp;
    if (umb && carryHere) umbHand = hdp;
    const grip = holds || (p.dog && side === dogSide) || carryHere || ((p.phone || p.aim) && side > 0);
    // seen from the front or back both arms hang beside the torso, so they are both drawn over it (like the legs); side-on, the far arm goes behind
    items.push({ d: across > 0.35 ? Math.min(shp[2], chestD) - 0.05 : shp[2] + 0.001, f: () => {
      let e2 = elp, h2 = hdp;
      if (holds && handle) { h2 = handle; e2 = [(shp[0] + handle[0]) / 2 + (handle[0] - shp[0]) * 0.1, (shp[1] + handle[1]) / 2, 0]; }
      TAP = ARM_TAP;
      const ty = p.shirtType, longSleeve = ['hoodie', 'jacket', 'velour', 'wind', 'varsity', 'power', 'puffer', 'suit'].includes(ty), armW = ty === 'puffer' ? 1.3 : 1;
      const sleeve = ty === 'varsity' ? '#f4f1ea' : p.shirt, sleeveD = ty === 'varsity' ? '#c9c4b6' : p.shirtD, sleeveL = ty === 'varsity' ? '#ffffff' : p.shirtL;
      if (ty === 'tank' || ty === 'dress') capsule([shp, e2], 0.085 * sk * lb, p.skin, p.skinD, p.skinL);
      else capsule([shp, e2], 0.095 * sk * lb * armW, sleeve, sleeveD, sleeveL);
      if (longSleeve) capsule([e2, h2], 0.082 * sk * lb * armW, sleeve, sleeveD, sleeveL);
      else capsule([e2, h2], 0.075 * sk * lb, p.skin, p.skinD, p.skinL);
      if (ty === 'jacket') { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, 0.022 * sk); ctx.beginPath(); ctx.moveTo(shp[0], shp[1]); ctx.lineTo(e2[0], e2[1]); ctx.lineTo(h2[0], h2[1]); ctx.stroke(); }
      if (ty === 'power') capsule([shp, mix(shp, e2, 0.36)], 0.115 * sk * lb, sleeve, sleeveD, sleeveL);
      TAP = null;
      if (sk * 0.09 > 2.5) {
        const ax = h2[0] - shp[0], ay = h2[1] - shp[1], ad = Math.hypot(ax, ay) || 1, anx = -ay / ad, any = ax / ad, aw = 0.045 * sk * lb;
        ctx.strokeStyle = longSleeve ? sleeveD : p.skinD; ctx.lineWidth = Math.max(1, 0.016 * sk); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(e2[0] - anx * aw, e2[1] - any * aw); ctx.lineTo(e2[0] + anx * aw * 0.3, e2[1] + any * aw * 0.3); ctx.stroke();
      }
      const hr = 0.041 * sk;
      {   // a hand: a rounded palm with a thumb on the inner side, pointing along the forearm
        const hx2 = h2[0] - e2[0], hy2 = h2[1] - e2[1], hd2 = Math.hypot(hx2, hy2) || 1, hux = hx2 / hd2, huy = hy2 / hd2, th = Math.atan2(huy, hux) - Math.PI / 2;
        const tx = h2[0] + hux * hr * 0.5 - huy * side * -hr * 0.85, ty2 = h2[1] + huy * hr * 0.5 + hux * side * -hr * 0.85;
        if (hr > 2.5) { const o = Math.max(1, hr * 0.3); ctx.fillStyle = LINE; ctx.beginPath(); ctx.ellipse(h2[0] + hux * hr * 0.25, h2[1] + huy * hr * 0.25, hr * (grip ? 1 : 0.92) + o, hr * (grip ? 1 : 1.12) + o, th, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(tx, ty2, hr * 0.38 + o, hr * 0.62 + o, th + side * 0.5, 0, TAU); ctx.fill(); }
        ctx.fillStyle = p.skin; ctx.beginPath(); ctx.ellipse(h2[0] + hux * hr * 0.25, h2[1] + huy * hr * 0.25, hr * (grip ? 1 : 0.92), hr * (grip ? 1 : 1.12), th, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(tx, ty2, hr * 0.38, hr * 0.62, th + side * 0.5, 0, TAU); ctx.fill();
        if (hr > 3.5) { ctx.strokeStyle = p.skinD; ctx.lineWidth = Math.max(1, hr * 0.14); ctx.beginPath(); ctx.moveTo(h2[0] - huy * hr * 0.5 + hux * hr * 0.55, h2[1] + hux * hr * 0.5 + huy * hr * 0.55); ctx.lineTo(h2[0] + huy * hr * 0.5 + hux * hr * 0.55, h2[1] - hux * hr * 0.5 + huy * hr * 0.55); ctx.stroke(); }
        if (grip && hr > 3) { ctx.strokeStyle = p.skinD; ctx.lineWidth = Math.max(1, hr * 0.14); ctx.beginPath(); for (const fo of [0.05, -0.4]) { ctx.moveTo(h2[0] - huy * hr * 0.55 + hux * hr * fo, h2[1] + hux * hr * 0.55 + huy * hr * fo); ctx.lineTo(h2[0] + huy * hr * 0.55 + hux * hr * fo, h2[1] - hux * hr * 0.55 + huy * hr * fo); } ctx.stroke(); }   // fingers closed round what they hold
        if (!longSleeve && ty !== 'tank' && ty !== 'dress' && hr > 2.5) { const ux = e2[0] - shp[0], uy = e2[1] - shp[1], ud = Math.hypot(ux, uy) || 1, cw = 0.05 * sk * lb, cx = shp[0] + ux * 0.94, cy = shp[1] + uy * 0.94; ctx.strokeStyle = sleeveD; ctx.lineWidth = Math.max(1.1, 0.02 * sk); ctx.beginPath(); ctx.moveTo(cx - uy / ud * cw, cy + ux / ud * cw); ctx.lineTo(cx + uy / ud * cw, cy - ux / ud * cw); ctx.stroke(); }   // sleeve hem
        if (longSleeve && hr > 2.5) { const cw = 0.047 * sk * lb * armW, cx = e2[0] + hx2 * 0.8, cy = e2[1] + hy2 * 0.8; ctx.strokeStyle = sleeveD; ctx.lineWidth = Math.max(1.2, 0.03 * sk); ctx.beginPath(); ctx.moveTo(cx - huy * cw, cy + hux * cw); ctx.lineTo(cx + huy * cw, cy - hux * cw); ctx.stroke(); }
      }
      if ((p.phone || p.aim) && side > 0) {
        ctx.fillStyle = '#111827'; ctx.fillRect(h2[0] - 0.04 * sk, h2[1] - 0.09 * sk, 0.08 * sk, 0.13 * sk);
        if (facing > 0.2) { ctx.fillStyle = '#39414f'; ctx.beginPath(); ctx.arc(h2[0] - 0.018 * sk, h2[1] - 0.065 * sk, Math.max(0.8, 0.011 * sk), 0, TAU); ctx.fill(); }   // from behind you see the back of the phone
        else {
          ctx.fillStyle = '#8ecbff'; ctx.fillRect(h2[0] - 0.03 * sk, h2[1] - 0.08 * sk, 0.06 * sk, 0.1 * sk);
          if (LV.night && hr > 2.5) { ctx.fillStyle = 'rgba(142,203,255,0.16)'; ctx.beginPath(); ctx.arc(h2[0], h2[1] - 0.05 * sk, 0.17 * sk, 0, TAU); ctx.fill(); }   // screen glow in the dark
        }
        if (hr > 2.5) {   // fingers round one edge, thumb on the other
          ctx.fillStyle = p.skin;
          for (let fi = 0; fi < 3; fi++) { ctx.beginPath(); ctx.arc(h2[0] + 0.043 * sk, h2[1] - 0.05 * sk + fi * 0.03 * sk, Math.max(0.9, 0.013 * sk), 0, TAU); ctx.fill(); }
          ctx.beginPath(); ctx.ellipse(h2[0] - 0.042 * sk, h2[1] - 0.012 * sk, Math.max(0.9, 0.014 * sk), Math.max(1.2, 0.028 * sk), 0, 0, TAU); ctx.fill();
        }
      }
      if (carryHere && !umb && p.carry === 'coffee') {   // a takeaway cup
        const cw = 0.042 * sk, ch = 0.11 * sk, cx = h2[0], cy = h2[1] - ch * 0.42;
        ctx.fillStyle = '#f4f1ea'; ctx.beginPath(); ctx.moveTo(cx - cw, cy - ch / 2); ctx.lineTo(cx + cw, cy - ch / 2); ctx.lineTo(cx + cw * 0.76, cy + ch / 2); ctx.lineTo(cx - cw * 0.76, cy + ch / 2); ctx.closePath(); ctx.fill();
        if (hr > 2.5) { ctx.strokeStyle = LINE; ctx.lineWidth = Math.max(1, 0.012 * sk); ctx.stroke(); ctx.fillStyle = '#8a5a34'; ctx.fillRect(cx - cw * 0.9, cy - ch * 0.08, cw * 1.8, ch * 0.3); ctx.fillStyle = '#2b2f36'; ctx.fillRect(cx - cw * 1.05, cy - ch * 0.62, cw * 2.1, ch * 0.15); }
      } else if (carryHere && !umb && p.carry === 'bag') {   // a shopping bag on two string handles
        const bw = 0.13 * sk, bh = 0.21 * sk, by = h2[1] + 0.12 * sk;
        if (hr > 2.5) { ctx.strokeStyle = LINE; ctx.lineWidth = Math.max(1, 0.01 * sk); ctx.beginPath(); ctx.moveTo(h2[0], h2[1]); ctx.lineTo(h2[0] - bw * 0.5, by); ctx.moveTo(h2[0], h2[1]); ctx.lineTo(h2[0] + bw * 0.5, by); ctx.stroke(); }
        ctx.fillStyle = p.gear; ctx.fillRect(h2[0] - bw, by, bw * 2, bh);
        if (hr > 2.5) { ctx.fillStyle = p.gearL; ctx.fillRect(h2[0] - bw, by, bw * 2, bh * 0.14); ctx.strokeStyle = LINE; ctx.lineWidth = Math.max(1, 0.012 * sk); ctx.strokeRect(h2[0] - bw, by, bw * 2, bh); }
      }
    } });
  }
  const chest = L(0, 0, 1.38), waist = L(0, 0, 0.98), neck = L(0, 0, 1.48), pelvis = L(0, 0, 0.82);
  const swayK = Math.sin(ph) * walk * across;   // shoulders and hips swing against each other while walking
  items.push({ d: chest[2], f: () => {
    const inkIt = lw => { if (hwC > 2) { const keep = ctx.strokeStyle; ctx.strokeStyle = LINE; ctx.lineWidth = lw + Math.max(1.2, hwC * 0.16); ctx.stroke(); ctx.strokeStyle = keep; ctx.lineWidth = lw; } };
    const sC = F / chest[2] * k, hb = (0.1 + 0.09 * across) * bulk * sC;
    const hwS = hb * P.sh * wide, hwC = hb * P.ch * wide, hwW = hb * P.wa * (1 + (wide - 1) * 0.5), hipW = hb * P.hip;
    const shY = neck[1] + (chest[1] - neck[1]) * (fem ? 0.5 : 0.28), nkW = hwC * (fem ? 0.4 : 0.5), mid = (chest[1] + waist[1]) / 2;
    const upX = -swayK * hb * P.shSway, loX = swayK * hb * P.hipSway, bow = fem ? -hwC * 0.12 : hwC * 0.04;
    ctx.save();
    // hips: the pants block is shaped to the body type (female: wide hips, narrow waist)
    ctx.save(); ctx.translate(loX, 0);
    ctx.fillStyle = p.pants; ctx.strokeStyle = p.pants; ctx.lineWidth = hwC * 0.3; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(waist[0] - hwW, waist[1]); ctx.lineTo(waist[0] + hwW, waist[1]);
    ctx.quadraticCurveTo(waist[0] + (hwW + hipW) * 0.56, (waist[1] + pelvis[1]) / 2, pelvis[0] + hipW, pelvis[1]); ctx.lineTo(pelvis[0] - hipW, pelvis[1]);
    ctx.quadraticCurveTo(waist[0] - (hwW + hipW) * 0.56, (waist[1] + pelvis[1]) / 2, waist[0] - hwW, waist[1]); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // upper body: sloped shoulders, a chest that tapers to the waist
    ctx.translate(upX, 0);
    const g = ctx.createLinearGradient(chest[0] - hwS, 0, chest[0] + hwS, 0);
    g.addColorStop(0, p.shirtL); g.addColorStop(0.5, p.shirt); g.addColorStop(1, p.shirtD);
    ctx.fillStyle = g; ctx.strokeStyle = g; ctx.lineWidth = hwC * 0.4;
    ctx.beginPath(); ctx.moveTo(neck[0] - nkW, neck[1]); ctx.lineTo(neck[0] + nkW, neck[1]);
    if (fem) {   // soft sloping shoulders that round off into the arm, a bust line, a clear waist
      ctx.quadraticCurveTo(neck[0] + (nkW + hwS) * 0.62, neck[1], chest[0] + hwS, shY);
      ctx.quadraticCurveTo(chest[0] + hwS * 1.1, shY + (chest[1] - shY) * 0.75, chest[0] + hwC, chest[1]);
    } else { ctx.quadraticCurveTo(neck[0] + (nkW + hwS) * 0.56, neck[1] + (shY - neck[1]) * 0.2, chest[0] + hwS, shY); ctx.lineTo(chest[0] + hwC, chest[1]); }
    ctx.quadraticCurveTo(chest[0] + (hwC + hwW) * 0.5 + bow, mid + (waist[1] - mid) * 0.2, waist[0] + hwW, waist[1]); ctx.lineTo(waist[0] - hwW, waist[1]);
    ctx.quadraticCurveTo(chest[0] - (hwC + hwW) * 0.5 - bow, mid + (waist[1] - mid) * 0.2, chest[0] - hwC, chest[1]);
    if (fem) {
      ctx.quadraticCurveTo(chest[0] - hwS * 1.1, shY + (chest[1] - shY) * 0.75, chest[0] - hwS, shY);
      ctx.quadraticCurveTo(neck[0] - (nkW + hwS) * 0.62, neck[1], neck[0] - nkW, neck[1]);
    } else { ctx.lineTo(chest[0] - hwS, shY); ctx.quadraticCurveTo(neck[0] - (nkW + hwS) * 0.56, neck[1] + (shY - neck[1]) * 0.2, neck[0] - nkW, neck[1]); }
    ctx.closePath();
    inkIt(hwC * 0.4); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.clip();
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
    if (fem && hwC > 3 && facing < 0.35) {   // a bust: two soft curves seen from the front, one forward bump seen from the side, nothing from behind
      const fw = Math.sqrt(Math.max(0, 1 - across * across)), unit = sC * bulk, rb = 0.062 * unit, by = chest[1] + (waist[1] - chest[1]) * 0.3;
      const lat = 0.072 * unit * across, fwd = 0.04 * unit * fw * sideDir, keep = ctx.globalAlpha;
      ctx.globalAlpha = keep * clamp((0.35 - facing) / 0.45, 0, 1);
      ctx.lineCap = 'round';
      for (const sd of [-1, 1]) {
        const bx = chest[0] + sd * lat + fwd, r = rb;
        if (fw > 0.3) { ctx.globalAlpha = keep * clamp((0.35 - facing) / 0.45, 0, 1) * clamp(fw * 1.4 - 0.2, 0, 1); ctx.fillStyle = LINE; ctx.beginPath(); ctx.arc(bx, by, r + Math.max(1.1, hwC * 0.07), 0, TAU); ctx.fill(); ctx.globalAlpha = keep * clamp((0.35 - facing) / 0.45, 0, 1); }
        ctx.fillStyle = p.shirt; ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fill();
        if (r > 2) {
          ctx.fillStyle = p.shirtL; ctx.globalAlpha *= 0.32; ctx.beginPath(); ctx.arc(bx - r * 0.22, by - r * 0.3, r * 0.48, 0, TAU); ctx.fill(); ctx.globalAlpha /= 0.32;
          ctx.strokeStyle = p.shirtD; ctx.globalAlpha *= 0.7; ctx.lineWidth = Math.max(1, r * 0.15); ctx.beginPath(); ctx.arc(bx, by, r * 0.86, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke(); ctx.globalAlpha /= 0.7;
        }
      }
      ctx.globalAlpha = keep;
    }
    const ty = p.shirtType, band = (a, b, col) => { ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, hwC * 0.12); ctx.beginPath(); ctx.moveTo(a[0] - hwC * 0.95, a[1] + (b - a[1])); ctx.lineTo(a[0] + hwC * 0.95, a[1] + (b - a[1])); ctx.stroke(); };
    if (ty === 'baby') { const c = mix(chest, waist, 0.55), skin = ctx.createLinearGradient(chest[0] - hwC, 0, chest[0] + hwC, 0); skin.addColorStop(0, p.skinL); skin.addColorStop(0.55, p.skin); skin.addColorStop(1, p.skinD); ctx.fillStyle = skin; ctx.fillRect(chest[0] - hwC * 2, c[1], hwC * 4, waist[1] - c[1] + hwC); ctx.strokeStyle = p.shirtD; ctx.lineWidth = Math.max(1, hwC * 0.08); ctx.beginPath(); ctx.moveTo(chest[0] - hwC * 2, c[1]); ctx.lineTo(chest[0] + hwC * 2, c[1]); ctx.stroke(); }
    if (ty === 'wind') { const c = mix(neck, waist, 0.42); ctx.fillStyle = '#ffffff'; ctx.fillRect(c[0] - hwC * 1.02, c[1] - hwC * 0.22, hwC * 2.04, hwC * 0.44); }
    if (ty === 'puffer') for (const t of [0.28, 0.52, 0.76]) { const c = mix(neck, waist, t); band(c, c[1], p.shirtD); }
    if (ty === 'velour' || ty === 'varsity') { ctx.strokeStyle = ty === 'velour' ? p.shirtL : '#ffffff'; ctx.lineWidth = Math.max(1, hwC * 0.08); ctx.beginPath(); ctx.moveTo(neck[0], neck[1]); ctx.lineTo(waist[0], waist[1]); ctx.stroke(); }
    if ((ty === 'suit' || ty === 'power') && facing < 0) {   // shirt and tie, seen from the front
      const v = mix(neck, waist, 0.55);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(neck[0] - hwC * 0.42, neck[1]); ctx.lineTo(neck[0] + hwC * 0.42, neck[1]); ctx.lineTo(v[0], v[1]); ctx.closePath(); ctx.fill();
      if (ty === 'suit') { ctx.strokeStyle = '#b3243a'; ctx.lineWidth = Math.max(1, hwC * 0.14); ctx.beginPath(); ctx.moveTo(neck[0], neck[1]); ctx.lineTo(v[0], v[1]); ctx.stroke(); }
    }
    ctx.restore(); // end torso decoration clip
    // skirts hang from the waist over whatever is underneath, so a dress goes with any bottoms
    const hwK = Math.max(hwC, (0.105 + 0.095 * across) * bulk * sC * P.ch);   // a skirt does not thin out when you turn side-on
    const skirtOf = (bottom, topW, botW, col, colD) => { const b = L(0, 0, bottom); const shade = ctx.createLinearGradient(waist[0] - hwK, 0, waist[0] + hwK, 0); shade.addColorStop(0, col); shade.addColorStop(0.6, col); shade.addColorStop(1, colD); ctx.fillStyle = shade; ctx.strokeStyle = LINE; ctx.lineWidth = Math.max(1.2, hwK * 0.12); const sway = Math.sin(ph) * walk * hwK * 0.04, dip = hwK * 0.22; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(waist[0] - hwK * topW, waist[1]); ctx.lineTo(waist[0] + hwK * topW, waist[1]); ctx.quadraticCurveTo(waist[0] + hwK * (topW + botW) * 0.56, (waist[1] + b[1]) / 2, b[0] + hwK * botW + sway, b[1]); ctx.quadraticCurveTo(b[0] + sway, b[1] + dip, b[0] - hwK * botW + sway, b[1]); ctx.quadraticCurveTo(waist[0] - hwK * (topW + botW) * 0.56, (waist[1] + b[1]) / 2, waist[0] - hwK * topW, waist[1]); ctx.closePath(); ctx.fill(); ctx.stroke(); };
    ctx.save(); ctx.translate(loX - upX, 0); const tw = hwW / hwK * 1.1;
    if (p.pantsType === 'pleats') { skirtOf(0.56, tw, 1.4, p.pants, p.pantsD); ctx.strokeStyle = p.pantsD; ctx.lineWidth = Math.max(1, hwC * 0.05); const b = L(0, 0, 0.56); for (const f of [-0.75, -0.25, 0.25, 0.75]) { ctx.beginPath(); ctx.moveTo(waist[0] + hwK * f * 0.8, waist[1]); ctx.lineTo(b[0] + hwK * f * 1.32, b[1]); ctx.stroke(); } }
    if (p.pantsType === 'pencil') skirtOf(0.5, tw, Math.max(1.03, tw), p.pants, p.pantsD);
    if (ty === 'dress') { skirtOf(0.5, tw, 1.25, p.shirt, p.shirtD); ctx.strokeStyle = g; ctx.lineWidth = Math.max(2, hwC * 0.18); ctx.beginPath(); ctx.moveTo(waist[0] - hwW, waist[1]); ctx.lineTo(waist[0] + hwW, waist[1]); ctx.stroke(); }
    ctx.restore();
    if (facing < -0.2 && hwC > 4) {   // collars, lapels and pockets, seen from the front
      const pc = mix(chest, waist, 0.72);
      if (ty === 'hoodie') { ctx.fillStyle = 'rgba(20,10,40,0.16)'; ctx.strokeStyle = p.shirtD; ctx.lineWidth = Math.max(1, hwC * 0.06); rrect(pc[0] - hwC * 0.55, pc[1] - hwC * 0.12, hwC * 1.1, hwC * 0.42, hwC * 0.1); ctx.fill(); ctx.stroke(); }
      if (['jacket', 'wind', 'varsity', 'suit', 'power', 'velour'].includes(ty)) {
        ctx.strokeStyle = p.shirtD; ctx.lineWidth = Math.max(1, hwC * 0.06); ctx.lineCap = 'round';
        for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(pc[0] + sd * hwC * 0.36, pc[1]); ctx.lineTo(pc[0] + sd * hwC * 0.7, pc[1] - hwC * 0.02); ctx.stroke(); }   // flat pocket flaps
        ctx.fillStyle = ty === 'varsity' || ty === 'jacket' || ty === 'wind' ? p.shirtD : p.shirtL;
        for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(neck[0] + sd * nkW * 0.9, neck[1] - hwC * 0.02); ctx.lineTo(neck[0] + sd * nkW * 1.55, neck[1] + hwC * 0.28); ctx.lineTo(neck[0] + sd * nkW * 0.25, neck[1] + hwC * 0.4); ctx.closePath(); ctx.fill(); }
      }
    }
    if (hwC > 4 && ty !== 'dress' && p.pantsType !== 'pleats' && p.pantsType !== 'pencil') {
      const pt = p.pantsType, by = waist[1] + hwC * 0.14;
      if (pt === 'jeans' || pt === undefined || pt === 'slacks' || pt === 'cargo' || pt === 'acid') {   // a belt, its buckle in front
        ctx.strokeStyle = pt === 'slacks' ? '#1b1b1f' : '#5b3a22'; ctx.lineWidth = Math.max(1, hwC * 0.11); ctx.beginPath(); ctx.moveTo(waist[0] - hwW * 1.02, by); ctx.lineTo(waist[0] + hwW * 1.02, by); ctx.stroke();
        if (facing < -0.2) { ctx.fillStyle = '#d4c27a'; ctx.fillRect(waist[0] - hwC * 0.1, by - hwC * 0.09, hwC * 0.2, hwC * 0.18); }
      }
      if (facing > 0.2 && (pt === 'jeans' || pt === undefined || pt === 'acid' || pt === 'cargo')) {   // back pockets
        ctx.strokeStyle = p.pantsD; ctx.lineWidth = Math.max(1, hwC * 0.05); const py = mix(waist, pelvis, 0.55)[1];
        for (const sd of [-1, 1]) { rrect(pelvis[0] + sd * hipW * 0.46 - hipW * 0.24, py - hipW * 0.2, hipW * 0.48, hipW * 0.46, hipW * 0.08); ctx.stroke(); }
      }
    }
    if (p.racer && hwC > 5) {   // a race bib with the racer's initial, so you can tell them from the crowd at a glance
      const bc2 = mix(chest, waist, 0.42), bw2 = hwC * 0.92, bh2 = hwC * 0.68;
      ctx.fillStyle = '#ffffff'; rrect(bc2[0] - bw2 / 2, bc2[1] - bh2 / 2, bw2, bh2, hwC * 0.08); ctx.fill(); ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(1.2, hwC * 0.09); ctx.stroke();
      ctx.fillStyle = LINE; ctx.font = '700 ' + Math.round(bh2 * 0.72) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText((p.name || '?').charAt(0), bc2[0], bc2[1] + bh2 * 0.04);
    }
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
  const nu = P.neckUp, head = L(-0.012 * Math.sin(ph) * walk * across, 0.02 + pitch, 1.63 + nu - pitch * 0.6 + 0.02 * Math.cos(ph * 2) * walk), neckTop = L(0, 0, 1.54 + nu), brimP = L(0, 0.22 + pitch, 1.69 + nu - pitch * 0.6);
  const out = {};
  const hl = p.hairStyle === 'long' ? 1 : p.hairStyle === 'medium' ? 0.55 : 0;   // how far the hair hangs: 0 short, 0.55 shoulder length, 1 long
  if (hl && !p.bald && facing < -0.2) {   // long hair seen from the front hangs behind the shoulders, not over the chest and neck
    items.push({ d: Math.max(head[2], chestD) + 0.1, f: () => {
      const r = 0.115 * P.head * F / head[2] * k;
      // two locks hang beside the neck and drop behind the shoulders, so the neck and chest stay clear
      const ox = facing > -0.35 ? sideDir * r * 0.25 : 0;
      ctx.fillStyle = p.hair; ctx.beginPath(); ctx.ellipse(head[0] - ox, head[1] + r * 0.2, r * 1.05, r * 1.0, 0, 0, TAU); ctx.fill();
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(head[0] - ox + sd * r * 0.82, head[1] + r * (0.2 + 0.8 * hl), r * 0.42, r * (0.45 + 0.65 * hl), sd * -0.08, 0, TAU); ctx.fill(); }
    } });
  }
  items.push({ d: head[2] - 0.002, f: () => {
    const r = 0.115 * P.head * F / head[2] * k, hx = head[0], hy = head[1];
    const longHair = hl > 0 && !p.bald;
    const brim = () => {
      ctx.fillStyle = p.gearD; ctx.beginPath();
      ctx.ellipse((hx + brimP[0]) / 2, (hy - r * 0.2 + brimP[1]) / 2, r * 0.9 + Math.abs(brimP[0] - hx) * 0.5, r * 0.24, 0, 0, TAU); ctx.fill();
    };
    capsule([neck, neckTop], P.neck * sk, p.skin, p.skinD, p.skinL);
    if (longHair && facing <= 0.35 && facing >= -0.2) { ctx.fillStyle = p.hair; ctx.beginPath(); ctx.ellipse(hx - (facing > -0.35 ? sideDir * r * 0.25 : 0), hy + r * (0.05 + 0.5 * hl), r * 1.05, r * (0.6 + 0.55 * hl), 0, 0, TAU); ctx.fill(); }
    if (p.hat === 'cap' && facing > 0.35) brim();
    ball(hx, hy, r, p.skin, p.skinL, p.skinD);
    if (r > 3) { ctx.strokeStyle = LINE; ctx.lineWidth = Math.max(1.2, r * 0.13); ctx.beginPath(); ctx.arc(hx, hy, r, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = p.hair;
    if (facing > 0.35) {
      if (!p.bald) {
        ctx.beginPath(); ctx.arc(hx, hy - r * 0.05, r * 1.01, 0, TAU); ctx.fill();
        if (longHair) { ctx.beginPath(); ctx.ellipse(hx, hy + r * (0.1 + 0.55 * hl), r * 0.98, r * (0.55 + 0.55 * hl), 0, 0, TAU); ctx.fill(); }
      }
    } else if (facing < -0.35) {
      if (!p.bald) { ctx.beginPath(); ctx.arc(hx, hy - r * 0.12, r * 1.0, Math.PI, TAU); ctx.closePath(); ctx.fill(); }
      drawFace(p, hx + (p.chat && talkOn ? p.chat * r * 0.2 : 0), hy, r, 0);
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
    if (!p.bald && (p.hairStyle === 'bun' || p.hairStyle === 'pony' || p.hairStyle === 'curly' || p.hairStyle === 'braid')) {
      const hs = p.hairStyle, bk = -sideDir, sideOn = Math.abs(facing) <= 0.35, sway = Math.sin(ph) * walk * r * 0.28;
      ctx.fillStyle = p.hair; ctx.strokeStyle = LINE; ctx.lineWidth = Math.max(1, r * 0.1);
      const blob = (x, y, rx, ry, rot) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); if (r > 4) ctx.stroke(); };
      if (hs === 'bun') blob(sideOn ? hx + bk * r * 0.5 : hx, hy - r * 1.05, r * 0.42, r * 0.38, 0);
      else if (hs === 'pony') { if (facing > 0.35) blob(hx + sway, hy + r * 0.8, r * 0.3, r * 0.85, sway / r * 0.5); else if (sideOn) blob(hx + bk * (r * 1.12 + Math.abs(sway) * 0.2), hy + r * 0.4, r * 0.3, r * 0.82, -bk * 0.45 + bk * sway / r * 0.4); else blob(hx, hy - r * 0.98, r * 0.3, r * 0.2, 0); }
      else if (hs === 'braid') { if (facing > 0.35 || sideOn) for (let i = 0; i < 4; i++) blob((sideOn ? hx + bk * r * 0.98 : hx) + sway * (i / 3), hy + r * (0.85 + 0.5 * i), r * 0.27, r * 0.3, 0); }
      else { ctx.lineWidth = Math.max(1, r * 0.07); for (let i = 0; i < 9; i++) { const a = Math.PI * (0.95 + i * 0.138); blob(hx + Math.cos(a) * r * 0.98, hy - r * 0.08 + Math.sin(a) * r * 0.98, r * 0.3, r * 0.3, 0); } }
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
  if (umb) items.push({ d: head[2] - 0.02, f: () => {
    const top = L(0, 0, 2.2 + nu), rx0 = 0.46 * sk, ry0 = 0.2 * sk, by = top[1] + ry0;
    if (umbHand) { ctx.strokeStyle = '#2b2f36'; ctx.lineWidth = Math.max(1, 0.016 * sk); ctx.beginPath(); ctx.moveTo(umbHand[0], umbHand[1]); ctx.lineTo(top[0], top[1]); ctx.stroke(); }
    umbrellaShape(top[0], by, rx0, ry0, p.gear, p.gearD, rx0 > 6);
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
  if (umbrellaFor(p)) umbrellaShape(bx, fy - 1.98 * U, 0.46 * U, 0.2 * U, p.gear, p.gearD, false);
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
      // a soil pit at the foot: ground you can step on, only the trunk is solid
      ctx.fillStyle = 'rgba(74,56,38,0.5)'; ctx.strokeStyle = 'rgba(30,30,30,0.45)'; ctx.lineWidth = Math.max(1, 0.03 * s);
      ctx.beginPath(); ctx.ellipse(bx, fy, 0.45 * s, 0.45 * s * Math.min(0.6, VY / (z - VZ)), 0, 0, TAU); ctx.fill(); ctx.stroke();
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
    case 'carriage': {
      const dir=p.dirx||1, seg=(a,b,y0,y1,depth,c)=>box3D(Math.min(x-dir*a,x-dir*b),Math.max(x-dir*a,x-dir*b),y0,y1,z-depth,z+depth,hex(c));
      seg(0.3,1.9,0.8,1.5,0.35,'#88603c'); // horse
      seg(0,0.65,1.25,2.05,0.24,'#88603c');
      for(const a of [0.55,1.55])for(const side of [-1,1])box3D(x-dir*a-0.08,x-dir*a+0.08,0,0.9,z+side*0.25-0.06,z+side*0.25+0.06,hex('#59402c'));
      seg(1.8,3.2,0.65,0.72,0.12,'#403728'); // shafts
      seg(2.6,4.9,0.55,1.35,0.7,'#284a35');
      seg(3.1,4.9,1.8,2.1,0.75,'#f0e7d3'); // canopy
      for(const a of [3.1,4.7])for(const side of [-1,1]){
        box3D(x-dir*a-0.04,x-dir*a+0.04,1.2,1.9,z+side*0.6-0.04,z+side*0.6+0.04,hex('#403728'));
        const q=W3(x-dir*a,0.42,z+side*0.7);ctx.strokeStyle='#3a332b';ctx.lineWidth=Math.max(1,0.08*F/q[2]);ctx.beginPath();ctx.arc(q[0],q[1],0.4*F/q[2],0,TAU);ctx.stroke();
      }
      break;
    }
    case 'train': {   // one subway car beside the platform edge, with its doors open
      const x0 = x - 1.4, x1 = x + 1.4, hl = (p.len || 8.5) / 2;
      box3D(x0, x1, 0.35, 3.7, z - hl, z + hl, hex('#aeb6bd'));
      box3D(x0 - 0.02, x0 + 0.01, 1.5, 2.5, z - hl + 0.4, z + hl - 0.4, hex('#2c3a47'));
      box3D(x0 - 0.04, x0, 0.35, 0.6, z - hl, z + hl, hex('#3f6fb5'));
      box3D(x0 - 0.05, x0, 0.25, 2.6, z - 0.9, z + 0.9, hex('#f5e7a8'));
      break;
    }
    case 'tripod': {
      for(const side of [-1,1])box3D(x+side*0.3-0.07,x+side*0.3+0.07,0,1.15,z-0.3,z+0.3,hex('#56616a'));
      box3D(x-0.25,x+0.25,1.1,1.4,z-0.15,z+0.15,hex('#273744'));
      box3D(x-0.1,x+0.1,1.17,1.32,z-0.25,z-0.15,hex('#89b6ce'));
      break;
    }
    case 'easel': {
      for (const side of [-1,1]) box3D(x+side*0.35-0.07,x+side*0.35+0.07,0,1.45,z-0.3,z+0.3,hex('#956b43'));
      box3D(x-0.45,x+0.45,0.65,1.55,z-0.08,z+0.08,hex('#eee1be'));
      box3D(x-0.38,x+0.38,0.72,1.48,z-0.09,z-0.08,hex('#a4c8b5'));
      box3D(x-0.25,x+0.2,0.72,1.02,z-0.1,z-0.09,hex('#639264'));
      break;
    }
    case 'pretzel':
    case 'cart': {
      box3D(x - 0.45, x + 0.45, 0.25, 1.1, z - 1.0, z + 1.0, hex('#c9ced6'));
      const a = W3(x, 1.1, z), b = W3(x, 2.25, z);
      capsule([a, b], 0.05 * s, '#6b7280', '#374151', null);
      ctx.fillStyle = '#2f80ed'; ctx.beginPath(); ctx.ellipse(b[0], b[1], 1.2 * F / b[2], 0.5 * F / b[2], 0, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = '#ffcf1f'; ctx.beginPath(); ctx.ellipse(b[0], b[1], 0.6 * F / b[2], 0.5 * F / b[2], 0, Math.PI, TAU); ctx.fill();
      const fq0 = W3(x, 0.7, z - 1.01); label(p.prop === 'pretzel' ? 'PRETZELS' : 'HOT DOGS', fq0[0], fq0[1], Math.round(0.2 * F / fq0[2]), '#c0392b');
      break;
    }
    case 'board': box3D(x - 0.3, x + 0.3, 0, 0.95, z - 0.12, z + 0.12, hex('#1f2937')); { const q = W3(x, 0.6, z - 0.13); label('SALE', q[0], q[1], Math.round(0.18 * F / q[2]), '#f4f6f8'); } break;
    case 'desk': {
      box3D(x - 1.35, x + 1.35, 0, 1.05, z - 0.45, z + 0.45, hex('#5b6b86'));
      box3D(x - 1.42, x + 1.42, 1.05, 1.13, z - 0.52, z + 0.52, hex('#e8edf4'));
      box3D(x - 0.9, x - 0.4, 1.13, 1.45, z - 0.1, z + 0.1, hex('#1f2937'));
      const q = W3(x, 0.62, z - 0.46); label('CHECK-IN', q[0], q[1], Math.round(0.2 * F / q[2]), '#ffffff');
      break;
    }
    case 'barrier': {
      for (const dx of [-0.7, 0.7]) box3D(x + dx - 0.05, x + dx + 0.05, 0, 0.6, z - 0.1, z + 0.1, hex('#6b7280'));
      box3D(x - 0.95, x + 0.95, 0.6, 1.0, z - 0.06, z + 0.06, hex('#f2994a'));
      box3D(x - 0.35, x + 0.0, 0.6, 1.0, z - 0.07, z + 0.07, hex('#f4f1ea'));
      break;
    }
    case 'newsstand': {
      box3D(x - 0.9, x + 0.9, 0, 1.7, z - 0.55, z + 0.55, hex('#2f5d3a'));
      box3D(x - 1.0, x + 1.0, 1.7, 1.85, z - 0.65, z + 0.65, hex('#1f3d2b'));
      const q = W3(x, 1.2, z - 0.56); label('NEWS', q[0], q[1], Math.round(0.26 * F / q[2]), '#ffffff');
      break;
    }
    case 'bikes': {   // a bike at each spot in the rack (the same spots the hitbox uses), parked along a low rail
      const os = p.rack || [-0.6, 0, 0.6], cols = ['#c0392b', '#2aa56a', '#2f80ed', '#f2994a', '#9b51e0'], lw = Math.max(1.4, 0.045 * s);
      box3D(x + os[0] - 0.12, x + os[os.length - 1] + 0.12, 0, 0.07, z - 0.03, z + 0.03, hex('#6b7280'));
      const line = (pts, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); pts.forEach((q, i) => { const c = W3(q[0], q[1], q[2]); if (i) ctx.lineTo(c[0], c[1]); else ctx.moveTo(c[0], c[1]); }); ctx.stroke(); };
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      os.forEach((ox, i) => {
        const bx0 = x + ox, col = cols[(i + Math.abs(Math.round(x * 3))) % cols.length];
        for (const wz of [0.3, -0.3]) {   // wheels, far one first
          const ring = []; for (let k = 0; k <= 14; k++) { const a = k / 14 * TAU; ring.push([bx0, 0.3 + 0.28 * Math.sin(a), z + wz + 0.28 * Math.cos(a)]); }
          line(ring, INK, lw * 1.3);
        }
        const back = [bx0, 0.3, z + 0.3], front = [bx0, 0.3, z - 0.3], bb = [bx0, 0.33, z + 0.02], seat = [bx0, 0.82, z + 0.16], head = [bx0, 0.86, z - 0.2];
        line([back, bb, head, front], col, lw); line([bb, seat, back], col, lw); line([seat, head], col, lw);
        line([[bx0 - 0.03, 0.86, z + 0.24], [bx0 + 0.03, 0.86, z + 0.08]], INK, lw * 1.6);           // saddle
        line([[bx0 - 0.2, 0.95, z - 0.22], [bx0 + 0.2, 0.95, z - 0.22]], INK, lw * 1.2);             // handlebars
        line([head, [bx0, 0.95, z - 0.22]], col, lw);
      });
      break;
    }
    case 'bench': {
      box3D(x - 0.7, x + 0.7, 0.05, 0.4, z - 0.25, z + 0.25, hex('#6b4a2b'));
      box3D(x - 0.7, x + 0.7, 0.4, 0.85, z + 0.18, z + 0.26, hex('#9a6b43'));
      break;
    }
    case 'shelter': {
      for (const dz of [-1.4, 1.4]) box3D(x - 0.35, x - 0.27, 0, 2.3, z + dz - 0.05, z + dz + 0.05, hex('#374151'));
      box3D(x - 0.5, x + 0.5, 2.3, 2.42, z - 1.5, z + 1.5, hex('#1f2937'));
      box3D(x - 0.35, x - 0.3, 0.6, 2.2, z - 1.4, z + 1.4, hex('#9fc7e6'));
      for (const dz of [-0.75, 0.75]) box3D(x - 0.25, x - 0.2, 0, 0.42, z + dz - 0.04, z + dz + 0.04, hex('#374151'));
      box3D(x - 0.3, x + 0.0, 0.42, 0.5, z - 0.95, z + 0.95, hex('#8a6a46'));   // the seat (the hitbox stops at its front edge)
      break;
    }
    case 'trashbags': {
      for (const [dx, dz, r] of [[0, 0, 0.36], [0.3, 0.1, 0.28], [-0.25, 0.15, 0.3]]) { const c = W3(x + dx, r, z + dz); ball(c[0], c[1], r * F / c[2], '#1f2937', '#4b5563', '#0f172a'); }
      break;
    }
    case 'vending': {
      box3D(x - 0.4, x + 0.4, 0, 1.8, z - 0.35, z + 0.35, hex('#c0392b'));
      box3D(x - 0.32, x + 0.32, 0.5, 1.5, z - 0.37, z - 0.34, hex('#fff1bf'));
      break;
    }
    case 'asign': {
      box3D(x - 0.3, x + 0.3, 0, 0.95, z - 0.05, z + 0.05, hex('#f4f1ea'));
      const q = W3(x, 0.6, z - 0.06); label('SALE', q[0], q[1], Math.round(0.16 * F / q[2]), '#c0392b');
      break;
    }
    case 'van': case 'taxi': {
      const dir = p.dirx || 1, L = p.prop === 'van' ? 4.6 : 4.4, a = x - dir * L, x0 = Math.min(x, a), x1 = Math.max(x, a), blink = p.driving && Math.floor(S.clock * 5) % 2 === 0;
      const body = p.prop === 'van' ? hex('#f4f6f8') : hex('#f2c200'), cab = p.prop === 'van' ? hex('#2f80ed') : hex('#2a3644');
      box3D(x0, x1, 0.2, 1.1, z - 0.7, z + 0.7, body);
      const cx0 = dir > 0 ? x - 1.5 : x, cx1 = dir > 0 ? x : x + 1.5;
      box3D(cx0, cx1, 1.1, 1.75, z - 0.6, z + 0.6, cab);
      if (p.prop === 'van') box3D(Math.min(x, a + dir * 1.6), Math.max(x, a + dir * 1.6), 1.1, 2.0, z - 0.68, z + 0.68, hex('#e5e7eb'));
      else box3D(x0 + L / 2 - 0.3, x0 + L / 2 + 0.3, 1.75, 1.95, z - 0.15, z + 0.15, hex('#f4f1ea'));
      const l = W3(x - dir * 0.1, 1.2, z - 0.72); ball(l[0], l[1], 0.12 * F / l[2], blink ? '#fff3b0' : '#b45309', '#ffffff', '#92400e');
      break;
    }
    case 'gatedesk': {
      box3D(x - 0.5, x + 0.5, 0, 1.05, z - 1.35, z + 1.35, hex('#4c6a8a'));
      box3D(x - 0.55, x + 0.55, 1.05, 1.12, z - 1.4, z + 1.4, hex('#e8edf4'));
      box3D(x - 0.2, x + 0.2, 1.12, 1.5, z - 0.5, z - 0.1, hex('#1f2937'));
      break;
    }
    case 'benchz': {
      box3D(x - 0.3, x + 0.3, 0.1, 0.28, z - 1.0, z + 1.0, hex('#4b5563'));
      box3D(x - 0.3, x + 0.3, 0.28, 0.46, z - 1.0, z + 1.0, hex('#2f5fa0'));
      box3D(x - 0.32, x - 0.2, 0.46, 0.95, z - 1.0, z + 1.0, hex('#2f5fa0'));
      break;
    }
    case 'chairs': {
      box3D(x - 1.0, x + 1.0, 0.1, 0.28, z - 0.3, z + 0.3, hex('#4b5563'));
      box3D(x - 1.0, x + 1.0, 0.28, 0.46, z - 0.3, z + 0.3, hex('#2f5fa0'));
      box3D(x - 1.0, x + 1.0, 0.46, 0.95, z + 0.18, z + 0.3, hex('#2f5fa0'));
      break;
    }
    case 'bin': {
      box3D(x - 0.27, x + 0.27, 0, 0.85, z - 0.27, z + 0.27, hex('#4b5563'));
      box3D(x - 0.3, x + 0.3, 0.85, 0.92, z - 0.3, z + 0.3, hex('#1f2937'));
      const q = W3(x, 0.5, z - 0.28); label('♻', q[0], q[1], Math.round(0.26 * F / q[2]), '#7ed957');
      break;
    }
    case 'plant': {
      box3D(x - 0.32, x + 0.32, 0, 0.5, z - 0.32, z + 0.32, hex('#9a6b43'));
      const c1 = W3(x, 1.0, z), c2 = W3(x + 0.25, 1.3, z + 0.1), c3 = W3(x - 0.25, 1.25, z - 0.1);
      ball(c1[0], c1[1], 0.5 * F / c1[2], '#3f7d3a', '#6fae5a', '#24502a');
      ball(c2[0], c2[1], 0.36 * F / c2[2], '#4a8c42', '#7fc068', '#2a5c2f');
      ball(c3[0], c3[1], 0.34 * F / c3[2], '#4a8c42', '#7fc068', '#2a5c2f');
      break;
    }
    case 'trolleys': {
      for (const dx of [-0.5, 0, 0.5]) {
        box3D(x + dx - 0.24, x + dx + 0.24, 0.1, 0.16, z - 0.3, z + 0.3, hex('#6b7280'));
        box3D(x + dx - 0.24, x + dx + 0.24, 0.16, 0.9, z - 0.3, z - 0.26, hex('#b8c0cc'));
        box3D(x + dx - 0.24, x + dx + 0.24, 0.85, 0.95, z - 0.3, z + 0.3, hex('#3b82f6'));
      }
      break;
    }
    case 'cart2': {
      const dir = p.dirx || 1, driving = p.driving && Math.floor(S.clock * 5) % 2 === 0;
      for (let i = 0; i < 3; i++) {
        const cx = x - dir * i * 1.25;
        if (i === 0) {
          box3D(cx - 0.55, cx + 0.55, 0.15, 0.75, z - 0.5, z + 0.5, hex('#f2994a'));
          box3D(cx - 0.3, cx + 0.3, 0.75, 1.3, z - 0.4, z + 0.4, hex('#e07a1f'));
          const l = W3(cx, 1.42, z); ball(l[0], l[1], 0.1 * F / l[2], driving ? '#fff3b0' : '#b45309', '#ffffff', '#92400e');
        } else {
          box3D(cx - 0.55, cx + 0.55, 0.15, 0.5, z - 0.5, z + 0.5, hex('#9aa3af'));
          box3D(cx - 0.4, cx + 0.4, 0.5, 0.95, z - 0.35, z + 0.35, hex(i === 1 ? '#c0392b' : '#2f80ed'));
        }
      }
      break;
    }
    case 'cpgate': {
      const h = p.span || 4, red = hex('#ff4d4f');
      box3D(x - h, x + h, 0, 0.03, z - 0.25, z + 0.25, red);
      box3D(x - h - 0.1, x - h + 0.1, 0, 3.3, z - 0.1, z + 0.1, red); box3D(x + h - 0.1, x + h + 0.1, 0, 3.3, z - 0.1, z + 0.1, red);
      box3D(x - h, x + h, 3.0, 3.3, z - 0.08, z + 0.08, red);
      { const q = W3(x, 3.15, z - 0.1); label('CHECKPOINT ' + (p.num || ''), q[0], q[1], Math.round(0.2 * F / q[2]), '#ffffff'); }
      break;
    }
    case 'rope': {
      const h = p.span || 1, sk = p.skin === 'fence' ? ['#ff8a1f', '#2b2a33', 0.1, 0.95, 0.06] : p.skin === 'crowdbar' ? ['#b8c0cc', '#4b5563', 0.08, 0.95, 0.05] : ['#d6336c', '#2b2a33', 0.82, 0.9, 0.03];
      const bar = hex(sk[0]), post = hex(sk[1]);
      if (p.skin === 'fence') { box3D(x - h, x + h, 0.1, 0.95, z - 0.05, z + 0.05, bar); box3D(x - h, x + h, 0.55, 0.7, z - 0.06, z + 0.06, hex('#f4f6f8')); }
      else if (p.skin === 'crowdbar') { box3D(x - h, x + h, 0.85, 0.93, z - 0.04, z + 0.04, bar); box3D(x - h, x + h, 0.45, 0.5, z - 0.04, z + 0.04, bar); }
      else box3D(x - h, x + h, sk[2], sk[3], z - sk[4], z + sk[4], bar);
      for (let px = -h; px <= h + 1e-6; px += Math.max(1.6, (2 * h) / Math.ceil((2 * h) / 2.2))) box3D(x + px - 0.05, x + px + 0.05, 0, 0.95, z - 0.05, z + 0.05, post);
      break;
    }
    case 'wetfloor': box3D(x - 0.25, x + 0.25, 0, 0.62, z - 0.12, z + 0.12, hex('#ffcf1f')); { const q = W3(x, 0.4, z - 0.13); label('WET', q[0], q[1], Math.round(0.14 * F / q[2]), INK); } break;
  }
}

// Little marks by the head, in the comic style of the bubbles: shock, a bead of sweat, an anger mark.
function drawEmote(kind, x, y, r) {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.2, r * 0.26);
  if (kind === 'shock') {
    ctx.fillStyle = '#ffcf1f'; ctx.beginPath(); ctx.moveTo(x - r * 0.3, y - r * 1.2); ctx.lineTo(x + r * 0.3, y - r * 1.2); ctx.lineTo(x + r * 0.14, y + r * 0.35); ctx.lineTo(x - r * 0.14, y + r * 0.35); ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y + r * 0.95, r * 0.26, 0, TAU); ctx.stroke(); ctx.fill();
  } else if (kind === 'sweat') {
    ctx.fillStyle = '#7cc4ff'; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + r * 0.75, y + r * 0.1, x, y + r * 0.6); ctx.quadraticCurveTo(x - r * 0.75, y + r * 0.1, x, y - r); ctx.closePath(); ctx.stroke(); ctx.fill();
  } else {
    ctx.strokeStyle = '#ff2d3a'; ctx.lineWidth = Math.max(1.4, r * 0.3); ctx.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.moveTo(x + sx * r * 0.28, y + sy * r); ctx.quadraticCurveTo(x + sx * r * 0.24, y + sy * r * 0.24, x + sx * r, y + sy * r * 0.28); }
    ctx.stroke();
  }
}

const hexA = (h, a) => { const c = hex(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };

export function drawPerson(p) {
  const dz = p.z - VZ;
  if (dz < 0.6 || dz > DRAW_FAR) return;
  const s = F / dz, k = p.h / 1.75, U = s * k;
  const bx = CX + (p.x - VX) * s;
  if (bx < -s * 3 || bx > W + s * 3) return;
  const fy = HOR + VY * s;
  // fog in the distance; fade people right in front of the camera so they never block your character
  // racers beside and behind you go see-through: they can't touch you, and they must never block your view
  const racerFade = p.racer && !p.podium ? clamp(0.3 + (p.z - S.pz + 1) * 0.35, 0.3, 1) * (p.isGhost ? 0.5 : 1) : 1;
  const ghost = (p.isMe ? S.ghostT : p.ghostT) > 0 ? 0.5 + 0.25 * Math.sin(S.clock * 30) : 1;   // race mode: blink during the rare safety slip-through
  ctx.globalAlpha = Math.min(fogA(dz), p.isMe ? 1 : clamp((dz - 0.6) / 1.6, 0.22, 1), clamp((DRAW_FAR - dz) / 8, 0, 1), p.fadeT === undefined ? 1 : p.fadeT / 0.9) * ghost * racerFade;
  if (p.prop !== 'spill') {
    ctx.fillStyle = LV.night ? 'rgba(0,0,0,0.35)' : 'rgba(15,27,45,0.18)';
    ctx.beginPath(); ctx.ellipse(bx, fy, 0.34 * s, 0.34 * s * Math.min(0.6, VY / dz), 0, 0, TAU); ctx.fill();
  }
  if (!p.prop && dz < 45 && variantOf() === 'golden') {   // golden hour: the sun is at the far end of the avenue, so shadows fall long toward you
    const zt = Math.max(p.z - (p.h || 1.75) * 1.2, VZ + 1.2);
    if (p.z - zt > 0.3) { const a = W3(p.x - 0.17, 0, p.z), b = W3(p.x + 0.17, 0, p.z), c = W3(p.x + 0.1, 0, zt), d = W3(p.x - 0.1, 0, zt); ctx.fillStyle = p.isMe ? 'rgba(60,30,30,0.12)' : 'rgba(60,30,30,0.22)'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill(); }
  }
  if (p.isMe) {
    multGlow(bx, fy, s, Math.min(0.6, VY / dz));
    ctx.strokeStyle = 'rgba(255,207,31,0.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(bx, fy, 0.42 * s, 0.42 * s * Math.min(0.6, VY / dz), 0, 0, TAU); ctx.stroke();
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (p.racer && !p.done && !p.isGhost && !p.podium && p.z > S.pz + 1.2 && Math.hypot(p.vx, p.vz) > 1.8 && !calm) {   // only for racers ahead of you, and never reaching back under your feet: a ribbon on the floor in the racer's colour, narrowing as it fades, so you can follow who is who
    const near = Math.max(VZ + 1.3, S.pz + 0.8), z0 = Math.max(p.z - 0.25, near), z1 = Math.max(p.z - (p.burstT > 0 ? 4.2 : 3), near);
    if (z0 - z1 > 0.3) {
      const a = W3(p.x - 0.17, 0.01, z0), b = W3(p.x + 0.17, 0.01, z0), c = W3(p.x + 0.04, 0.01, z1), d = W3(p.x - 0.04, 0.01, z1);
      const g = ctx.createLinearGradient(0, a[1], 0, c[1]); g.addColorStop(0, hexA(p.color, 0.6)); g.addColorStop(1, hexA(p.color, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill();
    }
  }
  let hd = {};
  if (p.prop) drawProp(p, s, bx, fy);
  else hd = U * 1.75 < 34 ? drawFar(p, bx, fy, U) : drawNear(p, s);
  const hx = hd.hx !== undefined ? hd.hx : bx, hy = hd.hy !== undefined ? hd.hy : fy - 1.63 * U;
  if (p.racer && !p.podium && p.z > S.pz - 0.5) {   // a coloured arrow and name so the racers stand out from the crowd
    const ay = hy - 0.42 * U, aw = clamp(0.16 * U, 5, 11);
    ctx.fillStyle = p.color; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, 0.03 * U); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(hx, ay); ctx.lineTo(hx - aw, ay - aw * 1.3); ctx.lineTo(hx + aw, ay - aw * 1.3); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (U > 40) { ctx.font = '700 ' + clamp(Math.round(0.2 * U), 11, 16) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.lineWidth = 3; ctx.strokeText(p.name, hx, ay - aw * 1.5); ctx.fillStyle = '#ffffff'; ctx.fillText(p.name, hx, ay - aw * 1.5); }
  }
  if (p.isMe && S.live && S.energy !== undefined) {   // a small stamina bar floating above your head
    const e = clamp(S.energy / 100, 0, 1), bw = clamp(0.85 * U, 34, 110), bh = clamp(0.13 * U, 7, 16), by = fy + Math.max(3, 0.06 * U);   // under the feet
    const col = S.energy < 10 ? '#ff4d4f' : S.energy < 40 ? '#ffb02e' : '#2ec4b6';   // green: no penalty, amber: a little, red: you are out
    ctx.save(); ctx.globalAlpha = e > 0.995 ? 0.55 : 1;
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(hx - bw / 2, by, bw, bh);
    ctx.fillStyle = col; ctx.fillRect(hx - bw / 2, by, bw * e, bh);
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, 0.02 * U); ctx.strokeRect(hx - bw / 2, by, bw, bh);
    // the notch: below this line you start losing speed
    const nx = hx - bw / 2 + bw * 0.4;
    ctx.beginPath(); ctx.moveTo(nx, by - 1.5); ctx.lineTo(nx, by + bh + 1.5); ctx.stroke();
    // "Excuse me" recharge: a thinner pink bar just above the stamina bar. Full and solid means ready.
    const sr = clamp(1 - S.shoutCD / 5.5, 0, 1), sh2 = Math.max(9, bh * 1.05), sy = by + bh + Math.max(2, 0.03 * U);
    ctx.globalAlpha = sr >= 1 ? 1 : 0.8;
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(hx - bw / 2, sy, bw, sh2);
    ctx.fillStyle = sr >= 1 ? '#ff6b9d' : '#f3a6c0'; ctx.fillRect(hx - bw / 2, sy, bw * sr, sh2);
    ctx.strokeRect(hx - bw / 2, sy, bw, sh2);
    ctx.globalAlpha = sr >= 1 ? 1 : 0.75;   // the name of the move, written on the bar
    let fs2 = Math.max(7, sh2 * 0.82); ctx.font = '700 ' + fs2 + 'px ' + FONT;
    const tw = ctx.measureText('EXCUSE ME').width; if (tw > bw - 4) { fs2 *= (bw - 4) / tw; ctx.font = '700 ' + fs2 + 'px ' + FONT; }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText('EXCUSE ME', hx, sy + sh2 / 2 + fs2 * 0.04);
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
    if (p.react.up && !p.rival) {   // startled: little burst lines at the corners of the bubble
      ctx.strokeStyle = '#ff9f43'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
      ctx.moveTo(bxx - 3, by + 2); ctx.lineTo(bxx - 9, by - 3); ctx.moveTo(bxx - 4, by + bh / 2); ctx.lineTo(bxx - 11, by + bh / 2);
      ctx.moveTo(bxx + bw + 3, by + 2); ctx.lineTo(bxx + bw + 9, by - 3); ctx.moveTo(bxx + bw + 4, by + bh / 2); ctx.lineTo(bxx + bw + 11, by + bh / 2); ctx.stroke();
    }
    ctx.fillStyle = p.rival ? '#ffffff' : INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.react.text, bxx + bw / 2, by + bh / 2 + 1);
    if (U > 40) drawEmote(p.rival ? 'anger' : p.react.up ? 'shock' : 'sweat', hx + 0.2 * U, hy - 0.16 * U, clamp(0.09 * U, 5, 11));
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
