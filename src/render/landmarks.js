/* ---------- landmark moments: one set-piece per map, always at the same spot ----------
   Fifth Avenue: a Gothic cathedral on the right, twin spires over the street. Shibuya: the big screens flash GO when the lights change,
   and the Hachiko statue waits at the exit. Terminal B: a jet taxis past the windows, coming the other way.
   Decoration only, like the rest of the scenery: it reads the camera, the clock and the run's state, and never touches the simulation. */
import { hex, scl } from '../config/colour.js';
import { LV, mixc } from '../config/levels.js';
import { TAU, clamp } from '../config/util.js';
import { ctx } from '../dom.js';
import { F, VZ } from './camera.js';
import { P, box3D, fq, label, poly, sub, wq } from './draw.js';
import { wallText } from './scenery.js';
import { S, calm } from '../sim/state.js';

/* ---------- Fifth Avenue: the cathedral, between the 270 m and 360 m crossings ---------- */
export const CATH = { z0: 300, z1: 330, towers: [[300, 309], [321, 330]] };
export const cathedralAt = z => z >= CATH.z0 && z < CATH.z1;
const STONE = hex('#e4ddcf'), STONE_D = hex('#c9c0ae'), GLASS = hex('#26335e'), BRONZE = hex('#6e5a37'), SLATE = hex('#5d6672');

// a pointed (Gothic) arch on the right-hand wall, as a polygon: from y0 up to the spring at y1, then to the point at y2
function arch(X, y0, y1, y2, z0, z1, col) {
  const zm = (z0 + z1) / 2, pts = [[X, y0, z0], [X, y1, z0]];
  for (let i = 1; i < 6; i++) { const a = i / 6 * Math.PI / 2; pts.push([X, y1 + (y2 - y1) * Math.sin(a), z0 + (zm - z0) * (1 - Math.cos(a))]); }
  pts.push([X, y2, zm]);
  for (let i = 5; i > 0; i--) { const a = i / 6 * Math.PI / 2; pts.push([X, y1 + (y2 - y1) * Math.sin(a), z1 - (z1 - zm) * (1 - Math.cos(a))]); }
  pts.push([X, y1, z1], [X, y0, z1]);
  if (pts.some(p => p[2] - VZ < 0.6)) return;
  poly(pts.map(p => [p[0], p[1], p[2] - VZ]), col);
}

function tower(X, tz0, tz1) {
  const d = Math.max(0.3, tz0 - VZ), top = 62, mid = (tz0 + tz1) / 2;
  box3D(X, X + 8, 0, top, tz0, tz1, STONE);
  // lancet windows up the tower face that looks onto the avenue, and a band at each stage
  for (const [y0, y1] of [[13, 23], [30, 44], [50, 58]]) for (const o of [-1.6, 1.6]) arch(X - 0.01, y0, y1 - 1.2, y1, mid + o - 0.7, mid + o + 0.7, mixc(GLASS, d));
  for (const y of [11, 28, 48, 60]) wq(X - 0.02, y, y + 0.6, ...sub(tz0, tz1), mixc(STONE_D, d));
  arch(X - 0.01, 0, 4.5, 6.2, mid - 1.3, mid + 1.3, mixc(BRONZE, d));                     // a side door
  // the spire: a tall pyramid, with a pinnacle at each corner
  const apex = [X + 4, 100, mid];
  if (tz0 - VZ > 0.6) {
    poly([[X, top, tz0 - VZ], [X + 8, top, tz0 - VZ], [apex[0], apex[1], apex[2] - VZ]], mixc(STONE, d));
    poly([[X, top, tz0 - VZ], [X, top, tz1 - VZ], [apex[0], apex[1], apex[2] - VZ]], mixc(scl(STONE, 0.86), d));
    for (const [px, pz] of [[X, tz0], [X + 8, tz0], [X, tz1]]) poly([[px - 0.5, top, pz - VZ], [px + 0.5, top, pz - VZ], [px, top + 7, pz - VZ]], mixc(STONE_D, d));
    const c = P(apex[0], apex[1] + 1.2, apex[2] - VZ); ctx.strokeStyle = mixc(STONE_D, d); ctx.lineWidth = Math.max(1, 0.25 * F / d);
    ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(c[0], c[1] - 2.5 * F / d); ctx.moveTo(c[0] - 0.9 * F / d, c[1] - 1.6 * F / d); ctx.lineTo(c[0] + 0.9 * F / d, c[1] - 1.6 * F / d); ctx.stroke();   // the cross
  }
}

