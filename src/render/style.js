import { FOGCSS, LV, setFog } from '../config/levels.js';
import { STYLES, mapColour, styleIdFor } from '../config/styles.js';
import { ctx } from '../dom.js';
import { S, calm } from '../sim/state.js';
import { CX, F, H, HOR, VX, VY, VZ, W } from './camera.js';

/* ---------- art styles on the canvas ---------- */
// Scenery and characters keep drawing exactly as before. While a style is on, every colour they hand to the canvas is swapped for
// the style's version on the way in, so one recipe restyles a whole stage without touching its drawing code.
// On top of that each world has a few set pieces of its own: a backdrop, a sky, something on the ground, and a finish over the frame.
// Drawing only: nothing here changes the simulation or uses its random numbers.

let forced = null;              // review tools can pin a style (?style=comic, or the lineup page)
let cur = STYLES.classic, id = 'classic', on = false, fig = 0, active = false, fogOver = false;
let cache = [new Map(), new Map(), new Map()], back = new Map();

try { const q = typeof location !== 'undefined' && /[?&]style=(\w+)/.exec(location.search); if (q && STYLES[q[1]]) forced = q[1]; } catch (e) {}

export const styleId = () => forced || styleIdFor(LV);
export const styleFamily = () => STYLES[styleId()].family;
export function forceStyle(v) { forced = v && STYLES[v] ? v : null; }
export const forcedStyle = () => forced;
export const STYLE_IDS = Object.keys(STYLES);
export const styleName = v => STYLES[v].name;

// The character recipe for whatever is being drawn now. Classic whenever no style is on.
export const figStyle = () => (on ? cur.fig : STYLES.classic.fig);
export const sceneInk = () => (on && !fig ? cur.sceneInk : null);
export const styleIs = v => on && id === v;
export const skyTop = top => (on && cur.skyTop) || top;

function tr(v) {
  const m = cache[fig];
  let o = m.get(v);
  if (o === undefined) {
    if (m.size > 6000) m.clear();
    o = mapColour(id, v, fig); m.set(v, o);
    if (back.size > 6000) back.clear();
    if (o !== v) back.set(o, v);
  }
  return o;
}

const patched = new WeakSet();
function patch(c) {
  if (patched.has(c)) return true;
  if (typeof CanvasRenderingContext2D === 'undefined' || !(c instanceof CanvasRenderingContext2D)) return false;
  const proto = CanvasRenderingContext2D.prototype;
  for (const key of ['fillStyle', 'strokeStyle']) {
    const d = Object.getOwnPropertyDescriptor(proto, key);
    if (!d || !d.set) return false;
    Object.defineProperty(c, key, {
      configurable: true,
      // reading a colour back gives the colour that was asked for, so "remember it, change it, put it back" still works
      get() { const v = d.get.call(this); return on && typeof v === 'string' && back.has(v) ? back.get(v) : v; },
      set(v) { d.set.call(this, on && typeof v === 'string' ? tr(v) : v); }
    });
  }
  for (const key of ['createLinearGradient', 'createRadialGradient']) {
    const make = proto[key];
    c[key] = function (...a) {
      const g = make.apply(this, a);
      if (on) { const add = g.addColorStop; g.addColorStop = (at, col) => add.call(g, at, typeof col === 'string' ? tr(col) : col); }
      return g;
    };
  }
  patched.add(c);
  return true;
}

// Turn the stage's style on for the world drawing that follows. Returns false when there is nothing to do.
export function styleBegin() {
  const want = styleId();
  if (want === 'classic' || !patch(ctx)) {
    on = false; active = false;
    if (fogOver) { setFog(LV.fog); fogOver = false; }
    return false;
  }
  if (want !== id) { id = want; cur = STYLES[id]; cache = [new Map(), new Map(), new Map()]; back = new Map(); }
  const fog = cur.fog || LV.fog;
  if (FOGCSS !== fog) setFog(fog);
  fogOver = !!cur.fog;
  on = true; active = true; fig = 0;
  return true;
}
export function styleEnd() { on = false; fig = 0; }

