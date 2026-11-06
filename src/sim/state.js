import { LV, SPAWN_FAR } from '../config/levels.js';
import { BASE } from '../config/tuning.js';
import { rnd } from '../config/util.js';
import { keys, lastBoth, pendingDash, setLastBoth, setPendingDash, touches } from '../input/input.js';
import { store } from '../save/store.js';
import { genChunk, makeMe } from './people.js';
import { CAR_LANES, spawnCar } from './traffic.js';



/* ---------- state ---------- */
export let S = null, state = 'ready', showHB = false, camBob = store.get('excuseme_bob', '1') !== '0', endShown = false;
export let calm = store.get('excuseme_calm', '0') === '1', cues = store.get('excuseme_cues', '0') === '1';   // reduced motion, and shape cues as well as colour
export function setCalm(v) { calm = v; }
export function setCues(v) { cues = v; }

// Endless modes (classic, daily, weekly) have no finish line; only a race ends at the stage goal.
export const goalOf = () => (S && S.endless ? Infinity : LV.goal);

export const bestOf = id => parseInt(store.get('excuseme_best_' + id, '0'), 10) || 0;


export function reset() {
  S = { px: 0, pz: 0, vx: 0, speed: BASE, energy: 100, exhausted: false, boostV: 0, step: 0, camX: 0,
        time: 0, people: [], cars: [], carT: [0, 0.6, 1.2], xings: [], waveT: 4, nextChunk: 14, overT: 0, live: false, clock: 0,
        fastT: 2, rivalT: 7, dodged: 0, close: 0, passed: 0, heat: 0,
        score: 0, chain: 0, bestChain: 0, lastPassT: -9, lastPass: null,
        snake: 0, sweepDir: 0, sweepCount: 0, boostPasses: 0, oncRun: 0, pops: [],
        burstT: 0, dashT: 0, dashCool: 0, dashDir: 0, flash: 0, lastDashT: -9,
        meProxy: { x: 0, z: 0, vx: 0, vz: 0, prop: null },
        slow: 0, slowT: 0, breakFlash: 0, multPrev: 1, stepN: 0,
        ghostRec: [], ghostNext: 0, ghost: null, ghostPts: null, frames: [], frameNext: 0, replay: null, closest: null, hitStop: 0, perfectT: 0, unlocked: [], farMark: 0, lastSlip: -99, draftC: 0, draftT: 0, draftFull: 1, draftNear: 0, draftX: 0, draftZ: 0, bumpT: 0, ghostT: 0, bumpCool: 0, blockT: 0, bumps: 0, race: null, mode: 'classic', kind: 'classic', endless: false, seed: null, evN: 0, chunkSum: {},
        timeLeft: LV.limit, timeout: false, lastSec: 99, shoutCD: 0, slipT: 0, eventT: 16, rush: false, rushT: rnd(28, 40), rushSpawn: 0, banner: null };
  touches.clear(); keys.l = keys.r = false; setPendingDash(null); setLastBoth(-9999);
  S.me = makeMe();
  if (LV.id === 'nyc') {
    for (let z = 90; z < LV.goal - 30; z += 90) S.xings.push({ z, sig: false, spawned: false, walk: false });
    for (let i = 0; i < 9; i++) { const L = CAR_LANES[i % 3]; spawnCar(L, rnd(-5, 85)); }
  }
  while (S.nextChunk < S.pz + SPAWN_FAR) { genChunk(S.nextChunk); S.nextChunk += 4; }
}

export function setCamBob(v) { camBob = v; }
export function setEndShown(v) { endShown = v; }
export function setShowHB(v) { showHB = v; }
export function setState(v) { state = v; }
