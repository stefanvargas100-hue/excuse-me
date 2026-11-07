import { LV } from '../config/levels.js';
import { store } from '../save/store.js';
import { fetchTopGhosts } from '../online/online.js';
import { friendGhosts, cleanGhost, OWN_STEP } from './ghostshare.js';
import { makeMe } from './people.js';
import { addPop } from './scoring.js';
import { S } from './state.js';

/* ---------- ghosts: your best run, friends' best runs, the top 3 of a classic stage; and sharing a run ----------
   Each ghost only shows up when you are close to its record: within GHOST_CLOSE_M of where that run ended.
   Classic: your best, the ghosts of friends you raced in a room, and (fetched in the background) the top 3 of the stage.
   Races against bots: your best race and friends' best races. Daily and weekly runs have none. */
const GHOST_MAX = 1500;   // up to 10 minutes of your own samples
export const GHOST_CLOSE_M = 60;
const FRIEND_COLORS = ['#8be9fd', '#ff9f43', '#c792ff', '#7ee081'], LEADER_COLORS = ['#ff6b9d', '#ffb3d1', '#ff8fb8'];
const ghostKey = () => (S.kind === 'race' ? 'excuseme_ghost_race_' : 'excuseme_ghost_') + LV.id;
const raceKind = () => S.kind === 'race' && !S.duel;
const wantsGhost = () => (S.kind === 'classic' || raceKind()) && !S.tut;
export const visibleGhost = () => (S.ghost && !S.ghost.hidden ? S.ghost : null);
export const visibleGhosts = () => [S.ghost, ...(S.otherGhosts || [])].filter(g => g && !g.hidden);

let topFetcher = fetchTopGhosts;
export const setTopGhostFetcher = f => { topFetcher = f; };

function makeGhost(pts, step, name, color) {
  return Object.assign(makeMe(), { isMe: false, isGhost: true, racer: true, name, color, x: pts[0], z: pts[1], walkA: 1, hidden: true, pts, step, end: pts[pts.length - 1], seen: false });
}

export function ghostStart() {
  S.ghostRec = []; S.ghostNext = 0; S.ghost = null; S.ghostPts = null; S.closest = null; S.otherGhosts = [];
  if (S.kind !== 'classic' && !raceKind()) return;
  try {
    const pts = JSON.parse(store.get(ghostKey(), 'null'));
    if (Array.isArray(pts) && pts.length >= 4) { S.ghostPts = pts; S.ghost = makeGhost(pts, OWN_STEP, 'Your best', '#ffd166'); }
  } catch (e) {}
  friendGhosts(store, raceKind() ? 'race' : 'classic', LV.id).forEach((f, i) => S.otherGhosts.push(makeGhost(f.pts, f.step, f.name, FRIEND_COLORS[i % FRIEND_COLORS.length])));
  if (S.kind === 'classic') {
    const run = S, level = LV.id;   // an answer that arrives after this run ended is dropped
    Promise.resolve().then(() => topFetcher(level)).then(rows => {
      if (S !== run || LV.id !== level || !Array.isArray(rows)) return;
      let n = 0;
      for (const r of rows) {
        if (!r || r.you || n >= 3) continue;
        const g = cleanGhost(r); if (!g) continue;
        run.otherGhosts.push(makeGhost(g.pts, g.step, String(r.name || 'Leader').slice(0, 24), LEADER_COLORS[n % LEADER_COLORS.length])); n++;
      }
    }).catch(() => {});
  }
}

function stepOne(g, dt, own) {
  g.hidden = S.pz < g.end - GHOST_CLOSE_M;
  if (!g.hidden && !g.seen) { g.seen = true; addPop(own ? 'CLOSE TO YOUR BEST' : 'CLOSE TO ' + g.name.toUpperCase().slice(0, 18) + '\'S BEST', g.color, 22); }
  const f = S.time / g.step, i = Math.floor(f) * 2, P = g.pts;
  if (i + 3 >= P.length) {
    if (S.kind === 'race') { g.vx = g.vz = 0; return true; }   // a race ghost waits at the line
    return false;
  }
  const t = f - Math.floor(f), nx = P[i] + (P[i + 2] - P[i]) * t, nz = P[i + 1] + (P[i + 3] - P[i + 1]) * t;
  g.vx = (P[i + 2] - P[i]) / g.step; g.vz = (P[i + 3] - P[i + 1]) / g.step; g.x = nx; g.z = nz;
  const sp = Math.hypot(g.vx, g.vz) || 1; g.fx = g.vx / sp; g.fz = g.vz / sp; g.phase += dt * (2.2 + sp * 2);
  return true;
}

export function ghostStep(dt) {
  if (!wantsGhost()) return;
  if (S.time >= S.ghostNext && S.ghostRec.length < GHOST_MAX * 2) { S.ghostRec.push(+S.px.toFixed(2), +S.pz.toFixed(1)); S.ghostNext += OWN_STEP; }
  if (S.ghost && !stepOne(S.ghost, dt, true)) { S.ghost = null; addPop('PAST YOUR BEST RUN', '#ffd166', 24); }
  if (S.otherGhosts.length) S.otherGhosts = S.otherGhosts.filter(g => stepOne(g, dt, false));
}

export function ghostSave() {
  if ((S.kind === 'classic' || raceKind()) && S.ghostRec.length >= 4) store.set(ghostKey(), JSON.stringify(S.ghostRec));
}

// A line to share a run, using the phone's share sheet where it exists.
export async function shareRun(text) {
  const url = 'https://stefanvargas100-hue.github.io/excuse-me/';
  try {
    if (navigator.share) await navigator.share({ text, url });
    else if (navigator.clipboard) { await navigator.clipboard.writeText(text + ' ' + url); addPop('COPIED', '#ffffff', 22); }
  } catch (e) {}
}
