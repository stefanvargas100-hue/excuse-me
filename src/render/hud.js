import { R_BODY, R_PLAYER } from '../config/tuning.js';
import { TAU, clamp } from '../config/util.js';
import { ctx } from '../dom.js';
import { touches } from '../input/input.js';
import { H, W } from './camera.js';
import { FONT } from './draw.js';
import { S } from '../sim/state.js';
import { TUT } from '../sim/tutorial.js';



export let radarTop = 120;
   // bottom of the HUD, used to place banners
// Circular radar, bottom right: you are the dot in the middle and up is the way you are walking, so
// people beside and behind you sit below and to the sides. Each arrow points the way that person is moving
// relative to you, so an arrow pointing down on the lower half means they are catching up.
function radarArrow(x, y, ang, size, col, edge) {
  const c = Math.cos(ang), s = Math.sin(ang), P = [[1, 0], [-0.75, -0.65], [-0.35, 0], [-0.75, 0.65]];
  ctx.fillStyle = col; ctx.strokeStyle = edge; ctx.lineWidth = 1.2; ctx.lineJoin = 'round';
  ctx.beginPath();
  P.forEach(([u, v], i) => { const px = x + (u * c - v * s) * size, py = y + (u * s + v * c) * size; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

export function rearRadar() {
  const RANGE = 7, r = Math.min(58, W * 0.16), cx = W - r - 14, cy = H - r - 30, sc = r / RANGE;
  ctx.save();
  ctx.fillStyle = 'rgba(15,27,45,0.5)'; ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
  const list = [];
  for (const p of S.people) {
    if (p.prop || p.dead) continue;
    const dx = p.x - S.px, dz = p.z - S.pz, d = Math.hypot(dx, dz);
    if (d < RANGE + 0.5) list.push({ p, dx, dz, d });
  }
  list.sort((a, b) => b.d - a.d);
  for (const it of list) {
    const p = it.p, x = cx + it.dx * sc, y = cy - it.dz * sc;
    const relx = p.vx - S.vx, relz = p.vz - S.speed;
    const ang = Math.hypot(relx, relz) > 0.2 ? Math.atan2(-relz, relx) : -Math.PI / 2;
    const near = clamp(1 - it.d / RANGE, 0, 1);
    const gap = Math.abs(it.dx) - (R_PLAYER + R_BODY);
    const danger = gap < 0.6 && it.dz < 1.4 && it.dz > -2.5;
    ctx.globalAlpha = (0.5 + 0.5 * near) * (danger ? 0.65 + 0.35 * Math.sin(S.clock * 22) : 1);
    const sz = 5.5 + 3 * near;
    if (p.rival) radarArrow(x, y, ang, sz, '#ff2d3a', '#ffffff');
    else if (p.fast) radarArrow(x, y, ang, sz, '#22b8e8', '#ffffff');
    else radarArrow(x, y, ang, sz, '#ffcf1f', 'rgba(255,255,255,0.85)');
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.font = '700 9px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText('RADAR', cx, cy - r - 5);
}

export function zoneGuide() {
  const held = { L: false, R: false };
  for (const z of touches.values()) held[z] = true;
  for (const z of ['L', 'R']) {
    const w = W * 0.35, x0 = z === 'L' ? 0 : W - w;
    const g = ctx.createLinearGradient(z === 'L' ? 0 : W, 0, z === 'L' ? w : W - w, 0);
    const tz = S.tut ? TUT[S.tut.step].zone : null;
    const want = tz && (tz === z || tz === 'LR' || tz === 'both');
    const al = held[z] ? 0.32 : want ? 0.22 + 0.18 * Math.sin(S.clock * 6) : 0.10;
    g.addColorStop(0, (held[z] || want) ? 'rgba(255,207,31,' + al.toFixed(2) + ')' : 'rgba(255,255,255,0.10)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x0, H * 0.45, w, H * 0.55);
  }
}

export function drawPops() {
  let y = H * 0.86;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = S.pops.length - 1; i >= 0; i--) {
    const q = S.pops[i], a = clamp(1.3 - q.t, 0, 1), rise = q.t * 26;
    const pop = q.t < 0.12 ? 0.7 + q.t * 2.5 : 1;
    ctx.globalAlpha = a;
    ctx.font = '700 ' + Math.round(q.size * pop) + 'px ' + FONT;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(15,27,45,0.85)'; ctx.lineJoin = 'round';
    ctx.strokeText(q.text, W / 2, y - rise);
    ctx.fillStyle = q.color; ctx.fillText(q.text, W / 2, y - rise);
    y -= q.size * 1.1;
  }
  ctx.globalAlpha = 1;
}

export function setRadarTop(v) { radarTop = v; }
