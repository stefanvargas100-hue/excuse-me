import { TAU } from '../config/util.js';
import { ctx } from '../dom.js';
import { CX, F, HOR, VX, VY, VZ, W } from './camera.js';
import { P, poly, wq } from './draw.js';



/* ---------- shared tools for the decorative scenery passes (nycdetail.js, airportdetail.js, shibuyadetail.js) ----------
   Scenery is decoration only: it reads the camera and the clock, draws nothing the player can walk into, and never touches the
   simulation or its random numbers (so crowds, collisions and daily seeds are exactly as without it). */

// a stable "random" number from two integers, so a building or a ceiling bay looks the same every time you pass it, whatever pace you take
export const hsh = (a, b = 0) => { let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const rgba = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')';

// one translucent wall strip
export function wqA(x, y0, y1, a, b, col, al) { ctx.globalAlpha = al; wq(x, y0, y1, a, b, col); ctx.globalAlpha = 1; }

// text painted on a wall: it follows the wall's slant instead of sitting flat on the screen. side +1 = the wall on the right, -1 = on the left.
export function wallText(str, x, yc, zc, hm, color, side) {
  const d = zc - VZ;
  if (d < 3 || hm * F / d < 7) return;
  const a = P(x, yc, d - 0.5), b = P(x, yc, d + 0.5), c = P(x, yc, d);
  const ux = side > 0 ? a[0] - b[0] : b[0] - a[0], uy = side > 0 ? a[1] - b[1] : b[1] - a[1];   // one metre along the way you read it
  ctx.save();
  ctx.translate(c[0], c[1]); ctx.transform(ux * 0.01, uy * 0.01, 0, (F / d) * 0.01, 0, 0);
  ctx.font = '700 ' + (hm * 100) + "px 'Patrick Hand','Comic Sans MS',cursive,sans-serif";
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(str, 0, 0);
  ctx.restore();
}

// Batching: shapes of one colour are added to one path and filled once, which is far cheaper than a fill each.
export function padd(pts) { for (let i = 0; i < pts.length; i++) { const q = P(pts[i][0], pts[i][1], pts[i][2]); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); } ctx.closePath(); }
// (the quad versions work out the screen points inline: no arrays, so no garbage for the collector to pause on)
function pt(first, x, y, d) { const px = CX + (x - VX) * F / d, py = HOR + (VY - y) * F / d; if (first) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
export function pwq(x, y0, y1, a, b) { pt(true, x, y0, a); pt(false, x, y1, a); pt(false, x, y1, b); pt(false, x, y0, b); ctx.closePath(); }
export function pfq(x0, x1, y, a, b) { pt(true, x0, y, a); pt(false, x1, y, a); pt(false, x1, y, b); pt(false, x0, y, b); ctx.closePath(); }
export function pfill(col, al) { ctx.fillStyle = col; if (al < 1) ctx.globalAlpha = al; ctx.fill(); ctx.globalAlpha = 1; }
// the world height that sits at the top edge of the screen at depth d: nothing above it needs drawing
export const topOf = d => VY + (HOR + 30) * d / F;

// The nearest depth at which a wall at lateral position x can still be on screen. Anything nearer is off to the side, and drawing it
// (a translucent shape stretched across thousands of pixels) is the one thing that makes scenery expensive, so wall details start here.
export const wallMin = x => Math.max(0.2, Math.abs(x - VX) * F / (W / 2 + 30));
// sub() for a span of wall at x: [near, far] depth with the near end held back to wallMin(x); [near, 0] when none of it can be on screen
export function subWall(x, z0, z1) { const a = Math.max(z0 - VZ, 0.2), b = z1 - VZ, m = wallMin(x); return b <= m + 0.05 ? [a, 0] : [Math.max(a, m), b]; }
// the same for the floor (it leaves the bottom of the screen) -- a fixed, safe depth
export const FLOOR_MIN = 1.4;

// a flat disc on the ground
export function disc(x, z, r, col, n = 10) {
  const pts = []; for (let i = 0; i < n; i++) { const t = i / n * TAU; pts.push([x + Math.cos(t) * r, 0.006, Math.max(0.2, z + Math.sin(t) * r - VZ)]); }
  poly(pts, col);
}

// Detail level: 1 draws everything; if a scenery pass ever takes too long on a slow phone, the reach of its fine detail shrinks
// (down to about half) until it is cheap again, and grows back when there is time to spare. Each map keeps its own.
export function makeLod(hi = 2.6, lo = 1.6) {
  let lod = 1, spent = 0, avg = 1, t0 = 0;
  return {
    R: n => n * lod,
    begin() { t0 = performance.now(); },
    end() { spent += performance.now() - t0; },
    frame() { avg = avg * 0.92 + spent * 0.08; spent = 0; if (avg > hi) lod = Math.max(0.5, lod - 0.02); else if (avg < lo) lod = Math.min(1, lod + 0.01); }
  };
}
