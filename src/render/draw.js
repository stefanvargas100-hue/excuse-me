import { goalOf } from '../sim/state.js';
import { scl } from '../config/colour.js';
import { FOGCSS, LV, mixc } from '../config/levels.js';
import { TAU } from '../config/util.js';
import { ctx } from '../dom.js';
import { CX, F, H, HOR, VX, VY, VZ, W } from './camera.js';
import { figStyle, sceneInk, skyTop, styleSky } from './style.js';



/* ---------- world rendering ---------- */
export const P = (x, y, d) => [CX + (x - VX) * F / d, HOR + (VY - y) * F / d];

// Styles that ink their scenery outline upright surfaces near the camera; floors (flat) stay clean.
function inkEdge(d) {
  const ink = sceneInk();
  if (!ink || d > ink.far) return;
  ctx.strokeStyle = ink.col; ctx.lineWidth = ink.w * Math.max(0.4, 1 - d / ink.far); ctx.lineJoin = 'round'; ctx.stroke();
}

export function poly(pts, color, flat) {
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const q = P(pts[i][0], pts[i][1], pts[i][2]);
    if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]);
  }
  ctx.closePath(); ctx.fill();
  if (!flat) inkEdge(pts[0][2]);
}

export const fq = (x0, x1, y, a, b, col) => poly([[x0, y, a], [x1, y, a], [x1, y, b], [x0, y, b]], col, true);
     // floor or ceiling strip
export const wq = (x, y0, y1, a, b, col) => poly([[x, y0, a], [x, y1, a], [x, y1, b], [x, y0, b]], col);
     // side wall strip
export const cq = (x0, x1, y0, y1, d, col) => poly([[x0, y0, d], [x1, y0, d], [x1, y1, d], [x0, y1, d]], col);
 // faces the camera
export const sub = (z0, z1) => [Math.max(z0 - VZ, 0.2), z1 - VZ];

export const FONT = "'Patrick Hand','Comic Sans MS',cursive,sans-serif";

export function label(str, x, y, px, color) {
  if (px < 8) return;
  ctx.font = '700 ' + px + 'px ' + FONT; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

export function forSegs(seg, far, cb) {
  const kMax = Math.min(Math.floor(goalOf() / seg) - 1, Math.ceil((VZ + far) / seg));
  const kMin = Math.floor(VZ / seg);
  for (let k = kMax; k >= kMin; k--) {
    const za = k * seg, zb = za + seg, da = Math.max(za - VZ, 0.2), db = zb - VZ;
    if (db <= 0.2) continue;
    cb(k, za, zb, da, db);
  }
}

export function sky(top) {
  const g = ctx.createLinearGradient(0, HOR - H * 0.45, 0, HOR);
  g.addColorStop(0, skyTop(top)); g.addColorStop(1, FOGCSS);
  ctx.fillStyle = g; ctx.fillRect(-W, -H, 3 * W, HOR + H);
  styleSky();
}

export function ball(x, y, r, base, light, dark) {
  const sh = figStyle().shade;
  if (sh === 'flat') ctx.fillStyle = base;
  else {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    if (sh === 'cel') { g.addColorStop(0, base); g.addColorStop(0.66, base); g.addColorStop(0.67, dark); g.addColorStop(1, dark); }   // two hard tones
    else { g.addColorStop(0, light); g.addColorStop(0.55, base); g.addColorStop(1, dark); }
    ctx.fillStyle = g;
  }
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

// World point -> screen [x, y, depth]
export function W3(x, y, z) {
  const d = Math.max(0.12, z - VZ), sc = F / d;
  return [CX + (x - VX) * sc, HOR + (VY - y) * sc, d];
}

export function box3D(x0, x1, y0, y1, z0, z1, c) {
  if (z1 - VZ < 0.3) return;
  const zn = Math.max(z0, VZ + 0.3), d = zn - VZ;
  const q = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); pts.forEach((p, i) => { const s = W3(p[0], p[1], p[2]); if (i) ctx.lineTo(s[0], s[1]); else ctx.moveTo(s[0], s[1]); }); ctx.closePath(); ctx.fill(); inkEdge(d); };
  if (VX < x0) q([[x0, y0, zn], [x0, y1, zn], [x0, y1, z1], [x0, y0, z1]], mixc(scl(c, 0.72), d));
  else if (VX > x1) q([[x1, y0, zn], [x1, y1, zn], [x1, y1, z1], [x1, y0, z1]], mixc(scl(c, 0.72), d));
  if (VY > y1) q([[x0, y1, zn], [x1, y1, zn], [x1, y1, z1], [x0, y1, z1]], mixc(scl(c, 1.15), d));
  if (z0 > VZ + 0.3) q([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], mixc(c, d));
}
