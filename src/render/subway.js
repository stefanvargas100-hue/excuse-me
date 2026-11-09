// Subway Platform scenery: tiled wall on one side, track and yellow safety edge on the other, ceiling and columns. All fixed or hashed, never simulation randomness.
import { hex } from '../config/colour.js';
import { LV, mixc } from '../config/levels.js';
import { ctx } from '../dom.js';
import { F, HOR, VZ, W, H } from './camera.js';
import { P, box3D, cq, forSegs, fq, label, poly, wq } from './draw.js';
import { goalOf } from '../sim/state.js';

const CEIL = 4.4;
export function paintSubway() {
  const g = ctx.createLinearGradient(0, 0, 0, HOR);
  g.addColorStop(0, '#12161b'); g.addColorStop(1, '#222830');
  ctx.fillStyle = g; ctx.fillRect(-W, -H, 3 * W, HOR + H);
  const h = LV.half, d = goalOf() - VZ;
  if (d > 0.3 && d < 110) {   // the exit: a lit stair opening with a sign over it
    cq(-h, h, 0, CEIL, d, mixc(hex('#3b434b'), d));
    cq(-1.6, 1.6, 0, 3.0, d, mixc(hex('#cfd8c8'), d));
    const q = P(0, 3.7, d); label(LV.goalText, q[0], q[1], 0.55 * F / d, '#ffe08a');
  }
  forSegs(4, 110, (k, za, zb, a, b) => {
    fq(-h, h, 0, a, b, mixc(hex(k % 2 ? '#8b8f93' : '#95999c'), a));                       // platform floor
    fq(h - 0.45, h, 0.004, a, b, mixc(hex('#e8b923'), a));                                  // yellow safety edge
    if (a < 30) for (let i = 0; i < 4; i++) fq(h - 0.45 + i * 0.12, h - 0.45 + i * 0.12 + 0.05, 0.006, a, b, mixc(hex('#9b7a0f'), a));
    fq(h, h + 0.1, 0, a, b, mixc(hex('#c9c9c9'), a));
    fq(h + 0.1, 14, -0.9, a, b, mixc(hex('#1a1d20'), a));                                  // track bed
    for (const x of [h + 1.2, h + 2.65]) fq(x - 0.05, x + 0.05, -0.8, a, b, mixc(hex('#6d7378'), a));   // rails
    if (a < 60) fq(h + 0.4, h + 3.6, -0.78, a, Math.min(a + 0.1, b), mixc(hex('#3a3f44'), a));         // sleeper
    wq(14, -0.9, CEIL, a, b, mixc(hex(k % 2 ? '#2c3238' : '#30363c'), a));                   // far tunnel wall
    // tiled wall on the left: white tiles with a dark band
    wq(-h, 0, 1.0, a, b, mixc(hex('#d5dbd5'), a));
    wq(-h, 1.0, 1.25, a, b, mixc(hex('#2f6f58'), a));
    wq(-h, 1.25, CEIL, a, b, mixc(hex(k % 2 ? '#c4ccc4' : '#cdd4cd'), a));
    if (a < 50) wq(-h + 0.001, 0.8, 3.6, a, Math.min(a + 0.04, b), mixc(hex('#9aa49b'), a));       // grout line
    poly([[-h, CEIL, a], [14, CEIL, a], [14, CEIL, b], [-h, CEIL, b]], mixc(hex('#171b20'), a));   // ceiling
    if (k % 2 === 0 && a > 3) fq(-1.2, 1.2, CEIL - 0.02, a, Math.min(a + 1.6, b), mixc(hex('#fff3c4'), a)); // strip lights
    if (k % 3 === 0 && za - VZ > 0.3) {                                                      // columns
      box3D(-h, -h + 0.45, 0, CEIL, za + 1.5, za + 2.0, hex('#78828a'));
      box3D(h + 0.6, h + 1.0, -0.9, CEIL, za + 1.5, za + 2.0, hex('#4c555c'));
    }
  });
}
