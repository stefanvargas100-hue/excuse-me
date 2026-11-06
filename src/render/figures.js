import { INK, hex, shade } from '../config/colour.js';
import { DRAW_FAR, LV, fogA } from '../config/levels.js';
import { TAU, clamp, sgn } from '../config/util.js';
import { ctx } from '../dom.js';
import { CX, F, HOR, VX, VY, VZ, W } from './camera.js';
import { FONT, W3, ball, box3D, label } from './draw.js';
import { S, showHB } from '../sim/state.js';



/* ---------- people rendering: a projected 3D skeleton with shaded, rounded limbs ---------- */
function capsule(pts, w, base, dark, light) {
  const run = (ox, oy) => {
    ctx.beginPath(); ctx.moveTo(pts[0][0] + ox, pts[0][1] + oy);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] + ox, pts[i][1] + oy);
    ctx.stroke();
  };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
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

function drawNear(p, s) {
  const k = p.h / 1.75, fx = p.fx, fz = p.fz, rx = fz, rz = -fx;
  const sp = Math.hypot(p.vx, p.vz), wa = p.walkA === undefined ? (sp > 0.15 ? 1 : 0) : p.walkA, walk = wa * Math.min(1, 0.55 + sp * 0.15);
  const ph = p.phase;
  const legs = [];
  let minA = 9;
  for (const side of [-1, 1]) {
    const lp = ph + (side > 0 ? Math.PI : 0);
    const a = Math.sin(lp) * 0.42 * walk;
    const bend = 0.06 + (0.1 + 0.6 * Math.max(0, Math.cos(lp))) * walk;
    const knee = [side * 0.1, Math.sin(a) * 0.45, 0.93 - Math.cos(a) * 0.45];
    const sa = a - bend;
    const ankle = [side * 0.1, knee[1] + Math.sin(sa) * 0.44, knee[2] - Math.cos(sa) * 0.44];
    minA = Math.min(minA, ankle[2]);
    legs.push({ side, knee, ankle });
  }
  const drop = minA - 0.08;   // planted foot stays on the floor, so the body bobs naturally
  const L = (lx, ly, u) => W3(p.x + (rx * lx + fx * ly) * k, (u - drop) * k, p.z + (rz * lx + fz * ly) * k);
  const sk = s * k;
  const vxv = p.x - VX, vzv = Math.max(0.2, p.z - VZ), vl = Math.hypot(vxv, vzv);
  const across = Math.abs(rx * (vzv / vl) - rz * (vxv / vl));   // 1 = shoulders face the camera, 0 = side-on
  const facing = fx * (vxv / vl) + fz * (vzv / vl);            // >0 walking away from the camera
  const sideDir = sgn(fx * (vzv / vl) - fz * (vxv / vl));
  const items = [];
  for (const g of legs) {
    const hip = L(g.side * 0.1, 0, 0.93), kn = L(g.knee[0], g.knee[1], g.knee[2]), an = L(g.ankle[0], g.ankle[1], g.ankle[2]);
    const toe = L(g.ankle[0], g.ankle[1] + 0.13, g.ankle[2] - 0.03);
    items.push({ d: hip[2], f: () => {
      capsule([hip, kn, an], 0.13 * sk, p.pants, p.pantsD, p.pantsL);
      capsule([an, toe], 0.1 * sk, p.shoe, p.shoeD, p.shoeL);
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
    let c = Math.sin(ap) * (p.fast ? 0.55 : 0.32) * walk, bend = p.fast ? 1.35 : 0.2 + 0.2 * walk, hx = 0.22;
    if (p.react && p.react.up && p.react.t > 0 && p.react.t < 0.9) { c = 2.45; bend = 0.55; hx = 0.36; }   // hands up
    if (p.dance) { c = 1.7 + Math.sin(ph * 1.3 + side * 1.7) * 1.0; bend = 0.9; hx = 0.38; }
    if (p.phone && side > 0) { c = 0.35; bend = 1.7; hx = 0.1; }
    const el = [side * 0.23, Math.sin(c) * 0.28, 1.42 - Math.cos(c) * 0.28];
    const fa = c + bend;
    const hd = [side * hx, el[1] + Math.sin(fa) * 0.26, el[2] - Math.cos(fa) * 0.26];
    const shp = L(side * 0.19, 0, 1.42), elp = L(el[0], el[1], el[2]), hdp = L(hd[0], hd[1], hd[2]);
    const holds = side === lugSide;
    items.push({ d: shp[2] + 0.001, f: () => {
      let e2 = elp, h2 = hdp;
      if (holds && handle) { h2 = handle; e2 = [(shp[0] + handle[0]) / 2 + (handle[0] - shp[0]) * 0.1, (shp[1] + handle[1]) / 2, 0]; }
      capsule([shp, e2], 0.095 * sk, p.shirt, p.shirtD, p.shirtL);
      capsule([e2, h2], 0.075 * sk, p.skin, p.skinD, null);
      ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(h2[0], h2[1], 0.045 * sk, 0, TAU); ctx.fill();
      if (p.phone && side > 0) {
        ctx.fillStyle = '#111827'; ctx.fillRect(h2[0] - 0.04 * sk, h2[1] - 0.09 * sk, 0.08 * sk, 0.13 * sk);
        ctx.fillStyle = '#8ecbff'; ctx.fillRect(h2[0] - 0.03 * sk, h2[1] - 0.08 * sk, 0.06 * sk, 0.1 * sk);
      }
    } });
  }
  const chest = L(0, 0, 1.38), waist = L(0, 0, 0.98), neck = L(0, 0, 1.48), pelvis = L(0, 0, 0.86);
  const wM = 0.2 + 0.18 * across;
  items.push({ d: chest[2], f: () => {
    const sC = F / chest[2] * k, hwC = wM / 2 * sC, hwW = hwC * 0.78;
    const g = ctx.createLinearGradient(chest[0] - hwC, 0, chest[0] + hwC, 0);
    g.addColorStop(0, p.shirtL); g.addColorStop(0.5, p.shirt); g.addColorStop(1, p.shirtD);
    ctx.fillStyle = p.pants; ctx.strokeStyle = p.pants; ctx.lineWidth = hwC * 0.3; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(waist[0] - hwW, waist[1]); ctx.lineTo(waist[0] + hwW, waist[1]);
    ctx.lineTo(pelvis[0] + hwW * 0.95, pelvis[1]); ctx.lineTo(pelvis[0] - hwW * 0.95, pelvis[1]); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = g; ctx.strokeStyle = g; ctx.lineWidth = hwC * 0.4;
    ctx.beginPath(); ctx.moveTo(neck[0] - hwC * 0.85, neck[1]); ctx.lineTo(neck[0] + hwC * 0.85, neck[1]);
    ctx.lineTo(chest[0] + hwC, chest[1]); ctx.lineTo(waist[0] + hwW, waist[1]); ctx.lineTo(waist[0] - hwW, waist[1]);
    ctx.lineTo(chest[0] - hwC, chest[1]); ctx.closePath(); ctx.fill(); ctx.stroke();
  } });
  if (p.pack === 'pack' || p.pack === 'jet') {
    const bc = L(0, -0.19, 1.2), jet = p.pack === 'jet';
    items.push({ d: bc[2], f: () => {
      const sc = F / bc[2] * k, w = (0.16 + 0.16 * across) * sc, h = 0.42 * sc;
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
      ctx.fillStyle = jet ? '#374151' : p.gearD;
      if (jet) { for (const fx2 of [-0.25, 0.25]) { rrect(bc[0] + fx2 * w - w * 0.13, bc[1] + h * 0.36, w * 0.26, h * 0.2, 2); ctx.fill(); } ctx.fillStyle = '#ff2d3a'; rrect(bc[0] - w * 0.2, bc[1] - h * 0.3, w * 0.4, h * 0.12, 2); ctx.fill(); }
      else { rrect(bc[0] - w * 0.36, bc[1] + h * 0.04, w * 0.72, h * 0.32, Math.min(w, h) * 0.12); ctx.fill(); }
    } });
  }
  const pitch = p.phone ? 0.06 : 0;
  const head = L(0, 0.02 + pitch, 1.63 - pitch * 0.6), neckTop = L(0, 0, 1.54), brimP = L(0, 0.22 + pitch, 1.69 - pitch * 0.6);
  const out = {};
  items.push({ d: head[2] - 0.002, f: () => {
    const r = 0.115 * F / head[2] * k, hx = head[0], hy = head[1];
    const longHair = p.hairStyle === 'long' && !p.bald;
    const brim = () => {
      ctx.fillStyle = p.gearD; ctx.beginPath();
      ctx.ellipse((hx + brimP[0]) / 2, (hy - r * 0.2 + brimP[1]) / 2, r * 0.9 + Math.abs(brimP[0] - hx) * 0.5, r * 0.24, 0, 0, TAU); ctx.fill();
    };
    capsule([neck, neckTop], 0.08 * sk, p.skin, p.skinD, null);
    if (longHair && facing <= 0.35) { ctx.fillStyle = p.hair; ctx.beginPath(); ctx.ellipse(hx - (facing > -0.35 ? sideDir * r * 0.25 : 0), hy + r * 0.55, r * 1.05, r * 1.15, 0, 0, TAU); ctx.fill(); }
    if (p.hat === 'cap' && facing > 0.35) brim();
    ball(hx, hy, r, p.skin, p.skinL, p.skinD);
    ctx.fillStyle = p.hair;
    if (facing > 0.35) {
      if (!p.bald) {
        ctx.beginPath(); ctx.arc(hx, hy - r * 0.05, r * 1.01, 0, TAU); ctx.fill();
        if (longHair) { ctx.beginPath(); ctx.ellipse(hx, hy + r * 0.65, r * 0.98, r * 1.1, 0, 0, TAU); ctx.fill(); }
      }
    } else if (facing < -0.35) {
      if (!p.bald) { ctx.beginPath(); ctx.arc(hx, hy - r * 0.12, r * 1.0, Math.PI, TAU); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = '#16191f';
      const er = Math.max(0.9, r * 0.11);
      if (p.face === 'shades') { rrect(hx - r * 0.66, hy - r * 0.06, r * 1.32, r * 0.3, r * 0.12); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(hx - r * 0.5, hy - r * 0.01, r * 0.18, r * 0.06); ctx.fillRect(hx + r * 0.18, hy - r * 0.01, r * 0.18, r * 0.06); }
      else { ctx.beginPath(); ctx.arc(hx - r * 0.36, hy + r * 0.08, er, 0, TAU); ctx.arc(hx + r * 0.36, hy + r * 0.08, er, 0, TAU); ctx.fill(); }
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
      ctx.fillStyle = '#16191f';
      if (p.face === 'shades') { rrect(hx + sideDir * r * 0.3 - r * 0.3, hy - r * 0.05, r * 0.66, r * 0.26, r * 0.1); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(hx + sideDir * r * 0.55, hy + r * 0.05, Math.max(0.9, r * 0.11), 0, TAU); ctx.fill(); }
      ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(hx + sideDir * r * 0.97, hy + r * 0.22, r * 0.17, 0, TAU); ctx.fill();
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
  const ghost = (p.isMe ? S.ghostT : p.ghostT) > 0 ? 0.5 + 0.25 * Math.sin(S.clock * 30) : 1;   // race mode: blink while you can pass through people
  ctx.globalAlpha = Math.min(fogA(dz), p.isMe ? 1 : clamp((dz - 0.6) / 1.6, 0.22, 1), clamp((DRAW_FAR - dz) / 8, 0, 1), p.fadeT === undefined ? 1 : p.fadeT / 0.9) * ghost;
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
  if (p.racer) {   // a coloured arrow and name so the racers stand out from the crowd
    const ay = hy - 0.42 * U, aw = Math.max(5, 0.16 * U);
    ctx.fillStyle = p.color; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, 0.03 * U); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(hx, ay); ctx.lineTo(hx - aw, ay - aw * 1.3); ctx.lineTo(hx + aw, ay - aw * 1.3); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (U > 40) { ctx.font = '700 ' + clamp(Math.round(0.2 * U), 11, 16) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.lineWidth = 3; ctx.strokeText(p.name, hx, ay - aw * 1.5); ctx.fillStyle = '#ffffff'; ctx.fillText(p.name, hx, ay - aw * 1.5); }
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
