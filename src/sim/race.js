import { Music } from '../audio/music.js';
import { LV } from '../config/levels.js';
import { BASE, BOOST, CHAIN_WINDOW, LAT_ACC, LAT_MAX, REGEN, R_PLAYER } from '../config/tuning.js';
import { clamp, mulberry32 } from '../config/util.js';
import { REACT } from '../config/colour.js';
import { BOT_NAMES } from '../config/names.js';
import { effects, fitOf, randomLoadout, statsOf } from '../config/stats.js';
import { COST_DASH, DASH_T, DASH_V } from '../input/input.js';
import { buzz, store } from '../save/store.js';
import { banner } from './actions.js';
import { track } from '../save/challenges.js';
import { LOOK } from '../save/progress.js';
import { applyBuild, dress } from './people.js';
import { CLOSE_STAMINA, RAZOR_STAMINA, addPop } from './scoring.js';
import { S } from './state.js';

/* ---------- race mode: A to B against bots; a bump slows you down instead of ending the run ---------- */
export const BUMP_SPEED = 0.3;    // fraction of normal speed while slowed
const BUMP_COOL = 0.7;            // a long contact counts as one bump per this many seconds, not one per frame
const STUCK_T = 1.8, STUCK_GHOST = 0.8;   // safety net: pinned for this long, you may slip through for a moment
const COUNTDOWN = 3;

// Slipstream: walk close behind someone heading your way for a moment and you earn a burst of speed to overtake with.
const DRAFT_LEN = 4, DRAFT_W = 0.6;   // the zone behind them, in metres
const DRAFT_CHARGE = 1.2;             // seconds to earn it at middling distance; closer is quicker
const DRAFT_T = 2.5, DRAFT_BOOST = 1.18;   // how long it lasts and how much faster you go
const DRAFT_MIN_V = 0.8;              // they have to be walking your way, not standing or coming at you
export const draftMul = r => (r.draftT > 0 ? DRAFT_BOOST : 1);
export const draftCharge = r => clamp(r.draftC / DRAFT_CHARGE, 0, 1);

// Finds the closest person you are drafting; returns how close as 0 (edge of the zone) to 1 (right behind them), or -1.
function inDraft(r, x, z, self) {
  let best = -1;
  const check = (ox, oz, ov) => {
    if (ov <= DRAFT_MIN_V || oz - z <= 0.3 || oz - z >= DRAFT_LEN || Math.abs(ox - x) >= DRAFT_W) return;
    const near = 1 - (oz - z - 0.3) / (DRAFT_LEN - 0.3);
    if (near > best) { best = near; r.draftNear = near; r.draftX = ox; r.draftZ = oz; }
  };
  for (const p of S.people) if (!p.dead && !p.prop) check(p.x, p.z, p.vz);
  if (self !== S) check(S.px, S.pz, S.speed);
  for (const b of S.race.bots) if (b !== self && !b.done) check(b.x, b.z, b.speed);
  return best;
}
// r is the player's state or a bot. Returns true at the moment the boost is earned.
function stepDraft(r, x, z, slowed, dt) {
  r.draftT = Math.max(0, r.draftT - dt);
  if (r.draftT > 0) return false;
  const near = slowed ? -1 : inDraft(r, x, z, r);
  if (near >= 0) r.draftC += dt * (0.7 + 0.8 * near);   // closer charges faster
  else r.draftC = Math.max(0, r.draftC - dt * 1.5);
  if (r.draftC < DRAFT_CHARGE) return false;
  r.draftC = 0; r.draftT = DRAFT_T; r.draftFull = DRAFT_T;
  return true;
}

// Race pace: a combo makes you walk faster, and running low on stamina makes you walk slower, so dashes and bursts
// have to be spent wisely, but ordinary use of them costs next to nothing. Used for the player and the bots alike.
const COMBO_BOOST = 0.025;   // extra speed per combo level (x2 is +2.5%, the x8 cap is +17.5%)
// Stamina only slows you once it is genuinely low: nothing above 40, a mild 8% by 10, then steeply to 35% when you are out.
const tiredSlow = energy => {
  const e = clamp(energy, 0, 100);
  if (e >= 40) return 0;
  if (e >= 10) return 0.08 * (40 - e) / 30;
  return 0.08 + 0.27 * (10 - e) / 10;
};
export const comboLevel = chain => Math.min(8, 1 + Math.floor(chain / 3));
export const racePace = (chain, energy) => (1 + COMBO_BOOST * (comboLevel(chain) - 1)) * (1 - tiredSlow(energy));

