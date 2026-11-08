/* The race results podium: the top three on their steps, the winner cheering, second waving, third clapping.
   Drawn into its own small canvas on the end screen with the game's figure code, from copies of the racers, so the run is untouched. */
import { $, ctx, setCtx } from '../dom.js';
import { CX, DPR, F, H, HOR, VX, VY, VZ, W, setCX, setF, setH, setHOR, setVX, setVY, setVZ, setW } from './camera.js';
import { drawPerson } from './figures.js';
import { FONT } from './draw.js';
import { setShowHB, showHB } from '../sim/state.js';

let podium = null;   // [{ p, place }] or null

// rows: the race standings, front to back; people: the racer objects to copy looks from
export function setPodium(rows, me, bots) {
  podium = rows.slice(0, 3).map((r, i) => {
    const src = r.me ? me : bots.find(b => b.name === r.name);
    if (!src) return null;
    const p = Object.assign({}, src, { x: (i === 0 ? 0 : i === 1 ? -1 : 1) * 1.0, z: 0, vx: 0, vz: 0, fx: 0, fz: -1, walkA: 0, isMe: false, racer: true, podium: true, done: false,
      react: null, phone: false, aim: false, dance: false, lug: 0, dog: 0, boxes: false, hit: false, tele: false, fadeT: undefined, ghostT: 0, isGhost: false, lean: 0,
      pose: i === 0 ? 'win' : i === 1 ? 'wave' : 'clap', name: r.me ? 'You' : r.name, color: r.me ? '#ffcf1f' : r.color });
    return { p, place: i + 1, me: !!r.me };
  }).filter(Boolean);
  const cv = $('podium'); if (cv) cv.hidden = !podium.length;
}
export const podiumOf = () => podium;
export function clearPodium() { podium = null; const cv = $('podium'); if (cv) cv.hidden = true; }

export function drawPodium(now) {
  const cv = $('podium');
  if (!podium || !cv || !cv.getContext || cv.hidden) return;
  const cw = cv.clientWidth || 300, ch = cv.clientHeight || 150;
  if (cv.width !== Math.round(cw * DPR) || cv.height !== Math.round(ch * DPR)) { cv.width = Math.round(cw * DPR); cv.height = Math.round(ch * DPR); }
  const pctx = cv.getContext('2d'), saved = [ctx, W, H, F, HOR, CX, VX, VZ, VY, showHB];
  setCtx(pctx); pctx.setTransform(DPR, 0, 0, DPR, 0, 0); pctx.clearRect(0, 0, cw, ch); setShowHB(false);
  const f = ch * 1.15, steps = { 1: 0.42, 2: 0.28, 3: 0.16 };   // step heights in metres
  // steps first, so the people stand on them
  setW(cw); setH(ch); setF(f); setVX(0); setVZ(-4.3); setVY(1.05); setCX(cw / 2); setHOR(ch * 0.94 - 1.05 * f / 4.3);
  const toS = (x, y) => [cw / 2 + x * f / 4.3, HOR + (1.05 - y) * f / 4.3];
  const order = [2, 1, 3], cols = { 1: '#ffcf1f', 2: '#cfd6e0', 3: '#e0a36a' };
  for (const place of order) {
    const e = podium.find(q => q.place === place); if (!e) continue;
    const x = e.p.x, a = toS(x - 0.5, steps[place]), b = toS(x + 0.5, 0);
    pctx.fillStyle = cols[place]; pctx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
    pctx.strokeStyle = '#3a2a4d'; pctx.lineWidth = 2; pctx.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
    pctx.fillStyle = '#3a2a4d'; pctx.font = '700 ' + Math.round(ch * 0.11) + 'px ' + FONT; pctx.textAlign = 'center'; pctx.textBaseline = 'middle';
    pctx.fillText(String(place), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 1);
  }
  const t = now / 1000;
  for (const place of order) {
    const e = podium.find(q => q.place === place); if (!e) continue;
    const p = e.p;
    // stand on the step: lift the camera's view of this person by the step height
    setVY(1.05 - steps[place]); setHOR(ch * 0.94 - 1.05 * f / 4.3);   // feet on top of the step
    p.phase = t * (place === 1 ? 7 : 4); p.ph = 1;
    drawPerson(p);
    if (e.me) { pctx.fillStyle = '#3a2a4d'; pctx.font = '700 ' + Math.round(ch * 0.09) + 'px ' + FONT; pctx.textAlign = 'center'; pctx.textBaseline = 'bottom'; pctx.fillText('YOU', toS(p.x, 0)[0], Math.max(pctx.measureText ? 12 : 12, toS(p.x, steps[place] + 2.25)[1])); }
  }
  setCtx(saved[0]); setW(saved[1]); setH(saved[2]); setF(saved[3]); setHOR(saved[4]); setCX(saved[5]); setVX(saved[6]); setVZ(saved[7]); setVY(saved[8]); setShowHB(saved[9]);
}
