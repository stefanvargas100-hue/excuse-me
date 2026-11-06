import { clamp } from '../config/util.js';
import { ctx } from '../dom.js';
import { F, VZ } from './camera.js';
import { W3 } from './draw.js';
import { draftCharge } from '../sim/race.js';
import { S, state } from '../sim/state.js';

/* ---------- slipstream: wind lines that build around you while you draft, like Mario Kart ---------- */
// Faint lines stream off the person ahead and past you. The longer you hold it and the closer you are, the more
// lines there are and the bigger they get, until the wind wraps around you and the boost fires.
const BURST_LEN = 0.45;    // seconds for the ring that marks the boost firing
const FADE_LEN = 0.7;      // the wind dies away over the last of the boost
const frac = v => v - Math.floor(v);

export function drawSlipstream() {
  if (!S.race || state !== 'play') return;
  const on = S.draftT > 0, charge = draftCharge(S);
  if (!on && charge < 0.03) return;
  const power = on ? clamp(S.draftT / FADE_LEN, 0, 1) : charge * (0.55 + 0.45 * S.draftNear);
  // while charging the wind comes off whoever you are behind; during the boost it surrounds you
  const fromX = on ? S.px : S.draftX, fromZ = on ? S.pz + 6 : S.draftZ, toZ = S.pz - 2.2;
  const count = Math.round(5 + 25 * power), radius = 0.28 + 0.62 * power, flow = 0.5 + 0.7 * power, len = 0.5 + 2.4 * power;
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const u = frac(S.clock * flow + i * 0.381), ang = i * 2.399, wob = 0.8 + 0.2 * Math.sin(i * 1.7);
    const z = fromZ + (toZ - fromZ) * u, cx = fromX + (S.px - fromX) * u;
    const x = cx + Math.cos(ang) * radius * wob, y = Math.max(0.06, 0.95 + Math.sin(ang) * radius * wob * 1.1);
    const z2 = z - len;
    if (z2 - VZ < 1) continue;
    const a = W3(x, y, z), b = W3(x, y, z2), fadeIn = Math.sin(Math.PI * u);
    ctx.globalAlpha = clamp(fadeIn * (0.3 + 0.7 * power), 0, 1);
    ctx.strokeStyle = i % 3 === 0 ? '#ffffff' : '#7fd0ff';
    ctx.lineWidth = Math.max(1, (0.012 + 0.03 * power) * F / b[2]);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  const age = S.draftT > 0 ? S.draftFull - S.draftT : 99;
  if (age < BURST_LEN) {   // the moment it fires: a ring of wind bursts outward from you
    const t = age / BURST_LEN, c = W3(S.px, 0.95, S.pz), s = F / c[2];
    ctx.globalAlpha = 1 - t; ctx.strokeStyle = '#7fd0ff'; ctx.lineWidth = Math.max(2, 0.09 * s * (1 - t));
    ctx.beginPath(); ctx.ellipse(c[0], c[1], (0.4 + 1.6 * t) * s, (0.5 + 1.5 * t) * s, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
