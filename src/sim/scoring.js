import { comboLevel } from '../config/combo.js';
import { Music } from '../audio/music.js';
import { MULT_COLS, REACT } from '../config/colour.js';
import { LV } from '../config/levels.js';
import { CHAIN_WINDOW, R_PLAYER } from '../config/tuning.js';
import { R, pick, sgn } from '../config/util.js';
import { track, trackMax } from '../save/challenges.js';
import { buzz } from '../save/store.js';
import { S, calm } from './state.js';



/* ---------- scoring ---------- */
export function addPop(text, color, size) {
  S.pops.push({ text, color, size, t: 0 });
  if (S.pops.length > 6) S.pops.shift();
}

// Brave passes pay for your abilities: a near miss refills some stamina.
export const RAZOR_STAMINA = 25, CLOSE_STAMINA = 12;
// In races a near miss also gives a short speed burst (about a slipstream's worth for a razor), so risking it pays. It never stacks:
// a weaker burst cannot cut a stronger one short, a stronger one replaces a weaker one. Players and bots follow the same rule.
export const NEAR_RAZOR = { amt: 0.25, t: 2.0 }, NEAR_CLOSE = { amt: 0.12, t: 1.5 };
// Three close calls within a few seconds earn a short speed boost, in every mode: the risky line pays.
export const STREAK_SPEED = 1.1, STREAK_T = 2.5, STREAK_NEEDED = 3, STREAK_WINDOW = 5;
export const nearMul = r => (r.nearT > 0 ? 1 + r.nearAmt : 1);
export function nearBoost(r, gap) {
  const k = gap < 0.15 ? NEAR_RAZOR : gap < 0.4 ? NEAR_CLOSE : null;
  if (!k) return;
  if (r.nearT > 0 && r.nearAmt > k.amt) return;
  r.nearAmt = k.amt; r.nearT = k.t;
}

const TAG_TALLY = { RAZOR: 'razor', CLOSE: 'close', 'THREAD THE NEEDLE': 'thread', SNAKE: 'snake', 'SWEEP LEFT': 'sweep', 'SWEEP RIGHT': 'sweep', 'MEGA SWEEP': 'mega', 'BULLET TRAIN': 'bullet', JUKE: 'juke', 'SALMON RUN': 'salmon', 'RIVAL BURNED': 'burned' };