// Three tiers. Pace is walking speed relative to yours, miss is how often a bot fails to notice someone,
// dash is how readily it dashes around trouble, burst is how often it spends stamina on a burst of speed.
export const DIFFICULTIES = [
  { name: 'Easy', pace: [0.82, 0.86, 0.89], miss: 0.14, dash: 0, burst: 0.15 },
  { name: 'Medium', pace: [0.89, 0.93, 0.97], miss: 0.06, dash: 0.5, burst: 0.3 },
  { name: 'Hard', pace: [1.0, 1.04, 1.08], miss: 0.01, dash: 1, burst: 0.6 }
];
const BOTS = [
  { name: 'Mia', color: '#14b8a6', shirt: '#14b8a6', hair: '#3b2a1e', hairStyle: 'long', skin: '#c68863' },
  { name: 'Jonas', color: '#9b51e0', shirt: '#9b51e0', hair: '#1c1c1c', hairStyle: 'short', skin: '#e8b98f' },
  { name: 'Kenji', color: '#f2994a', shirt: '#f2994a', hair: '#111827', hairStyle: 'short', skin: '#f0c9a0' },
  { name: 'Ava', color: '#d6336c', shirt: '#d6336c', hair: '#7a4b2a', hairStyle: 'long', skin: '#8d5a3b' },
  { name: 'Leo', color: '#2f80ed', shirt: '#2f80ed', hair: '#3b2a1e', hairStyle: 'bald', skin: '#a8714f' }
];

export const ordinal = n => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');

export function raceDifficulty() { const v = parseInt(store.get('excuseme_botlvl', '1'), 10); return clamp(isNaN(v) ? 1 : v, 0, DIFFICULTIES.length - 1); }

function makeBot(i, diff, name) {
  const d = BOTS[i % BOTS.length];
  const p = {
    x: ((i % 2 ? 1 : -1) * (0.7 + 0.6 * Math.floor(i / 2) + 0.6)), z: -0.3 * (i % 2), vx: 0, vz: 0, phase: i * 1.7, t: 0, h: 1.72 + 0.03 * i, lug: 0, lugCol: '#000000', dog: 0,
    phone: false, fast: false, rival: false, tele: false, hit: false, isMe: false, fx: 0, fz: 1, walkA: 0,
    circles: [{ ox: 0, oz: 0, r: R_PLAYER }], pants: '#1f2937', shoe: '#f4f6f8', gear: '#111827', body: d.hairStyle === 'long' ? 'f' : 'm',
    shirt: d.shirt, hair: d.hair, hairStyle: d.hairStyle, skin: d.skin,
    racer: true, name, color: d.color
  };
  // bots get a random build and gear, with the same stat rules as you
  const gear = randomLoadout(Math.random);
  Object.assign(p, gear);
  applyBuild(p);
  dress(p);
  Object.assign(p, {
    st: effects(statsOf({ ...gear, body: p.body })),
    draftC: 0, draftT: 0, speed: 0, energy: 100, chain: 0, lastPassT: -9, ahead: new WeakMap(), burstT: 0, dashT: 0, dashDir: 0, bumpT: 0, ghostT: 0, cool: 0, blockT: 0, bumps: 0, pace: diff.pace[i % diff.pace.length], diff,
    target: p.x, thinkT: 0, seed: i * 2.3, done: false, finishT: null, seen: new WeakMap(), danger: 99, clear: true
  });
  return p;
}

// Called by start() when a race begins.
export function initRace(botCount) {
  const diff = DIFFICULTIES[raceDifficulty()], n = clamp(botCount || 3, 1, BOTS.length);
  S.race = { diff, bots: [], countT: COUNTDOWN, countLast: 99, rng: mulberry32(0x5eed + n), finished: false, place: 0, board: [], elapsed: 0 };
  const pool = BOT_NAMES.slice();   // each race draws its racers' names at random, no repeats within a race
  for (let i = 0; i < n; i++) S.race.bots.push(makeBot(i, diff, pool.splice((Math.random() * pool.length) | 0, 1)[0]));
  S.race.me = effects(statsOf(LOOK));   // your build and gear, race mode only
  S.speed = 0;          // everyone starts from a standstill, so acceleration counts
  S.timeLeft = 99999;   // no clock in a race
}

export function raceCountdown(dt) {
  const R = S.race;
  R.countT -= dt;
  const sec = Math.ceil(R.countT);
  if (sec !== R.countLast) {
    R.countLast = sec;
    if (sec > 0) { addPop(String(sec), '#ffffff', 56); Music.sfx('tick'); }
    else {
      addPop('GO!', '#27c27a', 60); Music.sfx('combo'); buzz(20);
      const fit = fitOf(LOOK).boost;
      if (fit) addPop('FIT CHECK +' + fit, '#ff6b9d', 30);
    }
  }
}