// once per 3 m segment of the cathedral, far to near (called from nycdetail.js instead of an ordinary building front)
export function cathedralSeg(za, zb) {
  const X = LV.half, [a, b] = sub(za, zb);
  if (b <= 0.2) return;
  // steps up to the doors, painted on the sidewalk edge
  for (let i = 0; i < 3; i++) fq(X - 0.9 + i * 0.3, X - 0.6 + i * 0.3, 0.004 + i * 0.004, a, b, mixc(scl(STONE, 1 - i * 0.05), a));
  const tw = CATH.towers.find(t => za >= t[0] && za < t[1]);
  if (tw) { if (za === tw[0]) tower(X, tw[0], tw[1]); return; }
  // the front between the towers: wall, a gable, the rose window, the great door
  wq(X, 0, 30, a, b, mixc(STONE, a));
  if (za === 309) {
    const d = Math.max(0.6, 309 - VZ), zc = 315;
    if (309 - VZ > 0.6) {
      poly([[X, 30, 309 - VZ], [X, 42, zc - VZ], [X, 30, 321 - VZ]], mixc(STONE, d));                 // the gable
      poly([[X + 0.02, 30.3, 309.4 - VZ], [X + 0.02, 41.4, zc - VZ], [X + 0.02, 30.3, 320.6 - VZ], [X + 6, 36, zc - VZ]], mixc(SLATE, d));   // roof ridge going back
      // rose window: a ring of glass with petals
      const ring = []; for (let i = 0; i < 20; i++) { const t = i / 20 * TAU; ring.push([X - 0.01, 21 + Math.sin(t) * 3.4, zc + Math.cos(t) * 3.4 - VZ]); }
      poly(ring, mixc(STONE_D, d));
      const glass = []; for (let i = 0; i < 20; i++) { const t = i / 20 * TAU; glass.push([X - 0.02, 21 + Math.sin(t) * 2.9, zc + Math.cos(t) * 2.9 - VZ]); }
      poly(glass, mixc(GLASS, d));
      const cols = ['#c0392b', '#2f80ed', '#f2c94c'];
      for (let i = 0; i < 8; i++) {
        const t = i / 8 * TAU, t2 = t + TAU / 16;
        poly([[X - 0.03, 21, zc - VZ], [X - 0.03, 21 + Math.sin(t) * 2.7, zc + Math.cos(t) * 2.7 - VZ], [X - 0.03, 21 + Math.sin(t2) * 2.2, zc + Math.cos(t2) * 2.2 - VZ]], mixc(hex(cols[i % 3]), d));
      }
      arch(X - 0.01, 0, 8, 12.5, 311.5, 318.5, mixc(STONE_D, d));                                   // deep portal
      arch(X - 0.02, 0, 6.8, 10, 312.6, 317.4, mixc(BRONZE, d));                                    // bronze doors
      wq(X - 0.03, 0, 6.8, ...sub(314.95, 315.05), mixc(scl(BRONZE, 0.6), d));
      for (const o of [-5.3, 5.3]) arch(X - 0.01, 12, 22, 25, zc + o - 1, zc + o + 1, mixc(GLASS, d));
      wallText("ST PATRICK'S", X - 0.05, 13.6, zc, 0.95, mixc(scl(BRONZE, 0.7), d), 1);
    }
  }
}

/* ---------- Shibuya: GO on every screen when the lights change, and Hachiko at the exit ---------- */
let wRun = null, lastWave = 0, flashAt = -99;
// how strongly the screens flash right now (1 just after the lights change, fading to 0); call once a frame
export function scrambleFlash() {
  if (!S || LV.id !== 'shibuya') return 0;
  if (S !== wRun) { wRun = S; lastWave = S.waveT; flashAt = -99; }
  if (S.waveT > lastWave + 2) flashAt = S.clock;   // the wave timer was just reset: a scramble has started
  lastWave = S.waveT;
  return clamp(1 - (S.clock - flashAt) / 2.6, 0, 1);
}

