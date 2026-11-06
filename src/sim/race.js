import { Music } from '../audio/music.js';
import { LV } from '../config/levels.js';
import { BASE, BOOST, LAT_ACC, LAT_MAX, REGEN, R_PLAYER } from '../config/tuning.js';
import { clamp, mulberry32 } from '../config/util.js';
import { REACT } from '../config/colour.js';
import { buzz, store } from '../save/store.js';
import { banner } from './actions.js';
import { dress } from './people.js';
import { addPop } from './scoring.js';
import { S } from './state.js';

/* ---------- race mode: A to B against bots; a bump slows you down instead of ending the run ---------- */
export const BUMP_T = 1.3;        // seconds spent slowed after a bump
export const BUMP_SPEED = 0.3;    // fraction of normal speed while slowed
export const GHOST_T = 1.6;       // seconds you can pass through people after a bump, so one bump is one penalty
const COUNTDOWN = 3;

// Bots differ in pace and in how often they fail to notice someone. Three tiers of difficulty.
export const DIFFICULTIES = [
  { name: 'Easy', pace: [0.9, 0.93, 0.96], miss: 0.12 },
  { name: 'Medium', pace: [0.95, 0.99, 1.03], miss: 0.07 },
  { name: 'Hard', pace: [1.0, 1.04, 1.08], miss: 0.03 }
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

function makeBot(i, diff) {
  const d = BOTS[i % BOTS.length];
  const p = {
    x: ((i % 2 ? 1 : -1) * (0.7 + 0.6 * Math.floor(i / 2) + 0.6)), z: -0.3 * (i % 2), vx: 0, vz: 0, phase: i * 1.7, t: 0, h: 1.72 + 0.03 * i, lug: 0, lugCol: '#000000', dog: 0,
    phone: false, fast: false, rival: false, tele: false, hit: false, isMe: false, fx: 0, fz: 1, walkA: 0,
    circles: [{ ox: 0, oz: 0, r: R_PLAYER }], pants: '#1f2937', shoe: '#f4f6f8', hat: i % 2 ? 'none' : 'cap', face: 'none', pack: 'none', gear: '#111827',
    shirt: d.shirt, hair: d.hair, hairStyle: d.hairStyle, skin: d.skin,
    racer: true, name: d.name, color: d.color
  };
  dress(p);
  Object.assign(p, {
    speed: 0, energy: 100, burstT: 0, bumpT: 0, ghostT: 0, bumps: 0, pace: diff.pace[i % diff.pace.length], miss: diff.miss,
    target: p.x, thinkT: 0, done: false, finishT: null, seen: new WeakMap()
  });
  return p;
}

// Called by start() when a race begins.
export function initRace(botCount) {
  const diff = DIFFICULTIES[raceDifficulty()], n = clamp(botCount || 3, 1, BOTS.length);
  S.race = { diff, bots: [], countT: COUNTDOWN, countLast: 99, rng: mulberry32(0x5eed + n), finished: false, place: 0, board: [], elapsed: 0 };
  for (let i = 0; i < n; i++) S.race.bots.push(makeBot(i, diff));
  S.timeLeft = 99999;   // no clock in a race
}

export function raceCountdown(dt) {
  const R = S.race;
  R.countT -= dt;
  const sec = Math.ceil(R.countT);
  if (sec !== R.countLast) {
    R.countLast = sec;
    if (sec > 0) { addPop(String(sec), '#ffffff', 56); Music.sfx('tick'); }
    else { addPop('GO!', '#27c27a', 60); Music.sfx('combo'); buzz(20); }
  }
}

// Furthest forward and furthest back racer, so the crowd stays around everyone, not just the player.
export function leadZ() { let z = S.pz; if (S.race) for (const b of S.race.bots) z = Math.max(z, b.z); return z; }
export function rearZ() { let z = S.pz; if (S.race) for (const b of S.race.bots) z = Math.min(z, b.z); return z; }

// The player walked into someone: slow down and slip through them, rather than ending the run.
export function raceBump(p) {
  S.bumpT = BUMP_T; S.ghostT = GHOST_T; S.bumps = (S.bumps || 0) + 1;
  S.burstT = 0; S.dashT = 0; S.shake = Math.max(S.shake, 0.5);
  S.chain = 0; S.snake = 0; S.oncRun = 0; S.multPrev = 1;
  shove(p, S.px);
  addPop('BUMP!', '#ff4d4f', 34); Music.sfx('bump'); buzz([40, 30, 80]);
}
function shove(p, fromX) {
  p.hit = true; p.hitT = 0.7;
  if (!p.prop) {
    p.vx += (Math.sign(p.x - fromX) || 1) * 1.6;
    const lines = REACT[LV.id] || REACT.airport;
    if (!p.react || p.react.t > 1.2) p.react = { t: 0, text: lines[(Math.random() * lines.length) | 0], up: false };
  }
}

// Current standings, front to back: [{ name, z, me, color, done, finishT }]
export function standings() {
  const R = S.race, rows = [{ name: 'You', z: S.pz, me: true, color: '#ffcf1f', done: R.finished, finishT: R.finished ? S.time : null }];
  for (const b of R.bots) rows.push({ name: b.name, z: b.z, me: false, color: b.color, done: b.done, finishT: b.finishT });
  rows.sort((a, b) => (b.done - a.done) || (a.done && b.done ? a.finishT - b.finishT : b.z - a.z));
  return rows;
}
export const myPlace = () => standings().findIndex(r => r.me) + 1;

/* ---------- bots ---------- */
function think(b) {
  const lim = LV.half - 0.5, look = 5 + b.speed * 2.2;
  let bestX = b.x, bestC = Infinity, clear = true;
  for (let tx = -lim; tx <= lim + 1e-6; tx += 0.45) {
    let c = Math.abs(tx - b.x) * 0.3 + (Math.abs(tx - b.target) < 0.01 ? -0.25 : 0);
    for (const p of S.people) {
      if (p.dead || p.prop === 'spill') continue;
      const dz = p.z - b.z;
      if (dz < -0.4 || dz > look) continue;
      let ignore = b.seen.get(p);
      if (ignore === undefined) { ignore = S.race.rng() < b.miss; b.seen.set(p, ignore); }
      if (ignore) continue;
      const closing = Math.max(0.6, b.speed - p.vz), t = Math.max(0, dz) / closing, px = p.x + p.vx * t;
      const reach = Math.min(Math.abs(tx - b.x), LAT_MAX * 0.8 * t), bx = b.x + Math.sign(tx - b.x) * reach;   // where this bot can be by the time it gets there
      for (const circ of p.circles) {
        const gap = Math.abs(bx - (px + circ.ox)) - (R_PLAYER + circ.r);
        if (gap < 0.5) c += (gap < 0 ? 60 : (0.5 - gap) * 14) / (1 + Math.max(0, dz) * 0.35);
      }
    }
    if (Math.abs(tx - b.x) < 0.3 && c > 8) clear = false;
    if (c < bestC) { bestC = c; bestX = tx; }
  }
  b.target = bestX; b.clear = clear;
}

function stepBot(b, dt) {
  const R = S.race, lim = LV.half - 0.5;
  b.thinkT -= dt;
  if (b.thinkT <= 0) { think(b); b.thinkT = 0.1; }
  b.bumpT = Math.max(0, b.bumpT - dt); b.ghostT = Math.max(0, b.ghostT - dt); b.burstT -= dt;
  b.energy = Math.min(100, b.energy + REGEN * dt);
  if (b.clear && b.burstT <= 0 && b.bumpT <= 0 && b.energy >= 70 && R.rng() < dt * 0.35) { b.energy -= 30; b.burstT = 1.2; }
  const bursting = b.burstT > 0 && b.bumpT <= 0;
  const want = clamp((b.target - b.x) * 3, -LAT_MAX, LAT_MAX);
  b.vx += clamp(want - b.vx, -LAT_ACC * dt, LAT_ACC * dt);
  const weave = 1 - 0.14 * Math.min(1.4, Math.abs(b.vx) / LAT_MAX);
  b.speed += (((bursting ? BOOST : BASE) * b.pace) * weave * (b.bumpT > 0 ? BUMP_SPEED : 1) - b.speed) * Math.min(1, dt * 5);
  b.x = clamp(b.x + b.vx * dt, -lim, lim); b.z += b.speed * dt;
  b.vz = b.speed;
  // animation, same rules as the player's
  const sp = Math.hypot(b.vx, b.vz);
  const kk = Math.min(1, dt * 8);
  b.fx += (b.vx / sp - b.fx) * kk; b.fz += (b.vz / sp - b.fz) * kk;
  const nn = Math.hypot(b.fx, b.fz) || 1; b.fx /= nn; b.fz /= nn;
  b.phase += dt * (2.2 + sp * 2.0);
  b.walkA += (1 - b.walkA) * Math.min(1, dt * 8);
  // bumps against the crowd
  if (b.ghostT <= 0) {
    for (const p of S.people) {
      if (p.dead || p.prop === 'spill') continue;
      const dz0 = p.z - b.z; if (dz0 > 3 || dz0 < -3) continue;
      let hit = false;
      for (const c of p.circles) { const dx = p.x + c.ox - b.x, dz = p.z + (c.oz || 0) - b.z, rr = R_PLAYER + c.r; if (dx * dx + dz * dz < rr * rr) { hit = true; break; } }
      if (hit) { b.bumpT = BUMP_T; b.ghostT = GHOST_T; b.bumps++; b.burstT = 0; shove(p, b.x); break; }
    }
  }
  if (!b.done && b.z >= LV.goal) { b.done = true; b.finishT = S.time; b.z = LV.goal; }
}

export function updRace(dt) {
  const R = S.race; if (!R) return;
  R.elapsed = S.time;
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
}
export const raceBest = id => parseFloat(store.get('excuseme_race_best_' + id, '0')) || 0;
export const fmtTime = t => Math.floor(t / 60) + ':' + (t % 60 < 10 ? '0' : '') + (t % 60).toFixed(1);