// Furthest forward and furthest back racer, so the crowd stays around everyone, not just the player.
export function leadZ() { let z = S.pz; if (S.race) for (const b of S.race.bots) z = Math.max(z, b.z); return z; }
export function rearZ() { let z = S.pz; if (S.race) for (const b of S.race.bots) z = Math.min(z, b.z); return z; }

/* ---------- people are solid: you cannot walk through them ---------- */
// Pushes a runner out of anyone they overlap and cancels the part of their movement that went into that person.
// Returns the first person touched, or null.
function resolve(t) {
  const lim = LV.half - 0.5;
  let hit = null;
  for (let iter = 0; iter < 3; iter++) {
    let moved = false;
    for (const p of S.people) {
      if (p.dead || p.prop === 'spill' || Math.abs(p.z - t.z) > 3) continue;
      for (const c of p.circles) {
        const dx = t.x - (p.x + c.ox), dz = t.z - (p.z + (c.oz || 0)), rr = R_PLAYER + c.r, d2 = dx * dx + dz * dz;
        if (d2 >= rr * rr) continue;
        const d = Math.sqrt(d2);
        let nx, nz;
        if (d < 1e-3) { nx = p.x >= t.x ? -1 : 1; nz = 0; } else { nx = dx / d; nz = dz / d; }
        const push = rr - d;
        t.x += nx * push; t.z += nz * push;
        const vn = t.vx * nx + t.speed * nz;
        if (vn < 0) { t.vx -= vn * nx; t.speed -= vn * nz; }
        if (!hit) hit = p;
        moved = true;
      }
    }
    t.x = clamp(t.x, -lim, lim);
    if (!moved) break;
  }
  return hit;
}

function shove(p, fromX) {
  p.hit = true; p.hitT = 0.7;
  if (!p.prop) {
    p.vx += (Math.sign(p.x - fromX) || 1) * 1.6;   // they stumble out of the way, so you are not stuck behind them for long
    const lines = REACT[LV.id] || REACT.airport;
    if (!p.react || p.react.t > 1.2) p.react = { t: 0, text: lines[(Math.random() * lines.length) | 0], up: false };
  }
}

// The player's collisions for one step.
export function raceCollide(dt) {
  if (S.ghostT > 0) return;
  S.bumpCool = Math.max(0, S.bumpCool - dt);
  const t = { x: S.px, z: S.pz, vx: S.vx, speed: S.speed };
  const hit = resolve(t);
  S.px = t.x; S.pz = t.z; S.vx = t.vx; S.speed = Math.max(0, t.speed);
  S.me.x = S.px; S.me.z = S.pz;
  if (hit) {
    S.blockT += dt;
    shove(hit, S.px);
    const fresh = S.bumpCool <= 0;
    S.bumpCool = BUMP_COOL;   // staying in contact is still the same bump
    if (fresh) {
      S.bumpT = S.race.me.bumpT; S.bumps++; S.draftC = 0; S.draftT = 0;
      S.burstT = 0; S.dashT = 0; S.breakFlash = 0.3; S.hitStop = 0.07;
      S.chain = 0; S.snake = 0; S.oncRun = 0; S.multPrev = 1;
      addPop('BUMP!', '#ff4d4f', 34); Music.sfx('oof'); buzz([40, 30, 80]);
    }
    if (S.blockT > STUCK_T) { S.ghostT = STUCK_GHOST; S.blockT = 0; }   // never let anyone stay pinned
  } else S.blockT = Math.max(0, S.blockT - dt * 2);
}

// Current standings, front to back: [{ name, z, me, color, done, finishT }]
export function standings() {
  const R = S.race, rows = [{ name: 'You', z: S.pz, me: true, color: '#ffcf1f', done: R.finished, finishT: R.finished ? S.time : null }];
  for (const b of R.bots) rows.push({ name: b.name, z: b.z, me: false, color: b.color, done: b.done, finishT: b.finishT });
  rows.sort((a, b) => (b.done - a.done) || (a.done && b.done ? a.finishT - b.finishT : b.z - a.z));
  return rows;
}
export const myPlace = () => standings().findIndex(r => r.me) + 1;

