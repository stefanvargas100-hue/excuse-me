import { LV } from '../config/levels.js';
import { store } from '../save/store.js';
import { makeMe } from './people.js';
import { addPop } from './scoring.js';
import { S } from './state.js';

/* ---------- ghost of your best classic run, and sharing a run ---------- */
const GHOST_STEP = 0.4, GHOST_MAX = 1500;   // one sample every 0.4 s, up to 10 minutes
const ghostKey = () => 'excuseme_ghost_' + LV.id;

export function ghostStart() {
  S.ghostRec = []; S.ghostNext = 0; S.ghost = null; S.ghostPts = null; S.closest = null;
  if (S.kind !== 'classic') return;
  try {
    const pts = JSON.parse(store.get(ghostKey(), 'null'));
    if (!Array.isArray(pts) || pts.length < 4) return;
    S.ghostPts = pts;
    S.ghost = Object.assign(makeMe(), { isMe: false, isGhost: true, racer: true, name: 'Your best', color: '#ffd166', x: pts[0], z: pts[1], walkA: 1 });
  } catch (e) {}
}

export function ghostStep(dt) {
  if (S.kind !== 'classic' || S.tut) return;
  if (S.time >= S.ghostNext && S.ghostRec.length < GHOST_MAX * 2) { S.ghostRec.push(+S.px.toFixed(2), +S.pz.toFixed(1)); S.ghostNext += GHOST_STEP; }
  const g = S.ghost; if (!g) return;
  const f = S.time / GHOST_STEP, i = Math.floor(f) * 2, P = S.ghostPts;
  if (i + 3 >= P.length) { S.ghost = null; addPop('PAST YOUR BEST RUN', '#ffd166', 24); return; }
  const t = f - Math.floor(f), nx = P[i] + (P[i + 2] - P[i]) * t, nz = P[i + 1] + (P[i + 3] - P[i + 1]) * t;
  g.vx = (P[i + 2] - P[i]) / GHOST_STEP; g.vz = (P[i + 3] - P[i + 1]) / GHOST_STEP; g.x = nx; g.z = nz;
  const sp = Math.hypot(g.vx, g.vz) || 1; g.fx = g.vx / sp; g.fz = g.vz / sp; g.phase += dt * (2.2 + sp * 2);
}

export function ghostSave() {
  if (S.kind === 'classic' && S.ghostRec.length >= 4) store.set(ghostKey(), JSON.stringify(S.ghostRec));
}

// A line to share a run, using the phone's share sheet where it exists.
export async function shareRun(text) {
  const url = 'https://stefanvargas100-hue.github.io/excuse-me/';
  try {
    if (navigator.share) await navigator.share({ text, url });
    else if (navigator.clipboard) { await navigator.clipboard.writeText(text + ' ' + url); addPop('COPIED', '#ffffff', 22); }
  } catch (e) {}
}