export function onPass(p) {
  if (p.prop) return;
  const dx = p.x - S.px;
  if (Math.abs(dx) > 2.6) return;            // only people you actually walked past
  let gap = Infinity;
  for (const c of p.circles) gap = Math.min(gap, Math.abs(p.x + c.ox - S.px) - R_PLAYER - c.r);
  if (!S.closest || gap < S.closest.gap) S.closest = { gap: Math.max(0, gap), m: Math.floor(S.pz) };
  const side = dx > 0 ? 1 : -1, now = S.time;
  if (now - S.lastPassT > CHAIN_WINDOW) { S.chain = 0; S.snake = 0; S.oncRun = 0; }
  const prev = S.chain > 0 ? S.lastPass : null;
  S.chain++; S.passed++; S.bestChain = Math.max(S.bestChain, S.chain);
  const mult = comboLevel(S.chain);
  let pts = 10, sound = null;
  const tags = [];
  if (S.race) nearBoost(S, gap);
  if (gap < 0.4) {
    S.nearHits = now - S.nearHitT <= STREAK_WINDOW ? S.nearHits + 1 : 1; S.nearHitT = now;
    if (S.nearHits >= STREAK_NEEDED) { S.nearHits = 0; S.streakT = STREAK_T; tags.push(['NEAR-MISS STREAK', '#ff6b9d']); }
  }
  if (gap < 0.15) { pts += 50; S.close++; S.energy = Math.min(100, S.energy + RAZOR_STAMINA); track('close'); tags.push(['RAZOR', '#ff4d4f']); S.heat = Math.min(0.9, S.heat + 0.45); sound = 'razor'; }
  else if (gap < 0.4) { pts += 25; S.close++; S.energy = Math.min(100, S.energy + CLOSE_STAMINA); tags.push(['CLOSE', '#ffcf1f']); S.heat = Math.min(0.9, S.heat + 0.3); sound = 'whoosh'; }
  if (prev && now - prev.t < 0.35 && prev.side !== side && Math.abs(dx) < 1.2 && prev.adx < 1.2) { pts += 150; tags.push(['THREAD THE NEEDLE', '#5ee6a8']); }
  S.snake = prev && prev.side !== side ? S.snake + 1 : 1;
  if (S.snake >= 3) { pts += 40 * (S.snake - 1); tags.push([S.snake === 3 ? 'SNAKE' : 'SNAKE ×' + S.snake, '#7cc4ff']); }
  const dir = Math.abs(S.vx) > 0.8 ? sgn(S.vx) : 0;
  if (dir && dir === S.sweepDir) S.sweepCount++; else { S.sweepDir = dir; S.sweepCount = dir ? 1 : 0; }
  if (S.sweepCount === 3) { pts += 150; tags.push([dir < 0 ? 'SWEEP LEFT' : 'SWEEP RIGHT', '#ff9f43']); }
  if (S.sweepCount === 5) { pts += 300; tags.push(['MEGA SWEEP', '#ff9f43']); }
  if (S.boostV > 0.5) { S.boostPasses++; if (S.boostPasses === 3) { pts += 120; tags.push(['BULLET TRAIN', '#c792ff']); } }
  if (now - S.lastDashT < 0.6) { pts += 80; tags.push(['JUKE', '#ffd166']); }
  if (p.fast && !p.rival && p.vz > 3) { pts += 60; tags.push(['OVERTAKE', '#8be9fd']); }
  if (p.vz < -0.3) { S.oncRun++; if (S.oncRun === 5) { pts += 150; tags.push(['SALMON RUN', '#ff7eb6']); } } else S.oncRun = 0;
  if (p.rival) {
    if (p.cutDone) { pts += 250; S.dodged++; tags.push(['RIVAL BURNED', '#ff2d3a']); }
    else { pts += 80; tags.push(['RIVAL PASSED', '#ff2d3a']); }
  }
  if (S.lesson) S.lesson.log.push({ k: 'pass', p, gap, tags: tags.map(t => t[0]) });   // practice lessons watch what the game detected
  const total = pts * mult;
  S.score += total;
  track('passes'); trackMax('chain', S.bestChain);
  for (const t of tags) { addPop(t[0], t[1], 30); const name = TAG_TALLY[t[0]]; if (name) track(name); }
  addPop('+' + total + (mult > 1 ? '  ×' + mult : ''), '#ffffff', 22);
  if (sound) Music.sfx(sound);
  else if (tags.length) Music.sfx('combo');
  S.lastPassT = now; S.lastPass = { t: now, side, adx: Math.abs(dx) };
  // near-miss slow motion on the riskiest passes
  if (gap < 0.15 || tags.some(t => t[0] === 'THREAD THE NEEDLE')) { S.hitStop = 0.05; if (!calm) { S.slowT = 0.55; Music.sfx('slow'); } }
  if (gap < 0.15) buzz(30); else if (gap < 0.4) buzz(12);
  // the person you brushed past reacts
  if (gap < 0.4 && !p.rival) {
    p.react = { t: 0, text: pick(REACT[LV.id]), up: R() < 0.65 };
    if (!p.locked) p.vx += sgn(p.x - S.px) * 0.7;
  }
  if (mult >= 8 && S.multPrev < 8) track('x8');
  if (mult > S.multPrev) { addPop('×' + mult + ' MULTIPLIER', MULT_COLS[Math.min(mult, MULT_COLS.length) - 1], 26); buzz([10, 30, 10]); }
  S.multPrev = mult;
}