/* ---------- bots: they steer like a person would, not along a line ---------- */
// Looks well ahead, picks the lane that gets them past slower walkers without clipping anyone, drifts gently
// from side to side when the road is clear, and dashes or bursts the way a good player does.
function think(b) {
  const lim = LV.half - 0.5, look = 6 + b.speed * 2.6, rng = S.race.rng;
  const wander = Math.sin(S.clock * 0.7 + b.seed) * lim * 0.45;
  let bestX = b.x, bestC = Infinity, danger = 99;
  for (let tx = -lim; tx <= lim + 1e-6; tx += 0.4) {
    let c = Math.abs(tx - b.x) * 0.18 + (Math.abs(tx - b.target) < 0.01 ? -0.25 : 0);
    const reachBase = Math.abs(tx - b.x);
    for (const p of S.people) {
      if (p.dead || p.prop === 'spill') continue;
      const dz = p.z - b.z;
      if (dz < -0.4 || dz > look) continue;
      let ignore = b.seen.get(p);
      if (ignore === undefined) { ignore = rng() < b.diff.miss; b.seen.set(p, ignore); }
      if (ignore) continue;
      const closing = Math.max(0.6, b.speed - p.vz), t = Math.max(0, dz) / closing, px = p.x + p.vx * t;
      const reach = Math.min(reachBase, LAT_MAX * 0.8 * t), bx = b.x + Math.sign(tx - b.x) * reach;   // where this bot can be by the time it gets there
      const slow = clamp((b.speed - p.vz) / Math.max(1, b.speed), 0, 1.6);
      for (const circ of p.circles) {
        const gap = Math.abs(bx - (px + circ.ox)) - (R_PLAYER + circ.r);
        if (gap < 0.5) c += (gap < 0 ? 60 : (0.5 - gap) * 14) / (1 + Math.max(0, dz) * 0.35);
        // staying right behind someone slower costs speed: prefer to plan the overtake early
        if (Math.abs(tx - (p.x + circ.ox)) < 0.75 && dz < 10) c += (10 - dz) * 0.22 * slow;
        if (Math.abs(tx - b.x) < 0.01 && gap < 0.3 && dz < danger) danger = dz;
      }
    }
    c += Math.abs(tx - wander) * 0.07;
    if (c < bestC) { bestC = c; bestX = tx; }
  }
  b.target = bestX; b.danger = danger; b.clear = danger > 9 && bestC < 3;
}