// Characters use their own colour recipe: 0 scenery, 1 a character, 2 the player. Returns the mode to hand back afterwards.
export function figureMode(v) { const was = fig; fig = on ? v : 0; return was; }
// Markers that must read the same in every style (name tags, stamina, warnings) are drawn with the style paused.
export function stylePause() { const was = on; on = false; return was; }
export function styleResume(was) { on = was; }

/* ---------- shared tools ---------- */
const TAU = Math.PI * 2;
const proj = (x, y, d) => [CX + (x - VX) * F / d, HOR + (VY - y) * F / d];
const rnd = i => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };   // a fixed scatter, not the game's random numbers
const clock = () => (calm || !S ? 0 : S.clock || 0);
const MARKER = "'Permanent Marker','Patrick Hand',cursive";

const tiles = new Map();
function tile(name, size, paint) {
  let t = tiles.get(name);
  if (t === undefined) {
    t = null;
    try {
      const c = document.createElement('canvas'); c.width = c.height = size;
      paint(c.getContext('2d'), size);
      t = ctx.createPattern(c, 'repeat');
    } catch (e) { t = null; }
    tiles.set(name, t);
  }
  return t;
}
const dotTile = (name, col, r) => tile(name, 10, x => { x.fillStyle = col; for (const [px, py] of [[2.5, 2.5], [7.5, 7.5]]) { x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill(); } });
const grainTile = () => tile('grain', 64, (x, s) => { for (let i = 0; i < 700; i++) { x.fillStyle = rnd(i + 5000) > 0.5 ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.6)'; x.fillRect(Math.floor(rnd(i) * s), Math.floor(rnd(i + 2500) * s), 1, 1); } });

function vignette(inner, col) {
  const g = ctx.createRadialGradient(W / 2, H * 0.52, Math.min(W, H) * inner, W / 2, H * 0.52, Math.max(W, H) * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, col);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function wash(pattern, alpha) { if (pattern) { ctx.fillStyle = pattern; ctx.globalAlpha = alpha; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; } }

// A page of a comic: a white gutter round an inked panel, and the narrator's box for the first few seconds of a run.
function panel(paper, ink, box, text) {
  ctx.strokeStyle = paper; ctx.lineWidth = 12; ctx.strokeRect(0, 0, W, H);
  ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.strokeRect(7, 7, W - 14, H - 14);
  const t = S && S.live ? S.clock || 0 : 99;
  if (t >= 5) return;
  ctx.globalAlpha = t > 4.3 ? (5 - t) / 0.7 : 1;
  const line = (LV.name || '').toUpperCase() + '!', y = Math.max(112, H * 0.15);
  ctx.font = '400 17px ' + MARKER; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText(line).width + 22;
  ctx.save(); ctx.translate(18, y); ctx.rotate(-0.03);
  ctx.fillStyle = ink; ctx.fillRect(4, 4, tw, 34);
  ctx.fillStyle = box; ctx.fillRect(0, 0, tw, 34); ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.strokeRect(0, 0, tw, 34);
  ctx.fillStyle = text; ctx.fillText(line, 11, 18);
  ctx.restore(); ctx.globalAlpha = 1;
}

// Glow: a small copy of the frame, with its darks crushed, laid back over the frame. Bright things bleed light; dark things do not.
let glowCv = null;
function bloom(strength, crush) {
  try {
    const src = ctx.canvas, bw = Math.max(24, Math.round(src.width / 14)), bh = Math.max(24, Math.round(src.height / 14));
    if (!glowCv) glowCv = document.createElement('canvas');
    if (glowCv.width !== bw || glowCv.height !== bh) { glowCv.width = bw; glowCv.height = bh; }
    const g = glowCv.getContext('2d');
    g.globalCompositeOperation = 'copy'; g.globalAlpha = 1; g.imageSmoothingEnabled = true; g.drawImage(src, 0, 0, bw, bh);
    g.globalCompositeOperation = 'multiply'; for (let i = 0; i < crush; i++) g.drawImage(glowCv, 0, 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = strength; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(glowCv, 0, 0, src.width, src.height);
    ctx.restore();
  } catch (e) {}
}

// Burst of rays from the end of the street.
function rays(n, col, turn) {
  const R = Math.hypot(W, H);
  ctx.fillStyle = col;
  for (let i = 0; i < n; i += 2) {
    const a = Math.PI + (i / n) * Math.PI + turn, b = a + Math.PI / n;
    ctx.beginPath(); ctx.moveTo(CX, HOR); ctx.lineTo(CX + Math.cos(a) * R, HOR + Math.sin(a) * R); ctx.lineTo(CX + Math.cos(b) * R, HOR + Math.sin(b) * R); ctx.closePath(); ctx.fill();
  }
}
const clipSky = () => { ctx.beginPath(); ctx.rect(-W, -H, 3 * W, HOR + H); ctx.clip(); };

/* ---------- backdrops: what lies behind the whole stage ---------- */
const BACKDROPS = {
  space() {
    let g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#02030b'); g.addColorStop(0.55, '#070d26'); g.addColorStop(1, '#0c1434');
    ctx.fillStyle = g; ctx.fillRect(-W, -H, 3 * W, 3 * H);
    // soft clouds of colour far away
    for (const [fx, fy, r, col] of [[0.7, 0.12, 0.6, 'rgba(126,60,200,0.30)'], [0.25, 0.3, 0.5, 'rgba(20,150,190,0.22)'], [0.55, 0.42, 0.4, 'rgba(230,70,140,0.14)']]) {
      g = ctx.createRadialGradient(W * fx, H * fy, 0, W * fx, H * fy, W * r);
      g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(-W, -H, 3 * W, 3 * H);
    }
    // stars drift as the station turns and as you walk along it
    const drift = clock() * 5 + (S ? S.pz : 0) * 1.4, span = W * 1.5;
    for (let i = 0; i < 150; i++) {
      const depth = 0.3 + rnd(i + 900) * 0.7;
      const x = ((rnd(i) * span - drift * depth) % span + span) % span - W * 0.25, y = rnd(i + 300) * H * 0.78, r = 0.5 + rnd(i + 600) * 1.5 * depth;
      ctx.globalAlpha = 0.45 + 0.55 * rnd(i + 1200);
      ctx.fillStyle = i % 9 === 0 ? '#ffd9a8' : i % 5 === 0 ? '#a8d8ff' : '#ffffff';
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      if (r > 1.5) { ctx.globalAlpha *= 0.5; ctx.fillRect(x - r * 3.2, y - 0.4, r * 6.4, 0.8); ctx.fillRect(x - 0.4, y - r * 3.2, 0.8, r * 6.4); }
    }
    ctx.globalAlpha = 1;
    // the home planet fills the windows on the left
    const px = CX - W * 0.72 - VX * 6, py = HOR + H * 0.1, pr = H * 0.46;
    g = ctx.createRadialGradient(px, py, pr * 0.9, px, py, pr * 1.14);
    g.addColorStop(0, 'rgba(90,190,255,0.75)'); g.addColorStop(1, 'rgba(90,190,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, pr * 1.14, 0, TAU); ctx.fill();
    g = ctx.createRadialGradient(px + pr * 0.45, py - pr * 0.5, pr * 0.1, px, py, pr);
    g.addColorStop(0, '#7fd4ff'); g.addColorStop(0.45, '#2b7fd8'); g.addColorStop(0.8, '#123a86'); g.addColorStop(1, '#081a44');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.clip();
    const turn = clock() * 0.012;
    for (let i = 0; i < 9; i++) {   // land and cloud, sliding round as the planet turns
      const a = rnd(i + 40) * TAU + turn, d = pr * (0.25 + rnd(i + 50) * 0.7), cx = px + Math.cos(a) * d, cy = py + Math.sin(a) * d * 0.8;
      ctx.fillStyle = i % 3 ? 'rgba(70,170,120,0.55)' : 'rgba(210,190,130,0.5)';
      ctx.beginPath(); ctx.ellipse(cx, cy, pr * (0.1 + rnd(i + 60) * 0.16), pr * (0.05 + rnd(i + 70) * 0.09), rnd(i + 80) * 3, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const cy = py - pr * 0.8 + i * pr * 0.26;
      ctx.lineWidth = pr * (0.025 + rnd(i + 20) * 0.03);
      ctx.beginPath(); ctx.ellipse(px + pr * 0.1, cy, pr * (0.5 + rnd(i + 30) * 0.4), pr * 0.12, 0.25, Math.PI * (1.05 + rnd(i) * 0.2) + turn * 6, Math.PI * (1.6 + rnd(i + 5) * 0.3) + turn * 6); ctx.stroke();
    }
    ctx.restore();
    // a ringed giant overhead, seen through the glass roof
    const qx = CX + W * 0.16 - VX * 3, qy = H * 0.085, qr = W * 0.13;
    ctx.strokeStyle = 'rgba(255,214,160,0.75)'; ctx.lineWidth = qr * 0.16;
    ctx.beginPath(); ctx.ellipse(qx, qy, qr * 1.9, qr * 0.5, -0.35, Math.PI * 0.98, Math.PI * 2.02); ctx.stroke();
    g = ctx.createRadialGradient(qx - qr * 0.4, qy - qr * 0.4, qr * 0.1, qx, qy, qr);
    g.addColorStop(0, '#ffe2b0'); g.addColorStop(0.5, '#e08a4a'); g.addColorStop(1, '#5a2248');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(qx, qy, qr, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(120,50,60,0.35)'; ctx.lineWidth = qr * 0.1;
    for (const o of [-0.35, 0.05, 0.4]) { ctx.beginPath(); ctx.ellipse(qx, qy + qr * o, qr * Math.sqrt(1 - o * o), qr * 0.1, -0.1, 0, Math.PI); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,224,180,0.9)'; ctx.lineWidth = qr * 0.16;
    ctx.beginPath(); ctx.ellipse(qx, qy, qr * 1.9, qr * 0.5, -0.35, Math.PI * 0.02, Math.PI * 0.98); ctx.stroke();
  }
};

/* ---------- skies: drawn right after a stage paints its sky, before its buildings ---------- */
const SKIES = {
  // superhero comic: rays bursting from the end of the avenue, printed dots thickening toward the top of the page
  burst() {
    clipSky();
    rays(22, 'rgba(255,255,255,0.3)', (clock() * 0.02) % (TAU / 22));
    const big = dotTile('skydots', 'rgba(13,11,20,0.9)', 2.1);
    if (big) { ctx.fillStyle = big; ctx.globalAlpha = 0.2; ctx.fillRect(-W, -H, 3 * W, H + HOR * 0.45); ctx.globalAlpha = 0.09; ctx.fillRect(-W, HOR * 0.45, 3 * W, HOR * 0.55); }
  },
  // Sunday funnies: a round yellow sun and fat outlined clouds drifting across a flat blue sky
  clouds() {
    clipSky();
    const sx = CX + W * 0.27, sy = HOR * 0.3, sr = W * 0.085;
    ctx.fillStyle = '#ffe14d'; ctx.strokeStyle = '#22304a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + clock() * 0.1; ctx.moveTo(sx + Math.cos(a) * sr * 1.3, sy + Math.sin(a) * sr * 1.3); ctx.lineTo(sx + Math.cos(a) * sr * 1.75, sy + Math.sin(a) * sr * 1.75); } ctx.stroke();
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.fill(); ctx.stroke();
    const span = W * 1.6, t = clock() * 6;
    for (let i = 0; i < 5; i++) {
      const cx = ((rnd(i + 3) * span + t * (0.5 + rnd(i))) % span) - W * 0.3, cy = HOR * (0.12 + 0.13 * i), s = W * (0.07 + 0.05 * rnd(i + 8));
      const puffs = [[-1.3, 0.25, 0.75], [-0.5, -0.25, 1], [0.45, -0.1, 0.9], [1.25, 0.3, 0.7]];
      ctx.fillStyle = '#22304a'; for (const [dx, dy, r] of puffs) { ctx.beginPath(); ctx.arc(cx + dx * s, cy + dy * s, r * s + 3, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#ffffff'; for (const [dx, dy, r] of puffs) { ctx.beginPath(); ctx.arc(cx + dx * s, cy + dy * s, r * s, 0, TAU); ctx.fill(); }
      ctx.fillRect(cx - 1.3 * s, cy + 0.25 * s, 2.55 * s, 0.7 * s);
      ctx.fillStyle = '#22304a'; ctx.fillRect(cx - 1.9 * s, cy + 0.95 * s, 3.7 * s, 3);
    }
  },
  // sunset pulp print: a huge low sun in flat rings, and hard rays behind the towers
  sun() {
    clipSky();
    rays(16, 'rgba(255,238,203,0.34)', 0);
    const r0 = Math.min(W * 0.46, HOR * 0.8);
    for (const [k, col] of [[1, '#f9c46b'], [0.8, '#ffdc94'], [0.6, '#ffeecb']]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(CX, HOR + r0 * 0.12, r0 * k, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = '#1b1a3a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(CX, HOR + r0 * 0.12, r0, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#1b1a3a';   // gulls
    for (let i = 0; i < 5; i++) { const gx = ((rnd(i + 70) * W * 1.4 + clock() * (7 + i * 2)) % (W * 1.4)) - W * 0.2, gy = HOR * (0.16 + 0.11 * i), s = 5 + rnd(i + 75) * 5; ctx.beginPath(); ctx.moveTo(gx - s * 2, gy - s * 0.5); ctx.quadraticCurveTo(gx - s, gy - s * 1.2, gx, gy); ctx.quadraticCurveTo(gx + s, gy - s * 1.2, gx + s * 2, gy - s * 0.5); ctx.quadraticCurveTo(gx + s, gy - s * 0.6, gx, gy + s * 0.35); ctx.quadraticCurveTo(gx - s, gy - s * 0.6, gx - s * 2, gy - s * 0.5); ctx.fill(); }
    const dots = dotTile('pulpdots', 'rgba(27,26,58,0.9)', 2);
    if (dots) { ctx.fillStyle = dots; ctx.globalAlpha = 0.22; ctx.fillRect(-W, -H, 3 * W, H + HOR * 0.4); }
  },
  // neo-noir: low cloud lit from below by the city
  glowcloud() {
    const g = ctx.createLinearGradient(0, HOR - H * 0.3, 0, HOR);
    g.addColorStop(0, 'rgba(120,30,90,0)'); g.addColorStop(1, 'rgba(190,40,120,0.42)');
    ctx.fillStyle = g; ctx.fillRect(-W, HOR - H * 0.3, 3 * W, H * 0.3);
  },
  // neon pop: a striped sun going down at the end of the street, under a sky full of stars
  synthsun() {
    clipSky();
    for (let i = 0; i < 70; i++) { ctx.globalAlpha = 0.3 + 0.7 * rnd(i + 11) * (0.6 + 0.4 * Math.sin(clock() * 2 + i)); ctx.fillStyle = i % 4 ? '#ffffff' : '#ffb3ec'; const r = 0.6 + rnd(i + 21) * 1.3; ctx.beginPath(); ctx.arc(rnd(i) * W, rnd(i + 31) * HOR * 0.85, r, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    const r0 = Math.min(W * 0.44, HOR * 0.78), cy = HOR - r0 * 0.25;
    let g = ctx.createRadialGradient(CX, cy, r0 * 0.7, CX, cy, r0 * 1.7);
    g.addColorStop(0, 'rgba(255,60,170,0.5)'); g.addColorStop(1, 'rgba(255,60,170,0)');
    ctx.fillStyle = g; ctx.fillRect(-W, -H, 3 * W, HOR + H);
    ctx.save(); ctx.beginPath(); ctx.arc(CX, cy, r0, 0, TAU); ctx.clip();
    g = ctx.createLinearGradient(0, cy - r0, 0, cy + r0);
    g.addColorStop(0, '#fff06a'); g.addColorStop(0.45, '#ff8a3c'); g.addColorStop(0.8, '#ff2d95'); g.addColorStop(1, '#b01fd0');
    ctx.fillStyle = g; ctx.fillRect(CX - r0, cy - r0, r0 * 2, r0 * 2);
    ctx.fillStyle = '#16063a';   // the cut lines, wider toward the bottom
    for (let i = 0; i < 7; i++) { const y = cy - r0 * 0.05 + i * r0 * 0.15, h = r0 * (0.018 + i * 0.012); ctx.fillRect(CX - r0, y, r0 * 2, h); }
    ctx.restore();
  }
};

/* ---------- ground: after the ground and scenery, before the people ---------- */
// Hanging signs along both sides of the street: a dark board, a lit frame and lettering down it. All above head height, so never over a person.
function signs(words, cols, every, reach) {
  const half = LV.half + 0.35, k0 = Math.floor(VZ / every);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  for (let k = k0 + Math.ceil(reach / every); k >= k0; k--) for (const side of [-1, 1]) {
    const i = ((k * 2 + (side > 0 ? 1 : 0)) % 9973 + 9973) % 9973, z = k * every + (side > 0 ? every * 0.45 : 0) + rnd(i + 3) * 2, d = z - VZ;
    if (d < 3.2 || d > reach) continue;
    const word = words[i % words.length], col = cols[(i * 7 + (k & 1)) % cols.length], sc = F / d;
    const wM = 0.95 + 0.25 * rnd(i + 5), hM = wM * 0.92 * word.length + 0.35, y0 = 3.3 + rnd(i + 7) * 1.6;
    const a = proj(side * half - (side > 0 ? wM : 0), y0 + hM, d), w = wM * sc, h = hM * sc;
    const blink = !calm && rnd(i + 13) > 0.8 && Math.sin((S ? S.clock || 0 : 0) * 9 + i) > 0.55 ? 0.35 : 1;   // one in five flickers
    ctx.globalAlpha = Math.min(1, 1.45 - d / reach * 1.2);
    ctx.fillStyle = 'rgba(8,6,20,0.92)'; ctx.fillRect(a[0], a[1], w, h);
    ctx.globalAlpha *= blink;
    ctx.strokeStyle = 'rgba(' + col + ',0.28)'; ctx.lineWidth = Math.max(3, 0.2 * sc); ctx.strokeRect(a[0], a[1], w, h);
    ctx.strokeStyle = 'rgb(' + col + ')'; ctx.lineWidth = Math.max(1.2, 0.06 * sc); ctx.strokeRect(a[0], a[1], w, h);
    const fs = w * 0.7;
    if (fs >= 5) {
      ctx.font = '700 ' + fs.toFixed(1) + 'px sans-serif'; ctx.fillStyle = 'rgb(' + col + ')';
      for (let c = 0; c < word.length; c++) ctx.fillText(word[c], a[0] + w / 2, a[1] + (c + 0.5) * (h - 0.3 * sc) / word.length + 0.15 * sc);
    } else { ctx.fillStyle = 'rgb(' + col + ')'; ctx.fillRect(a[0] + w * 0.3, a[1] + h * 0.12, w * 0.4, h * 0.76); }
  }
  ctx.globalAlpha = 1;
}

// Light on wet or polished ground: every sign smears a long streak of its colour toward you.
function streaks(cols, every, strength) {
  const half = LV.half + 0.6, k0 = Math.floor(VZ / every);
  for (let k = k0 + 9; k >= k0; k--) for (const side of [-1, 1]) {
    const z = k * every + (side > 0 ? every * 0.45 : 0), d = z - VZ;
    if (d < 2.5) continue;
    const i = ((k * 2 + (side > 0 ? 1 : 0)) % 9973 + 9973) % 9973, a = proj(side * half * (0.55 + 0.45 * rnd(i)), 0, d), len = Math.min(H, (F / d) * (5 + 6 * rnd(i + 9))), w = Math.max(3, (F / d) * (0.5 + 0.7 * rnd(i + 17)));
    const col = cols[i % cols.length], al = Math.min(0.34, 0.08 + 2.2 / d) * strength;
    const g = ctx.createLinearGradient(0, a[1], 0, a[1] + len);
    g.addColorStop(0, 'rgba(' + col + ',' + al.toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + col + ',0)');
    ctx.fillStyle = g; ctx.fillRect(a[0] - w / 2, a[1], w, len);
  }
}

const GROUNDS = {
  // neo-noir: rain-wet ground under a street hung with signs
  wet() {
    const cols = ['255,61,154', '32,227,255', '255,179,71', '178,107,255', '255,70,70'];
    signs(cur.signs, cols, 9, 62);
    ctx.globalCompositeOperation = 'lighter';
    streaks(cols, 9, 1);
    const g = ctx.createLinearGradient(0, HOR, 0, HOR + H * 0.22);
    g.addColorStop(0, 'rgba(255,61,154,0.22)'); g.addColorStop(1, 'rgba(32,227,255,0)');
    ctx.fillStyle = g; ctx.fillRect(-W, HOR, 3 * W, H * 0.22);
  },
  // neon pop: a glowing grid laid over the street, candy signs overhead
  grid() {
    const cols = ['255,95,196', '95,251,241', '255,240,106', '192,139,255'];
    signs(cur.signs, cols, 7, 55);
    ctx.globalCompositeOperation = 'lighter';
    const half = LV.half, z0 = Math.floor(VZ / 2.5) * 2.5;
    for (const [w, al] of [[5, 0.12], [1.4, 0.55]]) {
      ctx.strokeStyle = 'rgba(255,95,196,' + al + ')'; ctx.lineWidth = w; ctx.beginPath();
      for (let z = z0 + 2.5; z < VZ + 60; z += 2.5) { const d = z - VZ; if (d < 1) continue; const a = proj(-half, 0, d), b = proj(half, 0, d); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(95,251,241,' + al + ')'; ctx.beginPath();
      for (let x = -Math.floor(half); x <= half; x += 1) { const a = proj(x, 0, 1), b = proj(x, 0, 60); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
      ctx.stroke();
    }
    streaks(cols, 7, 0.7);
  },
  // space station: guide lights set into the deck, and a polished sheen
  deck() {
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, col] of [[-5, '60,220,255'], [5, '60,220,255'], [-LV.half + 0.15, '255,150,60'], [LV.half - 0.15, '255,150,60']]) {
      const a = proj(x, 0, 1.2), b = proj(x, 0, 70);
      for (const [w, al] of [[9, 0.1], [3, 0.5]]) { ctx.strokeStyle = 'rgba(' + col + ',' + al + ')'; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    }
    const g = ctx.createLinearGradient(0, HOR, 0, H);
    g.addColorStop(0, 'rgba(160,215,255,0.12)'); g.addColorStop(0.4, 'rgba(160,215,255,0)');
    ctx.fillStyle = g; ctx.fillRect(-W, HOR, 3 * W, H - HOR);
  }
};

/* ---------- finishes: one pass over the finished world, under the game's own effects ---------- */
function rain(n) {
  const t = clock();
  ctx.lineCap = 'round';
  for (let layer = 0; layer < 2; layer++) {
    ctx.strokeStyle = layer ? 'rgba(200,225,255,0.34)' : 'rgba(170,200,255,0.2)'; ctx.lineWidth = layer ? 1.4 : 0.9; ctx.beginPath();
    const len = layer ? 30 : 17, fall = layer ? 900 : 620;
    for (let i = layer; i < n; i += 2) {
      const x = rnd(i) * (W + 80) - 40, y = ((rnd(i + 200) * (H + 60) + t * fall * (0.8 + 0.4 * rnd(i + 400))) % (H + 60)) - 30;
      ctx.moveTo(x, y); ctx.lineTo(x - len * 0.22, y + len);
    }
    ctx.stroke();
  }
}

const FINISHES = {
  // printing: dots across the page, the colour plates a hair out of line, an inked edge
  comic() {
    for (const [name, col, al, ox] of [['cyanDots', 'rgba(0,170,230,0.9)', 0.06, 0], ['magDots', 'rgba(235,40,120,0.9)', 0.05, 3]]) {
      const t = dotTile(name, col, 1.5);
      if (t) { ctx.save(); ctx.translate(ox, ox * 0.6); ctx.fillStyle = t; ctx.globalAlpha = al; ctx.fillRect(-4, -4, W + 8, H + 8); ctx.restore(); }
    }
    vignette(0.5, 'rgba(13,11,20,0.36)');
    panel('#fdf6e3', '#0d0b14', '#ffe14d', '#0d0b14');
  },
  // a clean, bright strip: barely any texture, a cheerful caption
  funnies() {
    wash(dotTile('funDots', 'rgba(34,48,74,0.9)', 1.2), 0.05);
    panel('#ffffff', '#22304a', '#ffffff', '#22304a');
  },
  // an old poster: rough paper, heavy edge
  pulp() {
    wash(grainTile(), 0.16);
    vignette(0.46, 'rgba(27,26,58,0.42)');
    panel('#ffeecb', '#1b1a3a', '#1b1a3a', '#ffeecb');
  },
  // ink and nothing else: grain, a hard dark edge, a white-on-red caption
  inknoir() {
    wash(grainTile(), 0.2);
    vignette(0.36, 'rgba(0,0,0,0.78)');
    panel('#f4f1ea', '#07070a', '#e3182d', '#f4f1ea');
  },
  noir() {
    bloom(0.9, 1);
    rain(90);
    wash(grainTile(), 0.11);
    vignette(0.34, 'rgba(2,2,10,0.82)');
  },
  pop() {
    bloom(0.75, 1);
    // slow sparkles in the air
    const t = clock();
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const x = rnd(i + 90) * W, y = ((rnd(i + 190) * H - t * (8 + 14 * rnd(i + 290))) % H + H) % H, tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7), r = (2 + 4 * rnd(i + 390)) * tw;
      ctx.strokeStyle = i % 2 ? 'rgba(255,150,220,0.8)' : 'rgba(150,255,245,0.8)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    vignette(0.4, 'rgba(22,4,58,0.7)');
  },
  space() {
    bloom(0.4, 3);
    // a long glint across the lens, and a cool edge
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(120,200,255,0)'); g.addColorStop(0.5, 'rgba(160,220,255,0.2)'); g.addColorStop(1, 'rgba(120,200,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, HOR - 2, W, 4);
    ctx.globalCompositeOperation = 'source-over';
    vignette(0.5, 'rgba(6,12,40,0.5)');
  }
};

function setPiece(table, key) {
  const f = on && key && table[key];
  if (!f) return;
  on = false; ctx.save();
  try { f(); } finally { ctx.restore(); on = true; }
}
export function styleBackdrop() { setPiece(BACKDROPS, cur.backdrop); }   // right after the frame is cleared
export function styleSky() { setPiece(SKIES, cur.sky); }                 // right after a stage paints its sky
export function styleGround() { setPiece(GROUNDS, cur.ground); }         // after ground and scenery, before people

export function styleFinish() {
  if (!active) return;
  active = false;
  const f = FINISHES[cur.finish];
  if (!f) return;
  const was = on; on = false; ctx.save();
  try { f(); } finally { ctx.restore(); on = was; }
}

// What fills the shadow under a person: printed dots in the comics.
export function shadowPaint() { return on && cur.shadow === 'dots' ? dotTile('shadow', 'rgba(13,11,20,0.78)', 1.9) : null; }