// the statue of the faithful dog on its plinth, beside the exit at the end of the crossing (d: depth of the finish)
export function hachiko(d) {
  const x = -5.6, s = F / d;
  const plinth = [[-6.5, -4.7]];
  for (const [a, b] of plinth) {
    poly([[a, 0, d], [b, 0, d], [b, 1.35, d], [a, 1.35, d]], mixc(hex('#8a8478'), d));
    poly([[a - 0.1, 1.35, d], [b + 0.1, 1.35, d], [b + 0.1, 1.5, d], [a - 0.1, 1.5, d]], mixc(hex('#a29c90'), d));
  }
  const base = P(x, 1.5, d), bx = base[0], by = base[1];
  if (s * 1.2 < 6) return;
  const g = ctx.createLinearGradient(bx - 0.5 * s, by - 1.2 * s, bx + 0.5 * s, by);
  g.addColorStop(0, mixc(hex('#a8895a'), d)); g.addColorStop(1, mixc(hex('#4d3d24'), d));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(bx + 0.12 * s, by - 0.28 * s, 0.34 * s, 0.28 * s, 0, 0, TAU); ctx.fill();               // haunch
  ctx.beginPath(); ctx.ellipse(bx - 0.1 * s, by - 0.62 * s, 0.2 * s, 0.36 * s, -0.25, 0, TAU); ctx.fill();             // chest
  ctx.fillRect(bx - 0.22 * s, by - 0.5 * s, 0.09 * s, 0.5 * s); ctx.fillRect(bx - 0.06 * s, by - 0.5 * s, 0.09 * s, 0.5 * s);   // front legs
  ctx.beginPath(); ctx.arc(bx - 0.14 * s, by - 1.02 * s, 0.17 * s, 0, TAU); ctx.fill();                                  // head
  ctx.beginPath(); ctx.ellipse(bx - 0.3 * s, by - 0.97 * s, 0.11 * s, 0.07 * s, 0.2, 0, TAU); ctx.fill();               // muzzle
  for (const e of [-0.24, -0.04]) { ctx.beginPath(); ctx.moveTo(bx + (e - 0.06) * s, by - 1.12 * s); ctx.lineTo(bx + e * s, by - 1.3 * s); ctx.lineTo(bx + (e + 0.06) * s, by - 1.12 * s); ctx.closePath(); ctx.fill(); }   // pricked ears
  ctx.strokeStyle = g; ctx.lineWidth = Math.max(1, 0.06 * s); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(bx + 0.42 * s, by - 0.4 * s); ctx.quadraticCurveTo(bx + 0.6 * s, by - 0.75 * s, bx + 0.38 * s, by - 0.7 * s); ctx.stroke();   // curled tail
  const q = P(x, 0.75, d); label('ハチ公', q[0], q[1], Math.round(0.36 * s), mixc(hex('#f4f1ea'), d));
}

/* ---------- Terminal B: a jet taxiing past the windows, coming towards you ---------- */
// It starts far down the taxiway when the run begins and rolls the other way, so you meet it somewhere past halfway.
export function taxiingJet() {
  if (!S) return;
  const z = 640 - (S.clock || 0) * 6.5, x = -60;
  if (z - VZ > 130 || z + 30 - VZ < 1) return;
  const W_ = hex('#f4f6f8'), G = hex('#c9ced6'), D = hex('#2a3644'), T = hex('#14b8a6');
  // furthest parts first: tail, then wings and engines, then the body and nose (the nose points at you)
  box3D(x - 0.25, x + 0.25, 4.2, 9.4, z + 24, z + 28.5, T);                    // fin
  box3D(x - 5.5, x + 5.5, 4.4, 4.7, z + 25, z + 28, W_);                       // tailplane
  box3D(x - 16, x + 16, 1.6, 1.95, z + 10, z + 15, W_);                        // wings
  for (const o of [-6.8, 6.8]) box3D(x + o - 0.9, x + o + 0.9, 0.6, 2.0, z + 8.5, z + 12, G);   // engines
  box3D(x - 2.1, x + 2.1, 1.1, 4.4, z + 2, z + 28, W_);                        // fuselage
  box3D(x - 2.12, x + 2.12, 3.1, 3.45, z + 2.5, z + 26, D);                    // window band
  box3D(x - 1.7, x + 1.7, 1.4, 4.0, z, z + 2, W_);                             // nose
  box3D(x - 1.0, x + 1.0, 2.6, 3.4, z - 0.01, z + 0.3, D);                     // cockpit windows
  // wingtip and belly lights blink
  if (!calm && Math.floor((S.clock || 0) * 1.6) % 2 === 0) for (const [lx, ly, lz, c] of [[x - 16, 1.8, z + 12, '#ff3b3b'], [x + 16, 1.8, z + 12, '#3bff7a'], [x, 0.9, z + 14, '#ff3b3b']]) {
    const d = lz - VZ; if (d < 1) continue; const q = P(lx, ly, d); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(1.5, 0.3 * F / d), 0, TAU); ctx.fill();
  }
}