function stepBot(b, dt) {
  const R = S.race, lim = LV.half - 0.5;
  b.thinkT -= dt;
  if (b.thinkT <= 0) { think(b); b.thinkT = 0.1 + R.rng() * 0.18; }   // people do not react instantly
  b.bumpT = Math.max(0, b.bumpT - dt); b.ghostT = Math.max(0, b.ghostT - dt); b.cool = Math.max(0, b.cool - dt);
  b.burstT -= dt; b.dashT -= dt;
  b.energy = Math.min(100, b.energy + REGEN * b.st.regen * dt);
  if (b.chain > 0 && S.time - b.lastPassT > CHAIN_WINDOW) b.chain = 0;
  // a good player dashes round a person who is about to be hit, and bursts when the way is clear
  const need = b.target - b.x;
  if (b.dashT <= 0 && b.bumpT <= 0 && b.energy >= COST_DASH + 10 && b.danger < 2.6 && Math.abs(need) > 0.5 && R.rng() < b.diff.dash * dt * 6) {
    b.energy -= COST_DASH; b.dashT = DASH_T; b.dashDir = Math.sign(need);
  }
  if (b.clear && b.burstT <= 0 && b.bumpT <= 0 && b.energy >= 70 && R.rng() < dt * b.diff.burst) { b.energy -= 30; b.burstT = 1.2; }
  const bursting = b.burstT > 0 && b.bumpT <= 0;
  if (b.dashT > 0) b.vx = b.dashDir * DASH_V;
  else {
    const want = clamp(need * 3, -LAT_MAX, LAT_MAX), acc = (Math.abs(b.vx) > LAT_MAX ? LAT_ACC * 2.2 : LAT_ACC) * b.st.lat;
    b.vx += clamp(want - b.vx, -acc * dt, acc * dt);
  }
  const weave = 1 - 0.14 * Math.min(1.4, Math.abs(b.vx) / LAT_MAX);
  stepDraft(b, b.x, b.z, b.bumpT > 0, dt);
  const bTarget = (bursting ? BOOST : BASE) * b.pace * b.st.speed * weave * racePace(b.chain, b.energy) * draftMul(b) * (b.bumpT > 0 ? BUMP_SPEED : 1);
  b.speed += (bTarget - b.speed) * Math.min(1, dt * (bTarget > b.speed ? b.st.accel : 5));
  b.x = clamp(b.x + b.vx * dt, -lim, lim); b.z += b.speed * dt;
  if (Math.abs(b.x) >= lim) b.vx = 0;
  // solid people
  if (b.ghostT <= 0) {
    const t = { x: b.x, z: b.z, vx: b.vx, speed: b.speed };
    const hit = resolve(t);
    b.x = t.x; b.z = t.z; b.vx = t.vx; b.speed = Math.max(0, t.speed);
    if (hit) {
      b.blockT += dt; shove(hit, b.x); b.seen.set(hit, false);   // they notice whoever they just hit
      if (b.cool <= 0) { b.bumpT = b.st.bumpT; b.draftC = 0; b.draftT = 0; b.bumps++; b.burstT = 0; b.dashT = 0; b.chain = 0; }
      b.cool = BUMP_COOL;
      if (b.blockT > STUCK_T) { b.ghostT = STUCK_GHOST; b.blockT = 0; }
    } else b.blockT = Math.max(0, b.blockT - dt * 2);
  }
  b.vz = b.speed;
  // passing people builds the bot's combo, like yours
  for (const p of S.people) {
    if (p.dead || p.prop || Math.abs(p.z - b.z) > 3) continue;
    const was = b.ahead.get(p), now = p.z > b.z;
    if (was && !now) {
      b.chain++; b.lastPassT = S.time;
      const gap = Math.abs(p.x - b.x) - R_PLAYER - 0.25;   // bots earn near-miss stamina too
      if (gap < 0.15) b.energy = Math.min(100, b.energy + RAZOR_STAMINA); else if (gap < 0.4) b.energy = Math.min(100, b.energy + CLOSE_STAMINA);
    }
    b.ahead.set(p, now);
  }
  // animation, same rules as the player's
  const sp = Math.max(0.01, Math.hypot(b.vx, b.vz)), kk = Math.min(1, dt * 8);
  b.fx += (b.vx / sp - b.fx) * kk; b.fz += (b.vz / sp - b.fz) * kk;
  const nn = Math.hypot(b.fx, b.fz) || 1; b.fx /= nn; b.fz /= nn;
  b.phase += dt * (2.2 + sp * 2.0);
  b.walkA += (1 - b.walkA) * Math.min(1, dt * 8);
  if (!b.done && b.z >= LV.goal) { b.done = true; b.finishT = S.time; b.z = LV.goal; }
}

export function updRace(dt) {
  const R = S.race; if (!R) return;
  R.elapsed = S.time;
  if (stepDraft(S, S.px, S.pz, S.bumpT > 0, dt)) {
    addPop('SLIPSTREAM!', '#7fd0ff', 30); Music.sfx('dash'); buzz(15);
    track('slips');
    if (S.time - S.lastSlip < 20) { track('doubleSlip'); S.lastSlip = -99; } else S.lastSlip = S.time;
  }
  for (const b of R.bots) {
    if (b.done) { b.speed *= Math.max(0, 1 - dt * 4); b.vx *= Math.max(0, 1 - dt * 6); b.vz = b.speed; b.phase += dt * b.speed * 2; b.walkA += ((b.speed > 0.15 ? 1 : 0) - b.walkA) * Math.min(1, dt * 8); b.z += b.speed * dt; continue; }
    stepBot(b, dt);
  }
  for (const p of S.people) if (p.hitT !== undefined) { p.hitT -= dt; if (p.hitT <= 0) { p.hit = false; delete p.hitT; } }
}

// The player crossed the line.
export function finishRace() {
  const R = S.race;
  R.finished = true; R.board = standings(); R.place = R.board.findIndex(r => r.me) + 1;
  const key = 'excuseme_race_best_' + LV.id, prev = parseFloat(store.get(key, '0')) || 0;
  R.newBest = R.place === 1 && (!prev || S.time < prev);
  if (R.newBest) store.set(key, S.time.toFixed(2));
  if (R.place === 1) banner('YOU WIN', '#27c27a');
  track('races');
  if (R.place === 1) {
    track('wins');
    if (R.diff.name !== 'Easy') { track('winsMH'); if (S.bumps === 0) track('cleanWins'); }
    if (R.diff.name === 'Hard') track('winsHard');
  }
}
export const raceBest = id => parseFloat(store.get('excuseme_race_best_' + id, '0')) || 0;
export const fmtTime = t => Math.floor(t / 60) + ':' + (t % 60 < 10 ? '0' : '') + (t % 60).toFixed(1);
