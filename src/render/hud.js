import { clamp } from '../config/util.js';
import { ctx } from '../dom.js';
import { touches } from '../input/input.js';
import { H, UI, W } from './camera.js';
import { FONT } from './draw.js';
import { S } from '../sim/state.js';
import { TUT } from '../sim/tutorial.js';



export let radarTop = 120;
   // bottom of the HUD, used to place banners
// (the rear radar was removed 2026-11-06: not useful any more)

export function zoneGuide() {
  const held = { L: false, R: false };
  for (const z of touches.values()) held[z] = true;
  for (const z of ['L', 'R']) {
    const w = W * 0.35, x0 = z === 'L' ? 0 : W - w;
    const g = ctx.createLinearGradient(z === 'L' ? 0 : W, 0, z === 'L' ? w : W - w, 0);
    const tz = S.tut ? TUT[S.tut.step].zone : null;
    const want = tz && (tz === z || tz === 'LR' || tz === 'both');
    const al = held[z] ? 0.32 : want ? 0.22 + 0.18 * Math.sin(S.clock * 6) : 0.10;
    g.addColorStop(0, (held[z] || want) ? 'rgba(255,107,157,' + al.toFixed(2) + ')' : 'rgba(255,255,255,0.10)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x0, H * 0.45, w, H * 0.55);
  }
}

export function drawPops() {
  let y = H * 0.8;   // above the bottom HUD row, which would otherwise sit on the countdown and the pop-ups
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = S.pops.length - 1; i >= 0; i--) {
    const q = S.pops[i], a = clamp(1.3 - q.t, 0, 1), rise = q.t * 26;
    const pop = q.t < 0.12 ? 0.7 + q.t * 2.5 : 1;
    ctx.globalAlpha = a * 0.7;
    ctx.font = '700 ' + Math.round(q.size * 0.72 * pop * UI) + 'px ' + FONT;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(15,27,45,0.7)'; ctx.lineJoin = 'round';
    ctx.strokeText(q.text, W / 2, y - rise);
    ctx.fillStyle = q.color; ctx.fillText(q.text, W / 2, y - rise);
    y -= q.size * 0.8;
  }
  ctx.globalAlpha = 1;
}

// Retire passed weave records without drawing guidance through the crowd.
export function pruneFlows() {
  if (!S.flows.length) return;
  S.flows = S.flows.filter(f => f.rows.some(r => r.ref && !r.ref.dead && r.ref.z > S.pz - 1));
}

export function setRadarTop(v) { radarTop = v; }
