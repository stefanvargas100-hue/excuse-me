// Shared drawing tools for the stage painters that paint straight in their world's own colours (Tsukiji, Skytree and the Airport
// stages after Terminal B). Decoration only: nothing here reads or changes the simulation or its random numbers.
// The sharpness rules at the top of render/style.js apply: solid shapes, single crisp lines, a calm floor.
import { TAU } from '../config/util.js';
import { hex } from '../config/colour.js';
import { mixc } from '../config/levels.js';
import { ctx } from '../dom.js';
import { F, H, HOR, VZ, W } from './camera.js';
import { P, label } from './draw.js';
import { hsh } from './scenery.js';

export const col = (h, d) => mixc(hex(h), d);   // a colour at depth d, faded toward the stage's haze

// f(near, far) for the part of z0..z1 that lies in front of the camera
export function span(z0, z1, f) { const a = Math.max(z0 - VZ, 0.2), b = z1 - VZ; if (b > a + 0.02) f(a, b); }

// The backdrop behind the whole stage: flat bands of colour from the top of the screen down to the horizon, and one colour below it.
export function backdrop(stops, below) {
  ctx.fillStyle = below; ctx.fillRect(-W, HOR - 1, 3 * W, H * 2);
  const g = ctx.createLinearGradient(0, 0, 0, HOR);
  for (const [t, c] of stops) g.addColorStop(t, c);
  ctx.fillStyle = g; ctx.fillRect(-W, -H, 3 * W, HOR + H);
}

// Steady stars: small crisp dots above yMax. drift slides them sideways (a slow turn of the station, or the camera's own sidestep).
export function stars(n, seed, yMax, drift = 0) {
  const span = W * 1.4;
  for (let i = 0; i < n; i++) {
    const x = ((hsh(i, seed) * span - drift * (0.4 + 0.6 * hsh(i, seed + 3))) % span + span) % span - W * 0.2, y = hsh(i, seed + 1) * yMax, r = 0.6 + hsh(i, seed + 2) * 1.1;
    ctx.fillStyle = i % 7 === 0 ? '#ffd9a8' : i % 4 === 0 ? '#a8d8ff' : '#ffffff';
    ctx.globalAlpha = 0.5 + 0.5 * hsh(i, seed + 4);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// A round or oval shape at a world point, facing the camera (a lantern, a lamp, a porthole).
export function orb(x, y, d, rx, ry, fill) {
  const q = P(x, y, d), s = F / d;
  ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(q[0], q[1], rx * s, ry * s, 0, 0, TAU); ctx.fill();
}

// A straight line between two world points, one solid stroke.
export function line3(x0, y0, d0, x1, y1, d1, colour, wM) {
  const a = P(x0, y0, d0), b = P(x1, y1, d1);
  ctx.strokeStyle = colour; ctx.lineWidth = Math.max(1, wM * F / ((d0 + d1) / 2)); ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
}

// The finish: two posts and a beam across the way, with the goal's name on it.
export function goalGate(z, half, top, post, beam, text, textCol, box3D) {
  const d = z - VZ; if (d < 1 || d > 100) return;
  for (const x of [-half, half]) box3D(x - 0.12, x + 0.12, 0, top, z - 0.12, z + 0.12, hex(post));
  box3D(-half, half, top - 0.7, top, z - 0.12, z + 0.12, hex(beam));
  const q = P(0, top - 0.35, d); label(text, q[0], q[1], Math.min(28, F / d * 0.5), textCol);
}

// Things that hang over the walkway fade out before they pass over the camera.
export const nearFade = (d, from = 3, over = 3) => Math.max(0, Math.min(1, (d - from) / over));
