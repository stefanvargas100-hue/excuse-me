import { LV } from '../config/levels.js';
import { $ } from '../dom.js';
import { store } from '../save/store.js';
import { makeMe } from './people.js';
import { addPop } from './scoring.js';
import { S } from './state.js';

/* ---------- ghost of your best classic run, and a replay of how a run ended ---------- */
const GHOST_STEP = 0.4, GHOST_MAX = 1500;   // one sample every 0.4 s, up to 10 minutes
const ghostKey = () => 'excuseme_ghost_' + LV.id;

export function ghostStart() {
  S.ghostRec = []; S.ghostNext = 0; S.ghost = null; S.ghostPts = null; S.frames = []; S.frameNext = 0; S.replay = null; S.closest = null;
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

// The last few seconds of a run, kept so you can watch how it ended.
const FRAME_STEP = 1 / 15, KEEP = 90;
export function recordFrame() {
  if (S.race || S.time < S.frameNext) return;
  S.frameNext = S.time + FRAME_STEP;
  const ppl = [];
  for (const p of S.people) if (p.z > S.pz - 4 && p.z < S.pz + 45) ppl.push([p, p.x, p.z, p.fx, p.fz, p.phase, p.vx, p.vz]);
  S.frames.push({ px: S.px, pz: S.pz, camX: S.camX, vx: S.vx, speed: S.speed, fx: S.me.fx, fz: S.me.fz, phase: S.me.phase, ppl });
  if (S.frames.length > KEEP) S.frames.shift();
}

export const canReplay = () => !S.race && S.frames && S.frames.length > 15;

export function startReplay() {
  if (!canReplay()) return;
  $('end').hidden = true;
  S.replay = { t: 0 };
  addPop('REPLAY', '#ffffff', 26);
}

export function endReplay() {
  if (!S.replay) return;
  const last = S.frames[S.frames.length - 1];
  applyFrame(last);
  S.replay = null;
  $('end').hidden = false;
}

function applyFrame(f) {
  S.px = f.px; S.pz = f.pz; S.camX = f.camX;
  const m = S.me; m.x = f.px; m.z = f.pz; m.vx = f.vx; m.vz = f.speed; m.fx = f.fx; m.fz = f.fz; m.phase = f.phase; m.walkA = 1;
  for (const r of f.ppl) { const p = r[0]; p.x = r[1]; p.z = r[2]; p.fx = r[3]; p.fz = r[4]; p.phase = r[5]; p.vx = r[6]; p.vz = r[7]; }
}

// Runs at 60% speed, so a close call can be seen. Tapping skips it.
export function stepReplay(dt) {
  const R = S.replay; R.t += dt * 0.6;
  const i = Math.floor(R.t / FRAME_STEP);
  if (i >= S.frames.length) { endReplay(); return; }
  applyFrame(S.frames[i]);
}

// A line to share a run, using the phone's share sheet where it exists.
export async function shareRun(text) {
  const url = 'https://stefanvargas100-hue.github.io/excuse-me/';
  try {
    if (navigator.share) await navigator.share({ text, url });
    else if (navigator.clipboard) { await navigator.clipboard.writeText(text + ' ' + url); addPop('COPIED', '#ffffff', 22); }
  } catch (e) {}
}
