/* Time of day and weather for each stage: a screen-space grade drawn over the finished scene.
   Render only: nothing here reads or writes the simulation, and the choice never uses the seeded random stream.
   A variant is picked per run (daily and weekly runs derive it from their seed, so everyone sees the same sky); `?variant=rain` forces one.
   A cup can call setVariant() to choose the look of each round. */
import { LV } from '../config/levels.js';
import { TAU, hashStr } from '../config/util.js';
import { ctx } from '../dom.js';
import { H, HOR, W } from './camera.js';
import { S, calm } from '../sim/state.js';
import { hsh } from './scenery.js';

// [variant, weight]: the first is the stage's usual look and stays the most common.
export const VARIANTS = {
  airport: [['day', 5], ['sunrise', 2], ['night', 2]],
  nyc: [['day', 5], ['golden', 3]],
  shibuya: [['night', 5], ['rain', 3]],
  park: [['day', 5], ['autumn', 3], ['golden', 2]],
  bridge: [['day', 5], ['golden', 3], ['mist', 2]]
};

let cur = 'day', curLevel = '', curRun = null, forced = null;
try { if (typeof location !== 'undefined') { const m = /[?&]variant=([a-z]+)/.exec(location.search); if (m) forced = m[1]; } } catch (e) { /* no location in tests */ }

export const variantOf = () => cur;
export function setVariant(v) { forced = v; if (v) cur = v; else curRun = null; }   // null hands the choice back to the next pick

// Deterministic for a seed; random for a casual run. Not the game's seeded stream, so crowds and layouts never change.
export function pickVariant(levelId, seed, rnd) {
  const list = VARIANTS[levelId] || [['day', 1]];
  let t = 0; for (const e of list) t += e[1];
  let r = (seed ? (hashStr(seed + ':wx') % 100000) / 100000 : rnd()) * t;
  for (const e of list) { r -= e[1]; if (r <= 0) return e[0]; }
  return list[0][0];
}

// Not Math.random: the simulation may draw from it, and drawing a frame must never shift what the simulation sees.
const clockRnd = () => (Date.now() % 9973) / 9973;

export function refreshWeather() {
  if (forced) { cur = forced; return; }
  if (LV.id !== curLevel || S !== curRun) { curLevel = LV.id; curRun = S; cur = pickVariant(LV.id, S.seed, clockRnd); }   // every run has its own state object, so this catches every restart
}

const wash = (a, b, c, alpha) => { ctx.fillStyle = 'rgba(' + a + ',' + b + ',' + c + ',' + alpha + ')'; ctx.fillRect(0, 0, W, H); };

export function weatherGrade() {
  refreshWeather();
  if (cur === 'day' || (cur === 'night' && LV.id === 'shibuya')) return;   // the usual looks
  const u = Math.min(W, H) / 390, t = S.clock || 0;
  ctx.save();
  if (cur === 'mist') { wash(225,235,238,0.22); } else if (cur === 'golden') {   // late sun down the avenue: warm wash, a glow at the far end, deeper corners
    wash(255, 160, 70, 0.07);
    const g = ctx.createRadialGradient(W * 0.5, HOR, 0, W * 0.5, HOR, Math.max(W, H) * 0.7);
    g.addColorStop(0, 'rgba(255,224,150,0.42)'); g.addColorStop(0.4, 'rgba(255,184,100,0.16)'); g.addColorStop(1, 'rgba(255,150,70,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const v = ctx.createLinearGradient(0, H * 0.55, 0, H); v.addColorStop(0, 'rgba(120,60,40,0)'); v.addColorStop(1, 'rgba(120,60,40,0.14)');
    ctx.fillStyle = v; ctx.fillRect(0, H * 0.55, W, H * 0.45);
  } else if (cur === 'sunrise') {   // low sun through the apron windows on the left
    wash(255, 190, 160, 0.07);
    const g = ctx.createRadialGradient(0, HOR, 0, 0, HOR, Math.max(W, H) * 0.65); g.addColorStop(0, 'rgba(255,200,150,0.36)'); g.addColorStop(1, 'rgba(255,200,150,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  } else if (cur === 'night') {   // the terminal stays lit, the glass goes dark
    wash(18, 28, 70, 0.26);
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(10,14,40,0.18)'); g.addColorStop(1, 'rgba(10,14,40,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  } else if (cur === 'rain') {   // wet neon night: cooler wash, smeared reflections, ripples and streaks
    wash(20, 30, 70, 0.16);
    const y1 = HOR + H * 0.03;
    ctx.globalAlpha = 1;
    const sheen = ctx.createLinearGradient(0, y1, 0, H); sheen.addColorStop(0, 'rgba(150,170,255,0.0)'); sheen.addColorStop(0.5, 'rgba(150,170,255,0.09)'); sheen.addColorStop(1, 'rgba(150,170,255,0.04)');
    ctx.fillStyle = sheen; ctx.fillRect(0, y1, W, H - y1);
    const cols = ['255,61,154', '32,227,255', '255,207,31', '124,255,107'];
    for (let i = 0; i < 7; i++) {   // neon smeared on the wet ground
      const x = hsh(i, 41) * W, w = (10 + hsh(i, 42) * 16) * u, len = H * (0.1 + 0.12 * hsh(i, 43)), sh = calm ? 0.8 : 0.7 + 0.3 * Math.sin(t * 1.5 + i * 2);
      const g = ctx.createLinearGradient(0, y1, 0, y1 + len); g.addColorStop(0, 'rgba(' + cols[i % 4] + ',' + (0.16 * sh).toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + cols[i % 4] + ',0)');
      ctx.fillStyle = g; ctx.fillRect(x - w / 2, y1, w, len);
    }
    if (!calm) {
      ctx.strokeStyle = 'rgba(200,215,255,0.28)'; ctx.lineWidth = Math.max(1, u * 0.9); ctx.beginPath();   // ripples, growing and fading
      for (let i = 0; i < 9; i++) {
        const ph = (t * 0.9 + hsh(i, 51) * 3) % 1, fy = y1 + (H - y1) * (0.12 + 0.85 * hsh(i, 52)), sc = 0.4 + (fy - y1) / (H - y1), rx = (4 + 16 * ph) * u * sc;
        const fx = hsh(i, 53) * W; ctx.moveTo(fx + rx, fy); ctx.ellipse(fx, fy, rx, rx * 0.3, 0, 0, TAU);
      }
      ctx.globalAlpha = 0.7; ctx.stroke(); ctx.globalAlpha = 1;
      const n = Math.min(70, Math.round(W * H / 7000));   // rain streaks: one batched stroke
      ctx.strokeStyle = 'rgba(190,205,255,0.32)'; ctx.lineWidth = Math.max(1, u * 0.8); ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const sp = 520 * u * (0.8 + 0.6 * hsh(i, 3)), y = (hsh(i, 2) * H + t * sp) % (H + 40) - 20, x = ((hsh(i, 1) * (W + 60) - t * 40 * u) % (W + 60) + W + 60) % (W + 60), ln = (12 + 14 * hsh(i, 4)) * u;
        ctx.moveTo(x, y); ctx.lineTo(x - ln * 0.18, y + ln);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}
