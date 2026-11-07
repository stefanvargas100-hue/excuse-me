import { hex } from '../config/colour.js';
import { mixc } from '../config/levels.js';
import { ctx } from '../dom.js';
import { H, HOR, VZ, W } from './camera.js';
import { box3D, fq, poly } from './draw.js';
import { S } from '../sim/state.js';

/* ---------- what you see through the airport windows: the apron, parked planes on jet bridges, tugs, a far skyline ----------
   Drawn once, clipped to the window openings, before the terminal itself. Gate g sits at z = GATE_Z0 + g * GATE_EVERY. */
export const GATE_Z0 = 40, GATE_EVERY = 40;
const TAILS = ['#d6336c', '#2f80ed', '#14b8a6', '#f2994a', '#7c3aed', '#16a34a'];
const WHITE = hex('#f4f6f8'), GREY = hex('#c9ced6'), DARK = hex('#2a3644');
export const gateNo = g => 'B' + (g + 1);
export const gateHasPlane = g => (g * 7 + 3) % 5 !== 0;   // now and then a gate stands empty

function plane(z, g) {
  const tail = hex(TAILS[g % TAILS.length]);
  box3D(-43, -37, 4.2, 8.8, z - 0.25, z + 0.25, tail);                         // tail fin
  box3D(-43, -38, 4.5, 4.75, z - 5.2, z + 5.2, WHITE);                         // tail plane
  box3D(-41.5, -13.2, 1.1, 4.4, z - 2.1, z + 2.1, WHITE);                      // fuselage
  box3D(-41.4, -13.3, 3.1, 3.45, z - 2.12, z + 2.12, DARK);                    // window band
  box3D(-41.5, -13.2, 0.8, 1.3, z - 1.7, z + 1.7, GREY);                       // belly
  box3D(-31, -22, 1.5, 1.8, z - 15, z + 15, WHITE);                            // wings
  for (const s of [-1, 1]) box3D(-28, -24.5, 0.55, 1.95, z + s * 6.5 - 0.9, z + s * 6.5 + 0.9, GREY);   // engines
  box3D(-14.6, -12.4, 1.5, 4.0, z - 1.7, z + 1.7, WHITE);                      // nose
  box3D(-12.6, -11.8, 2.0, 3.6, z - 1.2, z + 1.2, tail);                       // nose tip in the airline colour
}

function bridge(z) {
  box3D(-12.2, -7.1, 2.7, 4.1, z - 1.4, z + 1.4, GREY);                        // the jet bridge from the terminal to the door
  box3D(-12.2, -7.1, 3.3, 3.8, z - 1.42, z + 1.42, DARK);
  box3D(-10.4, -9.8, 0, 2.7, z - 0.25, z + 0.25, hex('#6b7280'));
}

function tug(z) {
  box3D(-19, -17.4, 0.3, 1.5, z - 0.8, z + 0.8, hex('#f2994a'));
  for (let i = 1; i <= 3; i++) box3D(-19 + i * 2.1 - 0.4, -19 + i * 2.1 + 1.3, 0.3, 1.6, z - 1.0, z + 1.0, i % 2 ? hex('#9aa3af') : hex('#2f80ed'));
}

export function drawApron() {
  // sky and ground fill the whole clip; the horizon is where they meet
  const g = ctx.createLinearGradient(0, HOR - H * 0.5, 0, HOR);
  g.addColorStop(0, '#3f8fdc'); g.addColorStop(1, '#a9d0ee');
  ctx.fillStyle = g; ctx.fillRect(-W, -H, 3 * W, HOR + H);
  poly([[-120, 0, 0.3], [-7, 0, 0.3], [-7, 0, 300], [-120, 0, 300]], mixc(hex('#737d86'), 22));
  const z0 = Math.floor((VZ - 14) / GATE_EVERY), z1 = Math.ceil((VZ + 130) / GATE_EVERY);
  const gates = [];
  for (let g = Math.max(0, z0); g <= z1; g++) gates.push(g);
  // far skyline of hangars and a tower, behind the planes
  for (let k = Math.floor(VZ / 60) - 1; k < Math.floor(VZ / 60) + 4; k++) {
    box3D(-150, -128, 0, 9 + ((k * 5) & 3) * 3, k * 60 + 6, k * 60 + 40, hex('#9fb0c2'));
    if (k % 3 === 0) { box3D(-143, -139, 9, 26, k * 60 + 20, k * 60 + 24, hex('#b8c4d0')); box3D(-146, -136, 26, 30, k * 60 + 18, k * 60 + 26, hex('#7a8da3')); }
  }
  // painted lead-in lines to each gate
  for (const gi of gates) { const z = GATE_Z0 + gi * GATE_EVERY; fq(-60, -7, 0.003, Math.max(0.3, z - 0.1 - VZ), Math.max(0.4, z + 0.1 - VZ), mixc(hex('#e0b400'), 25)); }
  // furthest first
  for (const gi of gates.slice().reverse()) {
    const z = GATE_Z0 + gi * GATE_EVERY;
    if (gateHasPlane(gi)) { plane(z, gi); bridge(z); } else { bridge(z); tug(z + 12); }
  }
  // one tug crawls along the apron
  const tz = ((S.clock || 0) * 3.2) % 400 + Math.floor(VZ / 400) * 400;
  tug(tz);
}
