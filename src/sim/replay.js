import { LV } from '../config/levels.js';
import { store } from '../save/store.js';
import { makeMe } from './people.js';
import { addPop } from './scoring.js';
import { S } from './state.js';

/* ---------- ghost of your best run (classic and races against bots), and sharing a run ----------
   The ghost only shows up when you are close to your record: within GHOST_CLOSE_M of where that run ended. */
const GHOST_STEP = 0.4, GHOST_MAX = 1500;   // one sample every 0.4 s, up to 10 minutes
export const GHOST_CLOSE_M = 60;
const ghostKey = () => (S.kind === 'race' ? 'excuseme_ghost_race_' : 'excuseme_ghost_') + LV.id;
const wantsGhost = () => (S.kind === 'classic' || (S.kind === 'race' && !S.duel)) && !S.tut;
export const visibleGhost = () => (S.ghost && !S.ghost.hidden ? S.ghost : null);

export function ghostStart() {
  S.ghostRec = []; S.ghostNext = 0; S.ghost = null; S.ghostPts = null; S.closest = null;
  if (S.kind !== 'classic' && !(S.kind === 'race' && !S.duel)) return;
  try {
    const pts = JSON.parse(store.get(ghostKey(), 'null'));
    if (!Array.isArray(pts) || pts.length < 4) return;
    S.ghostPts = pts;
    S.ghost = Object.assign(makeMe(), { isMe: false, isGhost: true, racer: true, name: 'Your best', color: '#ffd166', x: pts[0], z: pts[1], walkA: 1, hidden: true });
    S.ghostEnd = pts[pts.length - 1]; S.ghostSeen = false;
  } catch (e) {}
}

export function ghostStep(dt) {
  if (!wantsGhost()) return;
  if (S.time >= S.ghostNext && S.ghostRec.length < GHOST_MAX * 2) { S.ghostRec.push(+S.px.toFixed(2), +S.pz.toFixed(1)); S.ghostNext += GHOST_STEP; }
  const g = S.ghost; if (!g) return;
  const f = S.time / GHOST_STEP, i = Math.floor(f) * 2, P = S.ghostPts;
  const near = S.pz >= S.ghostEnd - GHOST_CLOSE_M;
  g.hidden = !near;
  if (near && !S.ghostSeen) { S.ghostSeen = true; addPop('CLOSE TO YOUR BEST', '#ffd166', 24); }
  if (i + 3 >= P.length) {
    if (S.kind === 'race') { g.vx = g.vz = 0; return; }   // a race ghost waits at the line
    S.ghost = null; addPop('PAST YOUR BEST RUN', '#ffd166', 24); return;
  }
  const t = f - Math.floor(f), nx = P[i] + (P[i + 2] - P[i]) * t, nz = P[i + 1] + (P[i + 3] - P[i + 1]) * t;
  g.vx = (P[i + 2] - P[i]) / GHOST_STEP; g.vz = (P[i + 3] - P[i + 1]) / GHOST_STEP; g.x = nx; g.z = nz;
  const sp = Math.hypot(g.vx, g.vz) || 1; g.fx = g.vx / sp; g.fz = g.vz / sp; g.phase += dt * (2.2 + sp * 2);
}

export function ghostSave() {
  if ((S.kind === 'classic' || (S.kind === 'race' && !S.duel)) && S.ghostRec.length >= 4) store.set(ghostKey(), JSON.stringify(S.ghostRec));
}

// A line to share a run, using the phone's share sheet where it exists.
export async function shareRun(text) {
  const url = 'https://stefanvargas100-hue.github.io/excuse-me/';
  try {
    if (navigator.share) await navigator.share({ text, url });
    else if (navigator.clipboard) { await navigator.clipboard.writeText(text + ' ' + url); addPop('COPIED', '#ffffff', 22); }
  } catch (e) {}
}
